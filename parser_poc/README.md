# Workbook Scan PoC

This offline proof of concept creates the immutable first-pass `SheetOutline` used as the bounded structural input to table-boundary AI.

It deliberately does **not** identify tables, infer question numbers/Base rows, classify metrics, or call an AI service. Python records observable workbook facts; AI will later propose physical table boundaries; Python will then re-read original coordinates for final extraction and validation.

## Run

```bash
python3 parser_poc/workbook_scan.py \
  "PoC/Quantum Tab/Tabs_N+%.xlsx" \
  --output /tmp/tabs_n_scan.json
```

Use `--sheet` to scan one Sheet and `--target-tokens` / `--hard-tokens` to experiment with the summary budget. The PoC default is a 64k-token Outline target with a 70k hard limit, intended for a configured long-context model; it is an operational setting, not a parsing rule.

Use one or more `--detail-range start:end` arguments with `--sheet` to build second-pass Detail Windows from AI-proposed coarse ranges. Detail Window context and grouping are configurable with `--detail-context-before`, `--detail-context-after`, and `--max-candidate-gap-rows`.

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
python3 -m unittest discover -s parser_poc/tests -v
```
