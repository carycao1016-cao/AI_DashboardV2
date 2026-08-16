"""MVP 本地 SQLite 持久化。

正式环境会替换为受管理的数据库和迁移系统；当前实现只保存项目元数据、
文件版本关系和扫描摘要，不保存完整 Workbook 单元格内容。
"""

from __future__ import annotations

import json
import sqlite3
import unicodedata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
DB_PATH = ROOT / "outputs" / "local_state" / "dashboard.sqlite3"


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def initialize_database() -> None:
    """在服务启动时完成 SQLite schema 初始化和兼容迁移。

    运行时查询不再执行 DDL，避免并发 API 请求争抢 schema 锁。
    """
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                project_name_normalized TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS source_file_versions (
                source_file_version_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(project_id),
                file_name TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                market_scope TEXT NOT NULL,
                wave_scope TEXT NOT NULL,
                upload_mode TEXT NOT NULL,
                replaces_source_file_version_id TEXT,
                scan_status TEXT NOT NULL,
                scan_summary_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS processing_jobs (
                job_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(project_id),
                source_file_version_id TEXT NOT NULL REFERENCES source_file_versions(source_file_version_id),
                job_type TEXT NOT NULL DEFAULT 'ingestion',
                status TEXT NOT NULL,
                phase TEXT NOT NULL,
                progress_percent INTEGER NOT NULL,
                error_message TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS review_issue_states (
                review_issue_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(project_id),
                status TEXT NOT NULL,
                creator_note TEXT,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        # 兼容上一轮已创建的本地 SQLite 文件；正式环境由迁移工具管理。
        project_columns = {row["name"] for row in connection.execute("PRAGMA table_info(projects)")}
        if "project_name_normalized" not in project_columns:
            connection.execute("ALTER TABLE projects ADD COLUMN project_name_normalized TEXT")
        # 旧数据库可能已经有新增列、但在创建唯一索引前被中断；每次启动都补齐空值和索引。
        rows_to_normalize = connection.execute(
            "SELECT project_id, project_name FROM projects WHERE project_name_normalized IS NULL OR project_name_normalized = ''"
        ).fetchall()
        for row in rows_to_normalize:
            connection.execute(
                "UPDATE projects SET project_name_normalized = ? WHERE project_id = ?",
                (normalize_project_name(row["project_name"]), row["project_id"]),
            )
        try:
            connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS projects_name_normalized_unique ON projects(project_name_normalized)")
        except sqlite3.IntegrityError:
            # 历史本地数据可能已包含同名项目。保留记录，运行时创建校验仍会阻止新的重复名称。
            pass
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(processing_jobs)")}
        if "job_type" not in columns:
            connection.execute("ALTER TABLE processing_jobs ADD COLUMN job_type TEXT NOT NULL DEFAULT 'ingestion'")
        if "result_json" not in columns:
            connection.execute("ALTER TABLE processing_jobs ADD COLUMN result_json TEXT NOT NULL DEFAULT '{}' ")


def _project(row: sqlite3.Row) -> dict[str, Any]:
    return {"project_id": row["project_id"], "project_name": row["project_name"], "created_at": row["created_at"], "updated_at": row["updated_at"]}


def normalize_project_name(project_name: str) -> str:
    """统一 Unicode、大小写和连续空白，用于同一工作区的项目重名判定。"""
    return " ".join(unicodedata.normalize("NFKC", project_name).casefold().split())


def create_project(project_id: str, project_name: str, project_name_normalized: str) -> dict[str, Any]:
    with connect() as connection:
        connection.execute(
            "INSERT INTO projects(project_id, project_name, project_name_normalized) VALUES (?, ?, ?)",
            (project_id, project_name, project_name_normalized),
        )
        row = connection.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,)).fetchone()
    return _project(row)


def get_project_by_normalized_name(project_name_normalized: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM projects WHERE project_name_normalized = ?",
            (project_name_normalized,),
        ).fetchone()
    return _project(row) if row else None


def list_projects() -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute("SELECT * FROM projects ORDER BY updated_at DESC, created_at DESC").fetchall()
    return [_project(row) for row in rows]


def get_project(project_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,)).fetchone()
        if row is None:
            return None
        project = _project(row)
        versions = connection.execute(
            "SELECT * FROM source_file_versions WHERE project_id = ? ORDER BY created_at DESC",
            (project_id,),
        ).fetchall()
    project["source_file_versions"] = [
        {
            "source_file_version_id": version["source_file_version_id"],
            "file_name": version["file_name"],
            "market_scope": version["market_scope"],
            "wave_scope": version["wave_scope"],
            "upload_mode": version["upload_mode"],
            "replaces_source_file_version_id": version["replaces_source_file_version_id"],
            "scan_status": version["scan_status"],
            "scan_summary": json.loads(version["scan_summary_json"]),
            "created_at": version["created_at"],
        }
        for version in versions
    ]
    return project


