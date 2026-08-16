# Golden Annotation Significance Expansion

**Date:** 16 August 2026  
**Status:** Source-backed annotation update; original user-edited template preserved

## Added

- Added a new `G004` workbook entry for the Quantum `Tabs_%95.xlsx` significance sheet.
- Added ten Decipher `Percentages_Sig1` physical table annotations (`G002_SIG_T01` to `G002_SIG_T10`).
- Added one Quantum following-row significance table annotation (`G004_SIG_T01`).
- Added source-sheet and significance-region fields to `Table_Annotation`:
  `Significance_Source_Sheet`, `Significance_Value_Range`,
  `Significance_Marker_Range`, and `Significance_Code_Header_Range`.
- Added source-sheet, value-column, and marker-column fields to `Header_Annotation`.
- Added source-sheet and marker-cell provenance to `Cell_Truth`.
- Added 24 Decipher header-code mappings (`A` to `X`) and 27 Quantum mappings (`A` to `F`, `a` to `u`).
- Added source-backed significance cell examples for both layouts, preserving `-` as a distinct display value when encountered.

## Layouts Covered

- Decipher: percentage values in alternating columns, with significance codes in the adjacent column.
- Quantum: percentage values followed by a same-column significance-code row.

## Output

The updated copy is `outputs/golden_annotation_significance/Golden_Annotation_Template_with_Significance.xlsx`.
The original `PoC/Golden_Annotation_Template.xlsx` was not overwritten.

## Verification

- Artifact-tool import/export and render completed for all four sheets.
- `load_golden_annotations` loaded 32 physical annotations and recognized both significance layouts.
- The bundled Python runtime does not include `pytest`; the existing test suite was therefore not executed in this environment.
