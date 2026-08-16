# Two-Layer Scan and Golden Validation Revision Log

**Date:** 14 August 2026
**Status:** Confirmed product and architecture revision

## Scope

- `02_Data_and_JSON_Specification_v1.1.md`
- `06_Python_Technical_Architecture.md`
- `PoC/Golden_Annotation_Template.xlsx`
- `parser_poc/`

## Confirmed Decisions

1. Generic Tab Book recognition uses two AI layers. Layer 1 receives only a compact, factual Sheet Outline and proposes coarse candidate ranges; Layer 2 receives Detail Windows and proposes exact physical regions.
2. Python does not propose table boundaries, question rows or Base rows before AI review. It retains the original workbook, builds neutral summaries, re-reads the proposed source coordinates and is the final validation authority.
3. Layer 1 favours recall. Its statuses are `complete`, `needs_more_context`, `ambiguous` and `not_a_table`; unclassified content records a constrained reason.
4. A Detail Window uses at most six position-based samples per non-empty row. Context, candidate grouping and token limits are configuration. Continuation is bounded to 100 rows per side and two requests in total.
5. Layer 2 returns absolute Excel coordinates. Non-significance regions must not overlap; Header/data significance overlap is allowed only with an explicit layout.
6. Python outcomes are `accepted`, `adjusted`, `rejected` and `review_required`. Automatic adjustment is limited to low-risk physical corrections and never makes business guesses or inherits Base information.
7. The AI boundary is provider-neutral through a structured-generation adapter. Model selection remains configurable and must be judged by structured-output reliability, privacy controls, cost and Golden outcomes.
8. The first Golden suite contains 20-30 annotated physical tables. Initial gates are 100% Layer 1 coverage, at least 95% Layer 2 final exact-structure accuracy, zero incorrect auto-accepts and at most 10% `review_required`.

## Golden Template Update

`Table_Annotation` now includes:

- `Significance_Layout`
- `Expected_Outline_Status`
- `Expected_Validation_Result`
- `Header_Depth`
- `Has_Explicit_Base`

The existing example is populated as a two-level table with an explicit Base, no significance layout, expected Outline status `complete` and expected validation outcome `accepted`.

## PoC Update

The offline workbook scanner remains AI-free. Its Outline default is now a configurable 64k-token target with a 70k hard limit, allowing a long-context first pass while retaining lower limits for cost or provider experiments.
