# 23 Change Log: Project Name Uniqueness

## Decision

- Project names are unique within the current local workspace MVP.
- Duplicate checks normalize Unicode width, case and repeated whitespace.
- The UI shows project names only; `project_id` remains a backend and audit identifier.
- Existing historical duplicate names are preserved and are not deleted automatically.

## Future User Scope

When authentication and workspaces are introduced, the uniqueness constraint should become `(workspace_id, normalized_project_name)` rather than a global constraint.

## Verification

Full-width, mixed-case and extra-space variants of an existing name returned HTTP 409. No new model request was made.
