"""源文件接收后的本地 Workbook 扫描任务。"""

from __future__ import annotations

from pathlib import Path

from parser_poc.workbook_scan import scan_workbook

from ..infrastructure.db import complete_source_file_scan, update_processing_job


def run_workbook_scan(job_id: str, source_file_version_id: str, source_path: str) -> None:
    """执行确定性扫描，并持续写入可查询的任务状态。

    当前由 FastAPI BackgroundTasks 在同一进程调用。它只进行 Python Workbook
    扫描，不调用 AI；生产环境将由独立 worker 取代这个进程内实现。
    """
    try:
        update_processing_job(job_id, status="running", phase="读取 Workbook", progress_percent=15)
        summary = scan_workbook(Path(source_path))
        update_processing_job(job_id, status="running", phase="生成 Sheet Outline", progress_percent=80)
        sheets = [
            {
                "sheet_name": sheet.get("sheet_name"),
                "scan_range": sheet.get("scan_range"),
                "outline_chunk_count": len(sheet.get("outline_chunks", [])),
                "estimated_input_tokens": sheet.get("estimated_input_tokens"),
            }
            for sheet in summary.get("sheets", [])
        ]
        scan_summary = {"sheet_count": len(sheets), "sheets": sheets}
        complete_source_file_scan(source_file_version_id, "completed", scan_summary)
        update_processing_job(job_id, status="completed", phase="Workbook 扫描完成", progress_percent=100)
    except Exception as exc:
        complete_source_file_scan(source_file_version_id, "failed", {"error": str(exc)})
        update_processing_job(job_id, status="failed", phase="Workbook 扫描失败", progress_percent=100, error_message=str(exc))
