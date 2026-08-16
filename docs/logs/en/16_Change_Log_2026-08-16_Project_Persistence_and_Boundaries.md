# 16 Change Log: Project Persistence and Service Boundaries

## Scope

- Moved the React/Vite application into `frontend/`.
- Added the Python FastAPI application entry point under `backend/src/app/`.
- Added a local SQLite MVP repository for `Project` and `SourceFileVersion` metadata.
- Connected project creation, project loading and uploaded source-version records to the API.

## Contract

- `POST /api/projects` creates a project container. Market and Wave are not fixed at project creation.
- `GET /api/projects/{project_id}` returns the project and its source-file versions.
- `POST /api/projects/{project_id}/source-versions` requires an existing project and persists scan metadata.
- Original uploaded files remain under the local upload root; SQLite stores metadata and scan summaries only.

## Transitional Boundary

The existing `parser_poc` package remains the tested Parser core and is temporarily imported by the backend pipeline. It will move into `backend/src/app/pipelines/` only after the Golden and offline test contract remains green.

## Verification

- Frontend production build passed.
- 27 Python Parser tests passed.
- Project creation, file upload, project reload and OpenAPI route checks passed.
