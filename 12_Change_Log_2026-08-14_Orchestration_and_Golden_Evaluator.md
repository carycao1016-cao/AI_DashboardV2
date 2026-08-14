# Orchestration and Golden Evaluator Change Log

**Date:** 14 August 2026
**Status:** Offline contract-shell implementation

## Added

- Pydantic contracts for Layer 1 Sheet Outline responses, Detail Window requests, Layer 2 table-boundary proposals and Python validation results.
- A provider-neutral `StructuredGenerationAdapter` protocol and `ControlledStubAdapter`. The Stub consumes explicit response fixtures only and has no AI or heuristic inference behaviour.
- An orchestration shell that dispatches Outline chunks, constructs Detail Window requests without merging candidate identities, and performs limited physical bounds/region validation.
- A Golden evaluator that reads structural annotation fields and emits aggregate, status-only coverage and validation statistics. It excludes question text, labels and source numeric values from the report.
- Unit coverage for contract constraints, Stub sequencing, physical out-of-bounds handling, significance-layout declaration and Golden coverage/report rules.

## Deliberate Limits

- The shell does not extract final values, map Headers/Base/significance, calculate statistics, automatically adjust boundaries or publish anything.
- A real provider is not connected. Model/provider selection remains a configuration and Golden-evaluation decision.
- The Golden template currently holds one example only. The planned 20-30 physical-table set must be annotated from source evidence and must not be generated automatically.
