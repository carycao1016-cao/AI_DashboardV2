# AI Dashboard Next Session Handoff

**Handoff date:** 2026-08-14
**Working directory:** `/Users/carycao/Downloads/0_AI_Dashboard`

## Completed Today

- Frozen the two-layer `SheetOutline -> DetailWindow -> TableBoundaryProposal -> Python validation` contract.
- Updated data and architecture specifications with Layer 1/2 payload boundaries, continuation limits, validation outcomes, provider-neutral structured-generation adapter and Golden thresholds.
- Added five required fields to `PoC/Golden_Annotation_Template.xlsx` and populated the existing example.
- Updated the offline scanner's default Outline budget to 64k/70k, while retaining CLI configuration.
- Added Pydantic two-layer contracts, a controlled provider-neutral Stub, a physical validation shell and a status-only Golden evaluator.
- Added the Python 3.12 project baseline and declared PoC dependencies in `pyproject.toml`.

## Current Git Checkpoint

Create a commit after the final test run for only the intentional files listed in `10_Change_Log_2026-08-14_Two_Layer_Scan_and_Golden_Validation.md`. Do not stage original PoC workbooks, unrelated source specifications or the DOCX reference file.

## Next Work Item

Prepare the first evidence-backed Golden set and connect it to the offline evaluator:

1. Annotate 20-30 physical tables across Quantum and Decipher using the existing template fields.
2. Add Cell Truth samples and expected significance-layout/validation statuses for every annotated table.
3. Supply controlled Stub fixtures for the annotated ranges and run the status-only evaluator against both source families.
4. Only after the baseline is stable, add one configured external provider adapter and compare it with the same Golden report.

## Guardrails

- AI is a structural suggestion only; Python reads source values and makes every final accept/reject decision.
- Preserve all original source coordinates and do not infer Base across a table or Sheet.
- Keep Review exceptional: no silent business guesses, but valid verified tables should not require routine manual confirmation.
- Evaluate models through the same provider-neutral contract and Golden scorecard; do not hardcode a provider or model into the extraction domain.
