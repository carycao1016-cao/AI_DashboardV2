"""AI Dashboard Python API 入口。

当前 MVP 使用模块化单体：HTTP 路由位于 app.api，Workbook Parser 暂时复用
根目录的 parser_poc 包。后续 Parser 领域模块稳定后，再迁移到 app/pipelines。
"""

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .api.source_versions import router as source_versions_router
from .api.dashboard_drafts import router as dashboard_drafts_router
from .infrastructure.db import create_project, get_project, get_project_by_normalized_name, initialize_database, list_projects, normalize_project_name
from .schemas.projects import CreateProjectRequest

initialize_database()

app = FastAPI(title="AI Dashboard API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai_dashboard_backend"}


@app.post("/api/projects")
def create_project_endpoint(request: CreateProjectRequest) -> dict[str, object]:
    """创建一个长期存在的项目容器；市场和 Wave 不在此处固定。"""
    import hashlib
    import re

    project_name = request.project_name.strip()
    normalized_name = normalize_project_name(project_name)
    slug = re.sub(r"[^a-z0-9]+", "-", normalized_name).strip("-")[:48]
    # 中文或其他非拉丁名称不能压缩为同一个固定 ID，保留名称本身并用短哈希保证稳定唯一。
    project_id = "prj_" + slug if slug else "prj_project_" + hashlib.sha256(normalized_name.encode("utf-8")).hexdigest()[:10]
    if get_project_by_normalized_name(normalized_name) is not None:
        raise HTTPException(status_code=409, detail="项目名称已存在")
    return {"success": True, "data": create_project(project_id, project_name, normalized_name)}


@app.get("/api/projects")
def list_projects_endpoint() -> dict[str, object]:
    """返回项目选择器所需的轻量项目列表，不包含文件和业务数据。"""
    return {"success": True, "data": list_projects()}


@app.get("/api/projects/{project_id}")
def get_project_endpoint(project_id: str) -> dict[str, object]:
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="项目不存在")
    return {"success": True, "data": project}


app.include_router(source_versions_router)
app.include_router(dashboard_drafts_router)
