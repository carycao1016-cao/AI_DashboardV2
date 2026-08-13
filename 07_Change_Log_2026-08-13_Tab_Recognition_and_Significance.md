# Tab Recognition and Significance Revision Log

**Date:** 13 August 2026  
**Status:** Confirmed product and architecture revision  
**Affected specifications:**

- `02_Data_and_JSON_Specification_v1.1.md`
- `06_Python_Technical_Architecture.md`

## Confirmed Decisions

1. English and Simplified Chinese remain first-phase product requirements.
2. The product accepts generic Excel and CSV Tab Books. A-column text is a high-priority structural clue, not a required location for a question number or table boundary.
3. AI receives a bounded Python-generated structural summary and returns only candidate table ranges and region proposals. It does not become the system of record for individual values or research meaning.
4. Python re-reads the original source coordinates and deterministically validates all proposed boundaries, headers, Base rows, values and source lineage before final extraction objects are written.
5. Physical tables are retained by Sheet and source range. Compatible Count, Percentage and significance variants may later be linked to one semantic question while preserving independent source bindings.
6. Official significance is represented per physical table because its layout can differ across tables and Sheets.
7. Supported significance layouts include header-inline labels, separate label rows, adjacent columns, following rows, inline values, separate Sheets and mixed layouts.
8. Significance labels are case-sensitive source labels, not Excel column letters. The parser maps every label to an extracted header before interpreting a marker.
9. A marker such as `ABC` identifies official comparison targets only. It must not be used to infer `higher` or `lower` unless the source explicitly provides direction evidence.
10. Unknown labels, incomplete mappings and ambiguous boundaries preserve original evidence and route to Review rather than being guessed or silently normalized.

## Contract Changes

- Added internal processing artifacts: `WorkbookScanSummary`, `TableBoundaryProposal`, and `BoundaryValidationResult`.
- Added table-level `significance_schema` with layout, label map, test evidence and parse status.
- Expanded extracted-cell significance information to retain marker origin, representation and mapped header IDs.
- Changed official-significance direction behavior: `unknown` is the default; source evidence is required for `higher` or `lower`.

## Compatibility Impact

These are backward-compatible extraction additions. Existing `ExtractedTable`, `ExtractedHeader` and `ExtractedCell` fields remain valid. Parsers that do not recognize significance may use `presence: "unknown"`, preserve raw markers, and create a Review issue.
