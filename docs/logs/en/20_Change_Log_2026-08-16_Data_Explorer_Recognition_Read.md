# 20 Change Log: Data Explorer Recognition Read

## Scope

- Data Explorer now reads the latest recognition result for the selected project version.
- Recognized Sheets are summarized from persisted boundary proposals and validation outcomes.
- A missing recognition result remains an explicit empty state; demo inventory is not presented as a successful AI result.

## Testing Boundary

The existing DeepSeek Smoke result was read through the new API. No new model request was made. Frontend build and all 27 offline Parser tests passed.
