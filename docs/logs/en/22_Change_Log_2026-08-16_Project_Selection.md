# 22 Change Log: Project Selection

## Scope

- Added `GET /api/projects` for the project selector.
- Added an in-app project selection menu that reloads project-specific versions and recognition state.
- Added stable hash-backed IDs for names that have no ASCII slug, including Chinese project names.
- Uploading a source version now updates the Project timestamp used by list ordering.

## Verification

- Project list endpoint returned local projects.
- Frontend build and all 27 offline Parser tests passed.
- Chinese-name ID generation was verified without creating another test project.
