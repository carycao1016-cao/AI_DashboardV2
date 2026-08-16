"""本地 PoC API：接收源文件并运行 Python Workbook Outline 扫描。

该服务只负责文件版本登记和确定性的 Sheet 扫描，不调用 AI，也不把完整
工作簿发送到外部 Provider。生产环境还需要认证、对象存储、任务队列和数据库。
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from parser_poc.workbook_scan import scan_workbook


ROOT = Path(__file__).parents[1]
UPLOAD_ROOT = ROOT / "outputs" / "local_uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_SUFFIXES = {".xlsx", ".csv"}

app = FastAPI(title="AI Dashboard Parser PoC API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _safe_filename(name: str) -> str:
    """只保留文件名，不允许上传内容决定服务器目录。"""
    cleaned = Path(name or "upload.xlsx").name
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", cleaned)
    return cleaned or "upload.xlsx"


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "parser_poc"}


@app.post("/api/projects/{project_id}/source-versions")
async def create_source_version(
    project_id: str,
    file: UploadFile = File(...),
    market_scope: str = Form("auto"),
    wave_scope: str = Form("auto"),
    upload_mode: str = Form("append"),
    replaces_source_file_version_id: str | None = Form(None),
) -> dict[str, object]:
    """保存一个文件版本并返回不含业务单元格值的扫描摘要。"""
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

    try:
        summary = scan_workbook(target_path)
    except Exception as exc:
        target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Workbook 扫描失败：{exc}") from exc

    sheets = [
        {
            "sheet_name": sheet.get("sheet_name"),
            "scan_range": sheet.get("scan_range"),
            "outline_chunk_count": len(sheet.get("outline_chunks", [])),
            "estimated_input_tokens": sheet.get("estimated_input_tokens"),
        }
        for sheet in summary.get("sheets", [])
    ]
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
            "sheet_count": len(sheets),
            "sheets": sheets,
            "scan_status": "completed",
        },
    }
