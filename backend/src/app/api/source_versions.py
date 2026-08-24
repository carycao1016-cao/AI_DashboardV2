"""源文件版本 API：接收源文件并运行 Python Workbook Outline 扫描。

该服务只负责文件版本登记和确定性的 Sheet 扫描，不调用 AI，也不把完整
工作簿发送到外部 Provider。生产环境还需要认证、对象存储、任务队列和数据库。
"""

from __future__ import annotations

import re
import uuid
from hashlib import sha256
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status

from ..infrastructure.db import add_source_file_version, create_processing_job, get_active_processing_job, get_latest_processing_job, get_processing_job, get_project, get_review_issue_states, get_source_file_version, set_review_issue_state
from ..pipelines.ingestion import run_workbook_scan
from ..pipelines.recognition import run_ai_recognition
from ..schemas.projects import ResolveReviewIssueRequest
from ..settings import AI_ENABLED


ROOT = Path(__file__).resolve().parents[4]
UPLOAD_ROOT = ROOT / "outputs" / "local_uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_SUFFIXES = {".xlsx", ".csv"}

router = APIRouter(prefix="/api/projects", tags=["source-versions"])


def _review_issue_id(source_file_version_id: str, object_id: str, issue_type: str) -> str:
    """同一源版本的同一结构问题得到稳定 ID，方便保存人工处置状态。"""
    token = f"{source_file_version_id}:{object_id}:{issue_type}".encode("utf-8")
    return f"issue_{sha256(token).hexdigest()[:16]}"


def _build_review_issues(project_id: str, source_file_version_id: str) -> list[dict[str, object]]:
    """仅根据 Python 校验和提取证据生成问题，未知信息不做业务猜测。"""
    job = get_latest_processing_job(project_id, source_file_version_id, "recognition")
    if job is None:
        return []
    result = job.get("result") or {}
    sheets = result.get("sheets") if isinstance(result, dict) else []
    states = get_review_issue_states(project_id)
    issues: list[dict[str, object]] = []
    for sheet in sheets if isinstance(sheets, list) else []:
        if not isinstance(sheet, dict):
            continue
        proposals = sheet.get("boundary_proposals", [])
        validations = sheet.get("boundary_validations", [])
        for index, validation in enumerate(validations if isinstance(validations, list) else []):
            if not isinstance(validation, dict) or validation.get("outcome") not in {"review_required", "rejected"}:
                continue
            proposal = proposals[index] if isinstance(proposals, list) and index < len(proposals) and isinstance(proposals[index], dict) else {}
            object_id = str(validation.get("proposal_id") or proposal.get("proposal_id") or f"{sheet.get('sheet_name', 'sheet')}_{index}")
            issue_type = "boundary_validation_failed"
            issue_id = _review_issue_id(source_file_version_id, object_id, issue_type)
            issue = {
                "review_issue_id": issue_id,
                "project_id": project_id,
                "source_file_version_id": source_file_version_id,
                "object_type": "table_boundary",
                "object_id": object_id,
                "field_name": "source_range",
                "issue_type": issue_type,
                "risk_class": "publishing_blocker",
                "severity": "high",
                "message": f"{sheet.get('sheet_name', 'Sheet')} 的物理表边界未通过 Python 校验。",
                "suggested_actions": ["review_source_range", "exclude_from_dashboard"],
                "blocks_publication": True,
            }
            issue.update(states.get(issue_id, {"status": "open", "creator_note": None}))
            issues.append(issue)
        for table in sheet.get("extracted_tables", []) if isinstance(sheet.get("extracted_tables"), list) else []:
            if not isinstance(table, dict):
                continue
            unresolved_cells = [
                cell for row in table.get("rows", []) if isinstance(row, dict)
                for cell in row.get("cells", []) if isinstance(cell, dict) and cell.get("significance_mapping_status") == "unresolved"
            ]
            if not unresolved_cells:
                continue
            object_id = str(table.get("extracted_table_id", "table"))
            issue_type = "significance_mapping_unresolved"
            issue_id = _review_issue_id(source_file_version_id, object_id, issue_type)
            issue = {
                "review_issue_id": issue_id,
                "project_id": project_id,
                "source_file_version_id": source_file_version_id,
                "object_type": "extracted_table",
                "object_id": object_id,
                "field_name": "significance_schema.label_map",
                "issue_type": issue_type,
                "risk_class": "publishing_blocker",
                "severity": "high",
                "message": f"{len(unresolved_cells)} 个显著性标记无法映射到表头，原始标记已保留。",
                "suggested_actions": ["review_significance_mapping", "exclude_from_dashboard"],
                "blocks_publication": True,
            }
            issue.update(states.get(issue_id, {"status": "open", "creator_note": None}))
            issues.append(issue)
    return issues


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
    """返回轮询所需的轻量状态，完整识别结果由专用读取接口按需提供。"""
    job = get_processing_job(project_id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="处理任务不存在")
    # 识别结果可能包含数万真实单元格。轮询每秒调用一次，绝不能重复序列化和传输它。
    result = job.pop("result", {})
    job["result_available"] = bool(result)
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
    active_job = get_active_processing_job(project_id, source_file_version_id, "recognition")
    if active_job is not None:
        raise HTTPException(
            status_code=409,
            detail=f"当前文件已有识别任务正在运行：{active_job['job_id']}。请在识别进度查看状态。",
        )
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
            "progress_percent": job["progress_percent"],
            "error_message": job["error_message"],
            "result": job["result"],
        },
    }


