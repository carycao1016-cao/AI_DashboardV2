"""内部 Dashboard Draft 的生成与读取 API。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..infrastructure.db import get_latest_dashboard_draft, get_latest_processing_job, get_project, get_source_file_version, save_dashboard_draft
from ..pipelines.dashboard_draft import build_dashboard_draft
from ..schemas.projects import CreateDashboardDraftRequest


router = APIRouter(prefix="/api/projects", tags=["dashboard-drafts"])


@router.post("/{project_id}/source-versions/{source_file_version_id}/dashboard-drafts")
def create_dashboard_draft(project_id: str, source_file_version_id: str, request: CreateDashboardDraftRequest) -> dict[str, object]:
    """从当前文件版本的已验证提取结果创建新的内部 Draft 版本。"""
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="项目不存在")
    version = get_source_file_version(project_id, source_file_version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="源文件版本不存在")
    job = get_latest_processing_job(project_id, source_file_version_id, "recognition")
    if job is None or job["status"] != "completed":
        raise HTTPException(status_code=409, detail="请先完成 AI 识别和 Python 校验后再生成 Dashboard Draft")
    previous_draft = get_latest_dashboard_draft(project_id, source_file_version_id)
    confirmed_metrics = {
        question["source_extracted_table_ids"][0]: question["metric_type"]
        for question in (previous_draft or {}).get("semantic_questions", [])
        if question.get("review_status") == "creator_confirmed"
        and question.get("source_extracted_table_ids")
        and question.get("metric_type") in {"percentage", "count", "mean", "net", "box_score"}
    }
    confirmed_metrics.update(dict(request.metric_confirmations))
    semantic_model, draft = build_dashboard_draft(
        project_id,
        source_file_version_id,
        project["project_name"],
        job.get("result") or {},
        confirmed_metrics,
        template=request.template,
        selected_table_ids=request.selected_table_ids,
        visual_overrides=request.visual_overrides,
        planning_mode=request.planning_mode,
    )
    if draft["summary"]["tables_detected"] == 0:
        raise HTTPException(status_code=409, detail="当前版本没有通过 Python 校验的物理表")
    save_dashboard_draft(
        project_id=project_id,
        source_file_version_id=source_file_version_id,
        semantic_model=semantic_model,
        draft=draft,
    )
    return {"success": True, "data": draft}


@router.get("/{project_id}/dashboard-drafts/latest")
def get_dashboard_draft(project_id: str, source_file_version_id: str | None = None) -> dict[str, object]:
    """读取当前项目最近一次内部 Draft，不暴露发布数据包。"""
    if get_project(project_id) is None:
        raise HTTPException(status_code=404, detail="项目不存在")
    draft = get_latest_dashboard_draft(project_id, source_file_version_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="尚未生成 Dashboard Draft")
    return {"success": True, "data": draft}
