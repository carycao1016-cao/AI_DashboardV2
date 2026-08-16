"""AI Dashboard Python API 入口。

当前 MVP 使用模块化单体：HTTP 路由位于 app.api，Workbook Parser 暂时复用
根目录的 parser_poc 包。后续 Parser 领域模块稳定后，再迁移到 app/pipelines。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.source_versions import router as source_versions_router

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


app.include_router(source_versions_router)
