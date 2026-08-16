# Initial Golden Annotation Change Log

**Date:** 14 August 2026
**Status:** Source-backed initial annotation set

## Added

- Added 10 Decipher `Counts` physical tables (`G002_T01` to `G002_T10`) from the original `Counts` Sheet.
- Added 10 Quantum alternating Count/Percentage physical tables (`G003_T01` to `G003_T10`) from the original `ban1%N` Sheet.
- Added `G002` and `G003` workbook metadata rows.
- Added three Cell Truth samples for each new table: explicit Base plus two source cells representing the table's normal metric structure.
- Correctly marked Decipher `S3` as a Mean/Median/Standard Deviation distribution table rather than an ordinary Count table.

## Deliberate Limits

- These are initial standard-table annotations, not a claim that all workbook formats are solved.
- The set intentionally does not cover complex significance-marker layouts, deeper Headers, cross-Sheet significance variants or ambiguous blocks. Those remain for the next user-supplied special cases.
- The existing `G001` annotation was preserved. Its blank Header continuation row is part of a merged Header layout and is not treated as a missing source row.
