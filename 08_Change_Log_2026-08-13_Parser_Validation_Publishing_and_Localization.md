# Parser, Publishing and Localization Revision Log

**Date:** 13 August 2026  
**Status:** Confirmed product and architecture revision  
**Affected specifications:**

- `02_Data_and_JSON_Specification_v1.1.md`
- `06_Python_Technical_Architecture.md`

## Confirmed Decisions

1. Human Review is an exception path. Medium-confidence AI boundary proposals are accepted automatically only after deterministic boundary, Header, numeric, Base-where-present, significance-where-present and conflict validation; they receive higher Quick Data Validation sampling weight.
2. Every physical table owns its Header structure. MVP natively supports one to three Header levels; deeper Headers are preserved but cannot automatically power cross-table linking, Banner comparison, complex visuals or publication.
3. Tables without an explicit Base do not inherit a Base from adjacent tables or other Sheets. No Base is displayed. Such results cannot support Base-dependent calculations, comparisons or significance interpretation.
4. Automatic Count/Percentage/significance variant merging is strict: table title, question number, normalized option content, complete Header paths, Market, Wave and Base must match exactly. Sheet position, formatting and fuzzy text similarity are not evidence.
5. In one verified physical table, repeating Count and Percentage rows may generate one combined extraction with separate metric source blocks.
6. Text normalization for strict matching is limited to whitespace, line-break/tab, full-width/half-width spaces, invisible characters and Unicode representation. It does not remove or change business characters.
7. `<1%` is represented as a non-calculable upper-bound constraint. `*` and `**` are retained as source qualifiers when their source notes support small-base meanings.
8. CSV source bytes are retained and decoding is confidence-scored. Low-confidence text is excluded from AI, identity matching and publication until a valid encoding is selected.
9. Publication excludes invalid results and dependent content while allowing all remaining verified Dashboard content to publish, unless a global gate fails, nothing publishable remains, or an excluded item is mandatory.
10. Creator-supplied translations take priority over AI drafts. AI translations may publish only after an explicit, auditable Creator choice accepting AI Draft content; protected tokens and source evidence are never translated.

## Validation and Publishing Effect

- Automatic parsing remains enabled for valid generic Tab structures, reducing routine manual Review.
- Statistical claims remain conservative: unresolved significance is hidden, and no direction is inferred.
- Cross-Sheet variant aggregation remains conservative: a mismatch keeps physical tables separate rather than risking a false merge.
- Bilingual delivery supports Chinese-source tables without making AI translation an unreviewed default publication path.
