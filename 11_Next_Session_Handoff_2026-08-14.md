# AI Dashboard Next Session Handoff

**Handoff date:** 2026-08-14
**Working directory:** `/Users/carycao/Downloads/0_AI_Dashboard`

## Completed Today

- Frozen the two-layer `SheetOutline -> DetailWindow -> TableBoundaryProposal -> Python validation` contract.
- Updated data and architecture specifications with Layer 1/2 payload boundaries, continuation limits, validation outcomes, provider-neutral structured-generation adapter and Golden thresholds.
- Added five required fields to `PoC/Golden_Annotation_Template.xlsx` and populated the existing example.
- Updated the offline scanner's default Outline budget to 64k/70k, while retaining CLI configuration.

## Current Git Checkpoint

Create a commit after the final test run for only the intentional files listed in `10_Change_Log_2026-08-14_Two_Layer_Scan_and_Golden_Validation.md`. Do not stage original PoC workbooks, unrelated source specifications or the DOCX reference file.

## Next Work Item

Build the provider-neutral orchestration shell around the existing scanner:

1. Define Pydantic schemas for Layer 1 response, Detail Window request, Layer 2 proposal and validation report.
2. Implement a controlled stub adapter before connecting any external model.
3. Convert the Golden template into the first 20-30 physical-table annotations and create a status-only evaluator.
4. Run the evaluator against Quantum and Decipher fixtures before enabling a real provider.

## Guardrails

- AI is a structural suggestion only; Python reads source values and makes every final accept/reject decision.
- Preserve all original source coordinates and do not infer Base across a table or Sheet.
- Keep Review exceptional: no silent business guesses, but valid verified tables should not require routine manual confirmation.
- Evaluate models through the same provider-neutral contract and Golden scorecard; do not hardcode a provider or model into the extraction domain.
