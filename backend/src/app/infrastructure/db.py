"""MVP 本地 SQLite 持久化。

正式环境会替换为受管理的数据库和迁移系统；当前实现只保存项目元数据、
文件版本关系和扫描摘要，不保存完整 Workbook 单元格内容。
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
DB_PATH = ROOT / "outputs" / "local_state" / "dashboard.sqlite3"


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS projects (
            project_id TEXT PRIMARY KEY,
            project_name TEXT NOT NULL,
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
            status TEXT NOT NULL,
            phase TEXT NOT NULL,
            progress_percent INTEGER NOT NULL,
            error_message TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    return connection


def _project(row: sqlite3.Row) -> dict[str, Any]:
    return {"project_id": row["project_id"], "project_name": row["project_name"], "created_at": row["created_at"], "updated_at": row["updated_at"]}


def create_project(project_id: str, project_name: str) -> dict[str, Any]:
    with connect() as connection:
        connection.execute("INSERT INTO projects(project_id, project_name) VALUES (?, ?)", (project_id, project_name))
        row = connection.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,)).fetchone()
    return _project(row)


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


def create_processing_job(job_id: str, project_id: str, source_file_version_id: str) -> None:
    with connect() as connection:
        connection.execute(
            """INSERT INTO processing_jobs(
                job_id, project_id, source_file_version_id, status, phase, progress_percent
            ) VALUES (?, ?, ?, 'queued', '等待 Workbook 扫描', 0)""",
            (job_id, project_id, source_file_version_id),
        )


def update_processing_job(
    job_id: str,
    *,
    status: str,
    phase: str,
    progress_percent: int,
    error_message: str | None = None,
) -> None:
    with connect() as connection:
        connection.execute(
            """UPDATE processing_jobs
            SET status = ?, phase = ?, progress_percent = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE job_id = ?""",
            (status, phase, progress_percent, error_message, job_id),
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
        "status": row["status"],
        "phase": row["phase"],
        "progress_percent": row["progress_percent"],
        "error_message": row["error_message"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
