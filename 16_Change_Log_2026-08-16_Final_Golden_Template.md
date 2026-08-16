# Final Golden Template Rebuild

**Date:** 16 August 2026  
**Status:** Conversation-confirmed rules; design-document gap check applied

## Scope

- Rebuilt a clean workbook instead of extending the previous mixed template.
- `Index` and `Summary` are explicit `not_a_table` negative fixtures with expected physical table count `0`.
- Annotated three physical tables from each data Sheet: 27 source-backed table annotations across Decipher, Quantum XLSX and Quantum CSV inputs.
- Recorded source Sheet/range, title, Header, Base, data, footnote and significance regions per physical table.

## Value Truth

`Cell_Truth` now separates `Raw_Value`, `Excel_Display_Value`, `Parsed_Value`, `Parsed_Unit`, `Precision_Source`, `Availability_Status`, number format and source lineage. Missing/unavailable display values remain distinct from numeric zero.

## Significance

- Decipher adjacent-column markers are represented per table and per marker source cell.
- Quantum following-row markers are represented per table and per marker source cell.
- CSV encoding is recorded as GB18030 with high confidence based on reversible Chinese text decoding.
- Same-cell cases `20%A`, `20ABC` and `20%ABC` are isolated in `Significance_Parsing_Cases` as user-confirmed synthetic parsing fixtures, not falsely attributed to the supplied PoC files.

## Output

`outputs/golden_annotation_final/Golden_Annotation_Final.xlsx`

The original template and original PoC source files were not overwritten.

## Boundary Correction

Quantum `#page` rows are pagination markers only. They are excluded from `Question_Number` and `Table_Title`; each range now uses the first real title/question row after `#page`.

The CSV mirror now uses the GB18030-decoded titles `S1a`, `S1b` and `Tier` instead of placeholder IDs.
