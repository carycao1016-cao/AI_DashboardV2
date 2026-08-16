# 18 Change Log: Explicit AI Recognition

## Scope

- Added an explicit recognition endpoint for a completed source-file scan.
- Upload does not call an AI Provider automatically.
- AI recognition is disabled by default with `PARSER_AI_ENABLED=false`.
- When enabled, the backend uses the configured Ark profile and `PARSER_AI_MAX_SHEETS` limit.
- Recognition results are stored as status-only job summaries; source values remain Python-owned.

## Safety Boundary

The frontend never receives or submits API keys. The recognition endpoint rejects requests while AI is disabled, and the default Sheet limit is one for controlled Smoke usage. Broader execution requires a separate Golden evaluation decision.