@router.get("/{project_id}/source-versions/{source_file_version_id}/extraction")
def get_extraction(project_id: str, source_file_version_id: str) -> dict[str, object]:
    """读取最近一次识别任务中由 Python 回读生成的提取表数据。"""
    job = get_latest_processing_job(project_id, source_file_version_id, "recognition")
    if job is None:
        raise HTTPException(status_code=404, detail="尚无 AI 识别结果")
    result = job.get("result") or {}
    sheets = result.get("sheets") if isinstance(result, dict) else None
    extracted_tables = [
        table
        for sheet in (sheets if isinstance(sheets, list) else [])
        for table in (sheet.get("extracted_tables", []) if isinstance(sheet, dict) else [])
    ]
    return {
        "success": True,
        "data": {
            "job_id": job["job_id"],
            "source_file_version_id": source_file_version_id,
            "status": job["status"],
            "tables": extracted_tables,
        },
    }


def _get_extracted_tables(project_id: str, source_file_version_id: str) -> list[dict[str, object]]:
    """读取最近一次识别中由 Python 回读并保存的物理表。"""
    job = get_latest_processing_job(project_id, source_file_version_id, "recognition")
    if job is None:
        raise HTTPException(status_code=404, detail="尚无 AI 识别结果")
    result = job.get("result") or {}
    sheets = result.get("sheets") if isinstance(result, dict) else None
    return [
        table
        for sheet in (sheets if isinstance(sheets, list) else [])
        for table in (sheet.get("extracted_tables", []) if isinstance(sheet, dict) else [])
        if isinstance(table, dict)
    ]


@router.get("/{project_id}/source-versions/{source_file_version_id}/extraction-tables")
def list_extraction_tables(
    project_id: str,
    source_file_version_id: str,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, object]:
    """分页返回物理表目录，不传输明细单元格。"""
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="分页参数无效")
    tables = _get_extracted_tables(project_id, source_file_version_id)
    start = (page - 1) * page_size
    summaries = [
        {
            "extracted_table_id": table.get("extracted_table_id"),
            "source_sheet": table.get("source_sheet"),
            "source_range": table.get("source_range"),
            "detected_question_number": table.get("detected_question_number"),
            "detected_question_text": table.get("detected_question_text"),
            "detected_table_title": table.get("detected_table_title"),
            "table_variant": table.get("table_variant"),
            "header_count": len(table.get("headers", [])) if isinstance(table.get("headers"), list) else 0,
            "row_count": len(table.get("rows", [])) if isinstance(table.get("rows"), list) else 0,
        }
        for table in tables[start:start + page_size]
    ]
    return {"success": True, "data": {"tables": summaries, "page": page, "page_size": page_size, "total": len(tables)}}


@router.get("/{project_id}/source-versions/{source_file_version_id}/extraction-tables/{extracted_table_id}")
def get_extraction_table(
    project_id: str,
    source_file_version_id: str,
    extracted_table_id: str,
) -> dict[str, object]:
    """仅在 Creator 打开一张物理表时返回该表的完整回读结果。"""
    table = next(
        (item for item in _get_extracted_tables(project_id, source_file_version_id) if item.get("extracted_table_id") == extracted_table_id),
        None,
    )
    if table is None:
        raise HTTPException(status_code=404, detail="物理表不存在")
    return {"success": True, "data": {"table": table}}


@router.get("/{project_id}/review-issues")
def get_review_issues(project_id: str) -> dict[str, object]:
    """返回当前项目所有源版本的真实 Review 问题。"""
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="项目不存在")
    issues = [
        issue
        for version in project["source_file_versions"]
        for issue in _build_review_issues(project_id, version["source_file_version_id"])
    ]
    return {"success": True, "data": {"issues": issues}}


@router.post("/{project_id}/review-issues/{review_issue_id}")
def resolve_review_issue(
    project_id: str,
    review_issue_id: str,
    request: ResolveReviewIssueRequest,
) -> dict[str, object]:
    """保存 Creator 的处置结论；只更新状态和备注，不改写解析数据。"""
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="项目不存在")
    current_issues = [
        issue
        for version in project["source_file_versions"]
        for issue in _build_review_issues(project_id, version["source_file_version_id"])
    ]
    issue = next((item for item in current_issues if item["review_issue_id"] == review_issue_id), None)
    if issue is None:
        raise HTTPException(status_code=404, detail="Review 问题不存在或已过期")
    set_review_issue_state(project_id, review_issue_id, request.status, request.creator_note)
    issue["status"] = request.status
    issue["creator_note"] = request.creator_note
    return {"success": True, "data": issue}
