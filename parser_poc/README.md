# Workbook Scan PoC

This offline proof of concept creates the immutable first-pass `SheetOutline` used as the bounded structural input to table-boundary AI.

It deliberately does **not** identify tables, infer question numbers/Base rows, classify metrics, or call an AI service. Python records observable workbook facts; AI will later propose physical table boundaries; Python will then re-read original coordinates for final extraction and validation.

## Run

The PoC requires Python 3.12. Create an isolated environment with your approved Python 3.12 distribution, then install the declared dependencies:

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -e .
```

```bash
.venv/bin/python parser_poc/workbook_scan.py \
  "PoC/Quantum Tab/Tabs_N+%.xlsx" \
  --output /tmp/tabs_n_scan.json
```

Use `--sheet` to scan one Sheet and `--target-tokens` / `--hard-tokens` to experiment with the summary budget. The PoC default is a 64k-token Outline target with a 70k hard limit, intended for a configured long-context model; it is an operational setting, not a parsing rule.

Use one or more `--detail-range start:end` arguments with `--sheet` to build second-pass Detail Windows from AI-proposed coarse ranges. Detail Window context and grouping are configurable with `--detail-context-before`, `--detail-context-after`, and `--max-candidate-gap-rows`.

## Two-layer contract shell

- `contracts.py` defines Pydantic contracts for Layer 1 response, Detail Window request, Layer 2 proposal and Python validation result.
- `orchestration.py` contains a provider-neutral adapter protocol and `ControlledStubAdapter`. The Stub returns only explicitly supplied fixtures; it does not infer a table or call a model.
- `golden_evaluation.py` reads structural fields from `Golden_Annotation_Final.xlsx` and emits aggregate coverage and validation statuses without question text, labels or numeric values.
- `golden_scan_evaluation.py` scans every source file registered in the final Golden workbook and records Layer 1 Outline coverage. It does not treat an Outline chunk as an AI table-boundary result.

The orchestrator currently validates physical bounds and declared region overlap only. It is intentionally not a value extractor, a significance mapper or a production acceptance engine.

## Current rules implemented

- First-pass Outline rows retain only A-column/first-non-empty text and row-level counts. They are sent using one `row_schema` plus compact positional arrays to avoid repeating JSON keys. No semantic signal, candidate-table heuristic or per-cell sample is generated before AI review.
- The second-pass Detail Window will retain a position-based sample of at most six non-empty cells per row: A column when populated, then left/middle/right cells. It includes raw value, best available display value, data type, number format, formula presence and cached-result availability. Formula expressions are never included.
- Preserve all relevant merged ranges, hidden-row/column metadata, and exact blank-row positions. Two or more consecutive blank rows are compacted as ranges.
- Never truncate a selected text sample. If the token budget is exceeded, rows are divided into neutral row windows.
- A row window is not a table boundary. AI may request up to 100 rows above or below; the future orchestration layer will allow at most two such continuation calls.
- CSV source bytes are preserved by the caller; this PoC records a confidence-scored candidate encoding and never sends raw bytes to an AI.

## Important PoC limitation

`openpyxl` does not render Excel number formats exactly. For numeric cells, `display_value` is a transparent best-effort fallback and is marked with `display_value_source`. Final extraction must use a production-grade display formatter or stored Excel display evidence before any published result is created.

## Tests

```bash
.venv/bin/python -m unittest discover -s parser_poc/tests -v
```

## Full Golden scan

```bash
.venv/bin/python -m parser_poc.golden_scan_evaluation \
  --output outputs/full_scan_report.json
```

The report records source-specific chunk counts, estimated Outline input tokens and Golden coverage. A `covered` result means that a Python-produced Outline chunk contains an annotated Header or first data row. It must not be interpreted as a successful Layer 1 AI recognition result.
