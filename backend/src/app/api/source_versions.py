"""源文件版本 API：接收源文件并运行 Python Workbook Outline 扫描。

该服务只负责文件版本登记和确定性的 Sheet 扫描，不调用 AI，也不把完整
工作簿发送到外部 Provider。生产环境还需要认证、对象存储、任务队列和数据库。
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status

from ..infrastructure.db import add_source_file_version, create_processing_job, get_latest_processing_job, get_processing_job, get_project, get_source_file_version
from ..pipelines.ingestion import run_workbook_scan
from ..pipelines.recognition import run_ai_recognition
from ..settings import AI_ENABLED


ROOT = Path(__file__).resolve().parents[4]
UPLOAD_ROOT = ROOT / "outputs" / "local_uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_SUFFIXES = {".xlsx", ".csv"}

router = APIRouter(prefix="/api/projects", tags=["source-versions"])


def _safe_filename(name: str) -> str:
    """只保留文件名，不允许上传内容决定服务器目录。"""
    cleaned = Path(name or "upload.xlsx").name
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", cleaned)
    return cleaned or "upload.xlsx"


@router.post("/{project_id}/source-versions", status_code=status.HTTP_202_ACCEPTED)
async def create_source_version(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    market_scope: str = Form("auto"),
    wave_scope: str = Form("auto"),
    upload_mode: str = Form("append"),
    replaces_source_file_version_id: str | None = Form(None),
) -> dict[str, object]:
    """保存一个文件版本并返回不含业务单元格值的扫描摘要。"""
    if get_project(project_id) is None:
        raise HTTPException(status_code=404, detail="项目不存在，请先创建项目")
    filename = _safe_filename(file.filename or "upload.xlsx")
    suffix = Path(filename).suffix.casefold()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="当前 PoC 只支持 XLSX 或 CSV 文件")
    if upload_mode == "replace" and not replaces_source_file_version_id:
        raise HTTPException(status_code=400, detail="替换模式必须提供被替换的版本 ID")

    version_id = f"sfv_{uuid.uuid4().hex[:12]}"
    target_directory = UPLOAD_ROOT / re.sub(r"[^A-Za-z0-9._-]+", "_", project_id)
    target_directory.mkdir(parents=True, exist_ok=True)
    target_path = target_directory / f"{version_id}_{filename}"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="文件不能为空")
    target_path.write_bytes(content)

    add_source_file_version(
        project_id,
        {
            "source_file_version_id": version_id,
            "file_name": filename,
            "storage_path": str(target_path),
            "market_scope": market_scope,
            "wave_scope": wave_scope,
            "upload_mode": upload_mode,
            "replaces_source_file_version_id": replaces_source_file_version_id,
            "scan_status": "queued",
            "scan_summary": {},
        },
    )
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    create_processing_job(job_id, project_id, version_id, "ingestion")
    background_tasks.add_task(run_workbook_scan, job_id, version_id, str(target_path))
    return {
        "success": True,
        "data": {
            "source_file_version_id": version_id,
            "project_id": project_id,
            "file_name": filename,
            "market_scope": market_scope,
            "wave_scope": wave_scope,
            "upload_mode": upload_mode,
            "replaces_source_file_version_id": replaces_source_file_version_id,
            "job_id": job_id,
            "scan_status": "queued",
        },
    }


@router.get("/{project_id}/jobs/{job_id}")
def get_job(project_id: str, job_id: str) -> dict[str, object]:
    job = get_processing_job(project_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="处理任务不存在")
    return {"success": True, "data": job}


@router.post("/{project_id}/source-versions/{source_file_version_id}/recognition", status_code=status.HTTP_202_ACCEPTED)
def start_recognition(
    project_id: str,
    source_file_version_id: str,
    background_tasks: BackgroundTasks,
) -> dict[str, object]:
    """显式启动 AI 两层识别；上传不会自动触发 Provider 请求。"""
    if not AI_ENABLED:
        raise HTTPException(status_code=409, detail="AI 识别当前已关闭，请在后端配置 PARSER_AI_ENABLED=true")
    version = get_source_file_version(project_id, source_file_version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="文件版本不存在")
    if version["scan_status"] != "completed":
        raise HTTPException(status_code=409, detail="Python Workbook 扫描尚未完成")
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    create_processing_job(job_id, project_id, source_file_version_id, "recognition")
    background_tasks.add_task(run_ai_recognition, job_id, version["storage_path"])
    return {"success": True, "data": {"job_id": job_id, "source_file_version_id": source_file_version_id, "status": "queued"}}


@router.get("/{project_id}/source-versions/{source_file_version_id}/recognition-results")
def get_recognition_results(project_id: str, source_file_version_id: str) -> dict[str, object]:
    """读取最近一次 AI 识别的结构提案和 Python 校验结果。"""
    job = get_latest_processing_job(project_id, source_file_version_id, "recognition")
    if job is None:
        raise HTTPException(status_code=404, detail="尚无 AI 识别结果")
    return {
        "success": True,
        "data": {
            "job_id": job["job_id"],
            "source_file_version_id": source_file_version_id,
            "status": job["status"],
            "phase": job["phase"],
            "result": job["result"],
        },
    }