def add_source_file_version(project_id: str, version: dict[str, Any]) -> None:
    with connect() as connection:
        connection.execute(
            """INSERT INTO source_file_versions(
                source_file_version_id, project_id, file_name, storage_path,
                market_scope, wave_scope, upload_mode,
                replaces_source_file_version_id, scan_status, scan_summary_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                version["source_file_version_id"], project_id, version["file_name"], version["storage_path"],
                version["market_scope"], version["wave_scope"], version["upload_mode"],
                version["replaces_source_file_version_id"], version["scan_status"], json.dumps(version["scan_summary"], ensure_ascii=False),
            ),
        )
        connection.execute("UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE project_id = ?", (project_id,))


def create_processing_job(job_id: str, project_id: str, source_file_version_id: str, job_type: str = "ingestion") -> None:
    with connect() as connection:
        connection.execute(
            """INSERT INTO processing_jobs(
                job_id, project_id, source_file_version_id, job_type, status, phase, progress_percent
            ) VALUES (?, ?, ?, ?, 'queued', '等待处理', 0)""",
            (job_id, project_id, source_file_version_id, job_type),
        )


def update_processing_job(
    job_id: str,
    *,
    status: str,
    phase: str,
    progress_percent: int,
    error_message: str | None = None,
    result: dict[str, Any] | None = None,
) -> None:
    with connect() as connection:
        connection.execute(
            """UPDATE processing_jobs
            SET status = ?, phase = ?, progress_percent = ?, error_message = ?, result_json = COALESCE(?, result_json), updated_at = CURRENT_TIMESTAMP
            WHERE job_id = ?""",
            (status, phase, progress_percent, error_message, json.dumps(result, ensure_ascii=False) if result is not None else None, job_id),
        )


def complete_source_file_scan(source_file_version_id: str, scan_status: str, scan_summary: dict[str, Any]) -> None:
    with connect() as connection:
        connection.execute(
            """UPDATE source_file_versions
            SET scan_status = ?, scan_summary_json = ?
            WHERE source_file_version_id = ?""",
            (scan_status, json.dumps(scan_summary, ensure_ascii=False), source_file_version_id),
        )


def get_processing_job(project_id: str, job_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM processing_jobs WHERE project_id = ? AND job_id = ?",
            (project_id, job_id),
        ).fetchone()
    if row is None:
        return None
    return {
        "job_id": row["job_id"],
        "project_id": row["project_id"],
        "source_file_version_id": row["source_file_version_id"],
        "job_type": row["job_type"],
        "status": row["status"],
        "phase": row["phase"],
        "progress_percent": row["progress_percent"],
        "error_message": row["error_message"],
        "result": json.loads(row["result_json"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def get_source_file_version(project_id: str, source_file_version_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM source_file_versions WHERE project_id = ? AND source_file_version_id = ?",
            (project_id, source_file_version_id),
        ).fetchone()
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}


def get_latest_processing_job(project_id: str, source_file_version_id: str, job_type: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            """SELECT job_id FROM processing_jobs
            WHERE project_id = ? AND source_file_version_id = ? AND job_type = ?
            ORDER BY created_at DESC LIMIT 1""",
            (project_id, source_file_version_id, job_type),
        ).fetchone()
    return get_processing_job(project_id, row["job_id"]) if row else None


def get_review_issue_states(project_id: str) -> dict[str, dict[str, Any]]:
    """读取 Creator 对自动生成问题的处理状态，不保存或改写源单元格。"""
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM review_issue_states WHERE project_id = ?", (project_id,)
        ).fetchall()
    return {
        row["review_issue_id"]: {
            "status": row["status"],
            "creator_note": row["creator_note"],
            "updated_at": row["updated_at"],
        }
        for row in rows
    }


def set_review_issue_state(
    project_id: str,
    review_issue_id: str,
    status: str,
    creator_note: str | None,
) -> None:
    """写入 Review 处置结论；问题证据仍由识别/提取结果重新计算。"""
    with connect() as connection:
        connection.execute(
            """INSERT INTO review_issue_states(review_issue_id, project_id, status, creator_note)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(review_issue_id) DO UPDATE SET
                status = excluded.status,
                creator_note = excluded.creator_note,
                updated_at = CURRENT_TIMESTAMP""",
            (review_issue_id, project_id, status, creator_note),
        )
