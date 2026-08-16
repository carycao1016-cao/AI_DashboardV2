# 19 Change Log: Recognition Result Persistence

## Scope

- Persist Layer 1 outline responses, Layer 2 `TableBoundaryProposal` objects and Python `BoundaryValidationResult` objects in the recognition job result.
- Added a source-version recognition-results read endpoint for Data Explorer integration.
- Stored artifacts remain structural/status metadata; business cell values are not copied into the job result.

## Testing Boundary

This change was validated with build, import and offline Parser tests. No additional DeepSeek request was made.
