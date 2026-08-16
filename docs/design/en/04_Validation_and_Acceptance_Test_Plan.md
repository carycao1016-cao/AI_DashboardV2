# AI Research Dashboard Platform
## Validation & Acceptance Test Plan

**Document ID:** `04_Validation_and_Acceptance_Test_Plan`  
**Version:** v1.0  
**Status:** Initial QA, UAT and release-gate specification  
**Date:** 13 August 2026  
**Related documents:**  
- `01_AI_Research_Dashboard_PRD_MVP_v1.2.md`  
- `02_Data_and_JSON_Specification_v1.1.md` 
- `03_UX_Flow_and_Prototype_Specification_v1.1.md` 

---

## 1. Purpose

This document defines how the AI Research Dashboard Platform will be validated before MVP release and before each client-facing Dashboard publication.

It covers:

- Excel Tab Book extraction accuracy.
- Table-boundary detection.
- Header, Banner, Market and Wave mapping.
- Base recognition.
- Official metric recognition.
- Official significance interpretation.
- Tab-derived calculations.
- Semantic classification.
- Dashboard generation.
- Insight evidence and wording.
- English, Chinese and mixed-language behavior.
- New-Wave updates.
- Replacement of incorrect data.
- Hosted HTML, PDF and PPT outputs.
- Client access and read-only AI questions.
- Security, performance and graceful degradation.

The plan serves four purposes:

1. Define engineering QA requirements.
2. Define Golden Tab Book regression tests.
3. Define Creator UAT scenarios.
4. Define client publication gates.

---

## 2. Quality Philosophy

### 2.1 Accuracy before automation

The product must prioritize:

```text
Numeric Accuracy
-> Header and Scope Accuracy
-> Traceability
-> Low-cost Review
-> Dashboard Automation
-> Insight
-> Client AI Experience
```

A visually polished Dashboard is not acceptable when a value is assigned to the wrong Market, Wave, Banner, Brand, Product, Concept or Base.

### 2.2 Different errors have different severity

Examples:

- Wrong short title: low business risk.
- Wrong research-module classification: medium workflow risk.
- Wrong Base: high analytical risk.
- Correct number under the wrong header: critical client risk.
- Unavailable result displayed as 0%: critical interpretation risk.

### 2.3 Published content has stricter requirements than extracted content

The platform may retain unresolved optional tables in Data Explorer while publishing a verified Core Dashboard.

Only content included in a Published Release must meet all relevant release gates.

### 2.4 AI quality is evaluated separately from deterministic quality

Deterministic quality includes:

- Excel value extraction.
- Formula-cache reading.
- Number-format interpretation.
- Derived arithmetic.
- Source Lineage.
- Publication permission.

AI-assisted quality includes:

- Semantic classification.
- Template recommendation.
- Short titles.
- Module suggestions.
- Chart recommendations.
- Insight wording.
- Translation.

AI failure must not invalidate deterministic success.

---

## 3. Test Levels

### 3.1 Unit testing

Tests individual Python functions and validation models.

Examples:

- Excel percentage parsing.
- Availability-symbol normalization.
- Difference calculation.
- Relative-change calculation.
- Funnel-comparability evaluation.
- JSON Schema validation.
- Translation fallback.

### 3.2 Component testing

Tests one service or subsystem.

Examples:

- Workbook Scanner.
- Table Detector.
- Header Parser.
- Semantic Classifier.
- Dashboard Planner.
- Insight Validator.
- Published Package Builder.

### 3.3 Contract testing

Verifies that APIs and JSON objects conform to the schemas defined in Document 02.

### 3.4 Integration testing

Tests connected services.

Examples:

```text
Workbook Parser
-> Extraction JSON
-> Semantic JSON
```

```text
Semantic Model
-> Dashboard Plan
-> Hosted Dashboard Data
```

### 3.5 End-to-end testing

Tests complete Creator and Client journeys using real representative Tab Books.

### 3.6 Regression testing

Runs Golden Tab Books and Golden JSON fixtures against every parser, semantic-model or rendering change.

### 3.7 User acceptance testing

Experienced DP and Research users validate:

- Whether the system interpretation is acceptable.
- Whether correction is efficient.
- Whether the Dashboard is client-ready.
- Whether evidence and risk warnings are understandable.

---

## 4. Test Environments

### 4.1 Local development

Used for:

- Unit tests.
- Parser debugging.
- JSON validation.
- Golden fixture development.

### 4.2 Integration environment

Used for:

- Service integration.
- AI-provider integration.
- Asynchronous processing.
- Object-storage behavior.
- Export generation.

### 4.3 UAT environment

Used by DP / Research pilot users with representative confidential or appropriately anonymized projects.

### 4.4 Production environment

Production release requires:

- Approved deployment package.
- Database migration validation.
- Smoke tests.
- Share-link security test.
- Rollback readiness.

### 4.5 Test-data separation

- Synthetic test data may be used for public or development fixtures.
- Confidential client workbooks must remain in approved environments.
- Production client data must not be copied into uncontrolled development environments.

---

## 5. Golden Tab Book Test Library

### 5.1 Purpose

The Golden Tab Book library is the source of truth for extraction and interpretation regression.

Each Golden Workbook must include:

- Original Excel file.
- Expected workbook structure.
- Expected table boundaries.
- Expected header hierarchy.
- Expected Base.
- Expected official values.
- Expected significance.
- Expected Market and Wave.
- Expected Semantic JSON.
- Expected Dashboard-ready results.
- Known acceptable ambiguities.

### 5.2 Golden Book categories

#### G01 - Simple single-table sheet

- One Sheet.
- One table.
- Single-level header.
- Percentage only.

#### G02 - Multiple tables on one Sheet

- Blank-row separators.
- Repeated question title.
- Multiple Bases.

#### G03 - Multi-level Banner

- Market.
- Gender.
- Age.
- Column significance letters.

#### G04 - Count and Percentage variants

- Separate Count table.
- Separate Percentage table.
- One semantic question.

#### G05 - Distribution + Mean + Box Score

- Seven-point distribution.
- Mean.
- T3B.
- B3B.
- Different display formats.

#### G06 - Multiple-response and Net

- Percentages total above 100%.
- Official Net.
- Other and None.

#### G07 - Brand loop

- Same Brands across several questions.
- Different codes and row orders.

#### G08 - Multiple Markets

- Market in file name.
- Market in Sheet title.
- Market in multi-level headers.

#### G09 - Multiple Waves

- Separate files.
- Separate Sheets.
- Current / Previous labels.

#### G10 - Official significance

- Uppercase letters.
- Lowercase letters.
- Superscript markers.
- Asterisk.
- Footnote confidence level.

#### G11 - Complex Quantum formatting

- Merged cells.
- Repeated page header.
- Styled blank rows.
- Hidden rows or columns.

#### G12 - Dimensions-style output

- Distinct title and Base placement.
- Multiple table variants.

#### G13 - Chinese Tab Book

- Chinese question text.
- Chinese option labels.
- English Brand names.
- Chinese Base and notes.

#### G14 - Mixed-language Tab Book

- English questions.
- Chinese answers.
- English technical notes.
- Bilingual Sheet names.

#### G15 - New-Wave option added

- Wave 2 contains a new option.
- Wave 1 displays `-`.
- No false change calculation.

#### G16 - Option renamed

- One-to-one label change.
- Creator confirms Canonical Mapping.

#### G17 - Option split or merged

- Direct historical trend disabled.
- No aggregate sum attempted.

#### G18 - Base changed

- Same question, different Base definition.
- Trend comparison blocked or reviewed.

#### G19 - Corrected file replacement

- Old and corrected values.
- Same structure.
- Mapping reuse expected.

#### G20 - Structural replacement

- Corrected file changes Sheet, row and column locations.
- Semantic Mapping remains reusable.

### 5.3 Golden Book minimum launch set

The MVP release candidate should include at least:

- 5 representative Quantum workbooks.
- 3 representative Dimensions workbooks.
- 2 mixed custom Excel Tab Books.
- 2 Chinese or mixed-language workbooks.
- 2 Tracking update cases.
- 2 Replace Data cases.

The final count may increase after pilot discovery.

---

## 6. Truth Dataset Structure

Each Golden Workbook should have a machine-readable truth package.

```text
fixtures/
  G03_multi_level_banner/
    input.xlsx
    workbook_truth.json
    extracted_tables_truth.json
    semantic_truth.json
    published_results_truth.json
    dashboard_expectations.json
    notes.md
```

### 6.1 Truth annotation requirements

For every selected truth result:

- Workbook.
- Sheet.
- Cell or range.
- Question number.
- Header path.
- Row label.
- Raw value.
- Display value.
- Metric type.
- Base.
- Market.
- Wave.
- Significance.
- Availability.

### 6.2 Truth ownership

- Initial annotation: trained QA or DP analyst.
- Second review: independent DP or Research reviewer.
- Disagreement: adjudicated and documented.

Truth data must not be created solely from the system output being tested.

---

## 7. Accuracy Metrics

### 7.1 Table Detection Precision

```text
Correctly detected tables / all detected tables
```

### 7.2 Table Detection Recall

```text
Correctly detected tables / all true tables
```

### 7.3 Numeric Extraction Accuracy

```text
Correctly extracted tested values / all tested values
```

Comparison uses raw precision and display value where applicable.

### 7.4 Header Mapping Accuracy

```text
Values assigned to the correct full header path / all tested values
```

### 7.5 Base Recognition Accuracy

Evaluate separately:

- Base row detection.
- Base value extraction.
- Base-definition classification.

### 7.6 Metric Recognition Accuracy

Evaluate:

- Count.
- Percentage.
- Mean.
- Box Score.
- Net.
- Rank.
- Index.

### 7.7 Significance Mapping Accuracy

```text
Correct comparison direction and target / all tested significance markers
```

### 7.8 Semantic Module Accuracy

Measured as recommendation acceptance and reviewer agreement, not treated as the same criticality as numeric accuracy.

### 7.9 Published Dashboard Accuracy

```text
Correct published values with correct scope and unit / all audited published values
```

This is the most important end-to-end metric.

---

## 8. Proposed MVP Quality Thresholds

The following are proposed release thresholds for the Golden test set. They should be calibrated after pilot testing, but published-content requirements must remain strict.

### 8.1 Parser-level targets

- Numeric extraction: at least 99.9% across verified Golden values.
- Header mapping: at least 99.5% across verified Golden values.
- Table-boundary F1: at least 98% on certified launch formats.
- Base-value extraction: at least 99.5%.
- Official significance relation accuracy: at least 99% on supported formats.

### 8.2 Publication requirement

For every Published Release:

- 100% of published values have Source Lineage.
- 100% of unresolved Data Blocking issues are zero.
- 100% of displayed significance is official and mapped.
- 100% of published derived metrics pass required comparison validation.
- 100% of published Insight references supporting results.

### 8.3 Semantic targets

- Primary research-template recommendation accepted or easily corrected in at least 85% of pilot projects.
- Suggested module acceptance measured by module type.
- Chart recommendation acceptance measured but not used as a numeric release blocker.

---

## 9. Table Boundary Test Cases

### TB-001 Single table

**Given:** One title, one header, one Base and one data block.  
**Expected:** One table with correct title, header, Base, data and footnote ranges.

### TB-002 Multiple tables separated by blank rows

**Expected:** Separate tables; no merging across separators.

### TB-003 Styled blank rows

**Expected:** Formatting-only blank rows do not create false data rows.

### TB-004 Repeated page header

**Expected:** Repeated header inside a long table is removed from data rows and retained as a repeated-header artifact.

### TB-005 Merged title cells

**Expected:** Full merged title text assigned to the table.

### TB-006 No obvious separator

**Expected:** Rules use title pattern, Base repetition and header changes to identify boundaries; uncertain cases go to Review.

### TB-007 Hidden row

**Expected:** Hidden row is retained in evidence and handled according to content; not silently discarded.

### TB-008 Footnote contains numbers

**Expected:** Footnote percentages or confidence levels are not treated as result rows.

### TB-009 Table across Sheets

**Expected:** MVP should flag unsupported cross-Sheet continuation unless a supported layout rule exists; must not silently combine unrelated tables.

---

## 10. Header and Banner Test Cases

### HB-001 Single-level header

Expected full path:

```text
Total
Male
Female
```

### HB-002 Three-level header

Expected:

```text
US -> Gender -> Male
US -> Gender -> Female
UK -> Gender -> Male
UK -> Gender -> Female
```

### HB-003 Repeated category labels

`Male` under US and `Male` under UK must remain distinct full paths.

### HB-004 Significance letters in headers

Column comparison code must map to the correct category ID.

### HB-005 Market conflict

File name says Wave 3 while table header says Wave 2.

Expected:

- Conflict issue.
- No silent selection.
- Review required before publishing affected content.

### HB-006 W1 / W2 are segments, not Waves

Expected:

- AI may propose Wave interpretation.
- User correction stored as Project rule.
- Future matching respects the correction.

### HB-007 Unsupported combination

Tab has separate Market and Gender columns but no Market × Gender.

Expected:

- Individual views available.
- Combined filter disabled.
- No estimate.

---

## 11. Value and Number-Format Test Cases

### VF-001 Excel decimal percentage

Stored `0.4532`, displayed `45.3%`.

Expected:

- Raw value: `0.4532`.
- Display: `45.3%`.
- Unit: Percentage.

### VF-002 Text percentage

Cell text `45%`.

Expected:

- Parsed as Percentage with precision source `text_parsed`.
- Original text retained.

### VF-003 Mean

Stored `4.25`, displayed `4.3`.

Expected:

- Raw value retained.
- Dashboard format applied separately.

### VF-004 Formula with cached value

Expected:

- Formula retained.
- Cached value used when available.
- Missing cache yields a processing warning, not an invented result.

### VF-005 Zero

`0%` remains zero.

### VF-006 Unavailable symbol

`-`, `—`, blank or suppression marker must not automatically become zero.

### VF-007 Very small value

Stored `0.003`, displayed as integer percentage.

Expected client display may be `<1%` under the configured rule.

### VF-008 Currency

Expected unit and currency symbol retained separately.

### VF-009 Large Base

`n=1,250` preserves numeric Base `1250` and display formatting.

---

## 12. Metric Recognition Test Cases

### MR-001 Count + Percentage variants

Expected:

- One semantic question.
- Two official metric variants.
- No duplicate Dashboard page by default.

### MR-002 Seven-point question with Mean and T3B

Expected:

- T3B recommended where template rules specify.
- Mean available.
- Individual points hidden from Core Dashboard by default.
- Distribution remains in Data Explorer.

### MR-003 Seven-point question without T3B

Expected:

- T3B not available.
- AI cannot create it.
- Mean or distribution may be recommended.

### MR-004 Multiple-response Net

Expected:

- Official Net recognized.
- Net is not recalculated from rounded child percentages.

### MR-005 NPS supplied

Expected:

- Official NPS displayed.
- No recalculation from Promoter/Passive/Detractor distribution in MVP unless it is already supplied as an official Tab result.

### MR-006 Pricing result supplied

Expected:

- Official price-point result displayed.
- No PSM or Gabor-Granger calculation created.

---

## 13. Base Test Cases

### BA-001 One Base for all series

Expected concise Base display.

### BA-002 Different Bases by Concept

Expected per-series Base or Base table. One shared Base is forbidden.

### BA-003 Same `n`, different definitions

Expected:

- Definitions recognized as different.
- Conversion or trend may require review.

### BA-004 Unknown weighted status

Expected:

- Do not label as weighted or unweighted without evidence.

### BA-005 Base changes across Waves

Expected:

- Trend values may display separately.
- Difference and Insight blocked until comparability decision.

### BA-006 Tab low-Base warning

Expected:

- Warning preserved.
- Insight priority reduced.
- Client display follows Creator-approved warning mode.

---

## 14. Significance Test Cases

### SG-001 Uppercase comparison letters

Expected correct target mapping.

### SG-002 Lowercase letters

Expected separately interpreted when the Table footnote defines a different confidence level.

### SG-003 Superscript marker

Expected marker extraction without changing numeric value.

### SG-004 Font-color significance

Expected only if the format is in the supported significance parser; otherwise Review.

### SG-005 Confidence level missing

Expected:

- Marker retained.
- Confidence level null.
- Review required if client significance is enabled.

### SG-006 Derived Wave difference without official test

Expected:

- Display `+5pp`.
- Significance status `not_available`.
- Insight cannot say `significant`.

### SG-007 Derived Funnel Conversion

Expected:

- No significance inheritance from its two input stages.

---

## 15. Derived Calculation Test Cases

### DC-001 Percentage-point difference

```text
Wave 1: 40.44%
Wave 2: 45.36%
Expected raw difference: 4.92 percentage points
Expected display under 0pp rule: +5pp
```

### DC-002 Relative change

```text
(50% - 40%) / 40% = 25%
```

Expected unit is Relative Percentage Change, not Percentage Points.

### DC-003 Previous value is zero

Expected:

- Relative change unavailable or handled by explicit configured rule.
- No divide-by-zero error.

### DC-004 Mean difference

Expected unit is Mean Difference.

### DC-005 Index to Total

Expected validation of Segment and Total scope.

### DC-006 Funnel Conversion with same Base

Expected calculation when all conditions pass.

### DC-007 Funnel second stage already uses conditional Base

Expected:

- System detects possible double-conversion risk.
- Review required.

### DC-008 Different Brand or Market

Expected Not Comparable.

### DC-009 Rounded-input precision

If only displayed integers exist, calculation precision is `displayed_values_only`.

---

## 16. Availability and Missing-Data Test Cases

### AV-001 New option in Wave 2

Expected:

- Wave 1 display `-`.
- Wave 2 value shown.
- No `0 to 18%` Insight.
- No ranking-change calculation.

### AV-002 Removed option

Expected:

- Review possible rename or omission.
- If confirmed removed, new Wave shows `-`.

### AV-003 Suppressed result

Expected:

- Client may see `-`.
- Internal cause remains `suppressed`.

### AV-004 Not applicable Market

Expected internal reason `not_applicable`.

### AV-005 Recognition pending

Expected internal Draft warning; cannot enter released client package.

### AV-006 Zero versus unavailable

Expected visible distinction:

- Zero: `0%`.
- Unavailable: `-`.

---

## 17. Semantic and Template Test Cases

### ST-001 Brand Tracking

Expected detection of common modules:

- Awareness.
- Funnel.
- Imagery.
- Usage.
- Intent.
- Barriers.
- Channels.

### ST-002 Concept Test

Expected KPI scorecard and diagnostics suggestions.

### ST-003 Product Test

Expected Overall Liking, Product Comparison and Attribute modules.

### ST-004 CSAT / NPS

Expected official NPS and Satisfaction modules; no Driver Analysis.

### ST-005 Packaging Test

Expected Package Evaluation suggestion.

### ST-006 Pricing Results

Expected descriptive Pricing Results template; no advanced pricing model.

### ST-007 Mixed study

Product Test plus Packaging and Pricing modules.

Expected:

- Primary template and additional modules.
- No forced single-template restriction.

### ST-008 Incorrect template recommendation

Expected:

- Creator can change template.
- Extraction remains unchanged.
- Dashboard Plan regenerates without losing verified mapping.

---

## 18. Multi-table Module Test Cases

### MM-001 Same metric across Waves

Expected auto-combination at high confidence.

### MM-002 Same metric across Markets

Expected Market Comparison.

### MM-003 Brand Funnel suggestion

Expected structured preview before combination.

### MM-004 Base-mismatch Funnel

Expected chart available, Conversion blocked.

### MM-005 Brand Imagery from several question groups

Expected source lineage retained for every statement.

### MM-006 Creator removes one Funnel stage

Expected module and dependent Conversion recalculated; unaffected mappings retained.

### MM-007 Previous-Wave confirmed module

Expected automatic reuse for compatible new-Wave tables.

---

## 19. Dashboard Generation Test Cases

### DG-001 Core + Suggested Pages

Expected:

- Concise Core Dashboard.
- Additional candidates under Suggested Pages.
- Suggested Pages not client-visible by default.

### DG-002 Chart recommendation

Percentage ranking should not default to an unsuitable pie chart.

### DG-003 Trend recommendation

Three Waves should support a standard vertical Line Chart.

### DG-004 Two-Wave trend

Slope Chart may be recommended; Creator may select grouped bars or a Line Chart.

### DG-005 Large imagery matrix

Heatmap recommended; chart crowding warning if using grouped bars.

### DG-006 Creator-confirmed chart

New Wave must not silently replace it with AI default.

### DG-007 Grid layout

Visuals may use supported spans only. No overlap or free pixel drift.

### DG-008 Unsupported filter on one visual

Expected:

- Supported visuals update.
- Unsupported visual shows Data unavailable.
- No Total fallback.

---

## 20. Insight Test Cases

### IN-001 Highest result

Statement and number match evidence.

### IN-002 Wave difference

Correct unit `pp`.

### IN-003 Official significance

Use `significant` only when official significance exists.

### IN-004 Unsupported causality

Draft phrase `driven by` should be warned or rejected without supporting analysis.

### IN-005 Low-Base finding

Expected lower priority and warning.

### IN-006 Creator-edited wording remains valid

New Wave validates and retains wording.

### IN-007 Numeric refresh

Updated number causes suggested correction.

### IN-008 No longer supported

Insight removed from new release eligibility.

### IN-009 English and Chinese Insight

Both versions reference identical supporting result IDs.

### IN-010 Translation changes claim strength

If Chinese translation incorrectly adds `显著`, publication must be blocked or warned because the English/evidence does not support it.

---

## 21. Bilingual and Localization Test Cases

### LO-001 Interface switching

Switch English to Chinese.

Expected:

- Same route.
- Same Project.
- Same filters.
- Same numbers.
- Translated interface labels.

### LO-002 Dashboard title switching

Expected same visual and metric IDs with localized display text.

### LO-003 Missing Chinese page title

Expected:

- Internal missing-translation status.
- Bilingual publication blocked if page is client-visible and fallback policy forbids it.

### LO-004 Approved fallback

Expected English source label shown when configured fallback permits it.

### LO-005 Mixed-language Tab

Expected original cell text preserved; mixed language is not itself an extraction error.

### LO-006 Chinese Base wording

Expected correct Base identification and no missing glyphs.

### LO-007 Brand names

English Brand names may remain unchanged in Chinese interface unless a Creator-approved Chinese Brand name exists.

### LO-008 Terminology reuse

Creator confirms:

```text
Aided Awareness = 提示后品牌知名度
```

Expected reuse across pages and later Waves.

### LO-009 Client recommended questions

Questions and answers switch language while referencing the same evidence.

### LO-010 Chinese PDF

Expected:

- Correct glyphs.
- No font substitution failure.
- No clipped labels.

### LO-011 Chinese PPT

Expected correct text rendering in Snapshot.

### LO-012 Separate-language exports

Expected English and Chinese exports use the same numeric release data.

### LO-013 Long English label versus Chinese label

Expected responsive layout and export pagination remain readable.

### LO-014 Translation audit

Creator edit creates audit record with old and new text.

### LO-015 Source-language evidence

Data Explorer displays both current localized label and original source label.

---

## 22. Creator AI Test Cases

### CA-001 Presentation request

```text
Change this to a line chart.
```

Expected Preview and reversible change.

### CA-002 Project-wide rating display rule

```text
Use T3B and Mean only for all 7-point questions.
```

Expected scope choices and no creation of missing T3B.

### CA-003 Module change

```text
Combine B1, B2, B4 and B5 into a Funnel.
```

Expected structured module preview.

### CA-004 Mapping intent

```text
Current means Wave 2.
```

Expected Review Panel; no direct mapping mutation.

### CA-005 Unsupported calculation

```text
Add scores 5, 6 and 7 into a new T3B.
```

Expected refusal or scope limitation in MVP.

### CA-006 Bulk change

Expected affected-object count and scope choice.

### CA-007 Undo

Presentation change can be undone without altering source mapping.

---

## 23. Client AI Test Cases

### CL-001 Page summary

Expected answer limited to Published Data Package.

### CL-002 Wave comparison

Without previous Wave, the question should not be offered.

### CL-003 Unsupported combination

Expected explicit unavailable response, no estimate.

### CL-004 Request to modify Dashboard

Expected read-only limitation message.

### CL-005 Request to modify Mapping

Expected refusal and no action.

### CL-006 Internal data request

Expected no access.

### CL-007 Source chart link

Expected navigation to the supporting visual.

### CL-008 Language switching

English and Chinese answers use same supporting result IDs.

### CL-009 Significance wording

No official test means no significant claim.

### CL-010 Suspended release

Client AI is unavailable with the Dashboard.

---

## 24. New-Wave Update Test Cases

### WU-001 Structurally identical new Wave

Expected:

- Safe update.
- New Draft.
- Existing Published Release unchanged.
- Mapping and design reused.

### WU-002 New ordinary option

Expected automatic addition to compatible detailed visual.

### WU-003 New Brand

Expected:

- Detailed page may include it.
- Executive Overview requires a proposal if it changes priority scope.

### WU-004 New question

Expected Suggested Page or module proposal.

### WU-005 Changed question wording

Expected comparison review.

### WU-006 Changed Base

Expected difference and trend Insight blocked.

### WU-007 Changed Age bands

Expected no automatic historical combination.

### WU-008 Existing Creator chart

Expected preserved unless incompatible; suggestion only.

### WU-009 Existing Creator Insight

Expected validation states.

### WU-010 New Wave in bilingual Project

Expected inherited confirmed terminology and titles.

---

## 25. Replace Data Test Cases

### RD-001 Mapping complete, Dashboard not created

Expected:

- New source version.
- Mapping Migration Report.
- Compatible mapping reused.
- Unmatched items reviewed.

### RD-002 Dashboard complete, not published

Expected:

- Existing design retained.
- New Draft data refreshed.
- Insight revalidated.

### RD-003 Dashboard already published

Expected:

- Existing release remains visible unless Creator suspends it.
- New corrected Draft created.
- Published release not mutated.

### RD-004 Same structure, values change

Expected high Mapping reuse.

### RD-005 Cell locations change

Expected semantic mapping reused and Source Binding updated.

### RD-006 Base changes

Expected Review Required.

### RD-007 Table removed

Expected affected visual and Insight identified.

### RD-008 Significance changes

Expected client marker refresh in corrected Draft.

### RD-009 Export regeneration

Expected old exported files remain historical; new files created for corrected release.

### RD-010 Rollback

Expected previous Published Release can become active without data mutation.

---

## 26. Publishing Test Cases

### PB-001 Clean publication

All gates pass; release created.

### PB-002 Unresolved Header Mapping

Expected publication blocked.

### PB-003 Significance unresolved but hidden

Expected possible publication if all other requirements pass and no dependent significant claim exists.

### PB-004 Unverified Funnel Conversion

Expected module may publish without Conversion.

### PB-005 Internal page accidentally selected

Expected publication gate blocks or removes Internal content.

### PB-006 Missing Chinese required translation

Expected bilingual release blocked.

### PB-007 View as Client parity

Expected live release matches preview.

### PB-008 Immutable release

Editing Draft does not change published client view.

### PB-009 Suspend

Expected temporary-unavailable page.

### PB-010 Revoke link

Expected link inaccessible while Project and release remain intact.

### PB-011 Expiry

Expected access stops at configured expiration.

### PB-012 Password

Expected secure validation; no plain password after creation.

---

## 27. Export Test Cases

### EX-001 Executive PDF

Expected approved Core pages and Insight only.

### EX-002 Full PDF

Expected approved Core, Detailed and selected Appendix.

### EX-003 Current language

Expected export language follows UI selection.

### EX-004 Explicit Chinese export

Expected Chinese labels and fonts.

### EX-005 Long Heatmap

Expected readable pagination or page-level adjustment.

### EX-006 Large table

Expected split with repeated header or controlled appendix layout.

### EX-007 No internal metadata

Expected no confidence, Source Cell, Review Note or JSON.

### EX-008 PPT Snapshot

Expected no clipped charts or missing glyphs.

### EX-009 Client download permission

Disabled format is not offered or accessible through direct URL.

### EX-010 Corrected release

Expected export references corrected release version.

---

## 28. Security Test Cases

### SC-001 Project isolation

Creator cannot access an unauthorized Project by guessing an ID.

### SC-002 Share token entropy

Tokens are non-sequential and sufficiently random.

### SC-003 Password handling

No plain-text storage or logging.

### SC-004 Link revocation

Revoked link becomes unusable immediately or within documented cache propagation time.

### SC-005 Source-file access

Client API cannot retrieve original workbook.

### SC-006 Internal API separation

Client cannot query Extraction JSON or Review issues.

### SC-007 Search-engine indexing

Hosted links send appropriate no-index controls.

### SC-008 Logging

Logs do not contain passwords, tokens or unnecessary raw cell contents.

### SC-009 AI data boundary

Client AI query cannot retrieve Draft or another Project's Published Data Package.

### SC-010 Permanent deletion

Requires authorized role and Audit Event.

---

## 29. Performance Test Cases

### PF-001 Standard workbook

Measure:

- Upload completion.
- Time to first Draft.
- Total processing time.

### PF-002 Large workbook

Test defined maximum Sheet, table and file size.

### PF-003 Concurrent processing

Multiple Projects process without cross-contamination or unacceptable queue delay.

### PF-004 Dashboard first load

Core page becomes usable before non-core pages are loaded.

### PF-005 Page navigation

No full Project reload.

### PF-006 Large table

Pagination or virtual scrolling remains responsive.

### PF-007 PDF generation

Runs asynchronously and does not block Dashboard viewing.

### PF-008 Client AI response

Response meets defined latency target or shows a clear processing state.

Specific numeric performance targets should be set after architecture benchmarking.

---

## 30. Graceful-Degradation Test Cases

### GD-001 Semantic AI unavailable

Expected:

- Extraction completes.
- Data Explorer available.
- Module classification shows Unclassified.
- Retry possible.

### GD-002 Insight generation unavailable

Expected Dashboard available without Insight.

### GD-003 Title generation unavailable

Expected Question Number + Original Table Title.

### GD-004 Chart recommendation unavailable

Expected deterministic default.

### GD-005 Export service unavailable

Expected Dashboard remains available; export job retry possible.

### GD-006 Partial Sheet failure

Expected successful Sheets proceed and failed Sheets enter Review.

### GD-007 AI returns invalid JSON

Expected schema validation rejects the response; controlled retry or fallback occurs.

---

## 31. Accessibility Test Cases

### AC-001 Keyboard navigation

All primary Creator and Client actions reachable.

### AC-002 Focus indicators

Visible in both dark and light regions.

### AC-003 Chart alternative

Accessible summary or data table available.

### AC-004 Color-independent status

Status has text/icon in addition to color.

### AC-005 Theme contrast

Invalid contrast produces a warning.

### AC-006 Language switch

Switcher has accessible name in both languages.

### AC-007 AI drawer

Focus is contained while open and returns correctly when closed.

### AC-008 Modal loader

Progress and stage are announced appropriately.

---

## 32. Quick Data Validation Sampling Rules

### 32.1 Minimum sample composition

A validation run should attempt to include:

- At least 3 Base results.
- At least 5 Percentage results.
- At least 2 Mean results when available.
- At least 2 Net or Box Score results when available.
- At least 2 significance examples when available.
- At least 2 complex headers.
- At least 2 Markets or Waves when available.
- At least 2 derived calculations when available.

### 32.2 Risk-weighted sampling

Increase probability for:

- Medium-confidence Header Mapping.
- New layout pattern.
- First table on each Sheet type.
- First instance of each table variant.
- Published Core Dashboard source.
- New or replacement file.

### 32.3 Pattern coverage

Do not sample 20 tables with the same simple structure while omitting all complex structures.

### 32.4 Creator outcome

Creator may:

- Confirm.
- Flag mismatch.
- Open source.
- Open Review Panel.
- Add comment.

A flagged pattern should generate a related-table review suggestion.

---

## 33. Publication Gate Requirements

### 33.1 Mandatory passing checks

- Every published result has Source Lineage.
- No open Data Blocking issue for published content.
- Numeric extraction is verified.
- Header and scope are verified.
- Market and Wave are resolved.
- Source conflicts are resolved.
- Published significance is official.
- Derived metrics meet Comparability requirements.
- Published Insight is evidence-supported.
- Internal content is excluded.
- Client permissions are valid.
- Required localization coverage is complete.

### 33.2 Conditionally allowed warning

Examples:

- Optional page title not Creator-reviewed.
- Significance unavailable but hidden.
- Suggested Page remains unreviewed and excluded.

### 33.3 Prohibited override

Creator cannot override:

- Wrong or unresolved Header Mapping.
- Missing Source Lineage.
- Source conflict.
- Unsupported client data combination.
- Unsupported significant claim.

---

## 34. Defect Severity

### Severity 1 - Critical

- Wrong published number.
- Correct number under wrong Header, Market, Wave or Brand.
- Unauthorized client data exposure.
- Client can modify Mapping or Dashboard.
- Published Release changes without republishing.
- Unavailable value displayed as zero.

Expected response:

- Block release or suspend affected production Dashboard.
- Immediate investigation.

### Severity 2 - High

- Wrong Base.
- Wrong official significance relationship.
- Invalid derived metric published.
- Replace Data overwrites history.
- Bilingual translation changes statistical meaning.

### Severity 3 - Medium

- Wrong semantic module.
- Poor chart recommendation.
- Suggested Page omitted.
- Translation missing in non-published internal content.

### Severity 4 - Low

- Minor spacing.
- Non-critical title wording.
- Optional tooltip inconsistency.

---

## 35. Defect Lifecycle

```text
New
-> Triaged
-> In Progress
-> Ready for Retest
-> Verified
-> Closed
```

Alternative states:

- Deferred.
- Duplicate.
- Cannot Reproduce.
- Accepted Limitation.

Critical Data defects cannot be closed as Accepted Limitation for published functionality.

---

## 36. Regression Strategy

### 36.1 On every commit

- Unit tests.
- Schema validation.
- Core calculation tests.
- Selected small Golden fixtures.

### 36.2 On pull request

- Component tests.
- Contract tests.
- Changed-parser Golden tests.
- Changed-Dashboard rendering tests.

### 36.3 Nightly

- Full Golden Workbook suite.
- End-to-end ingestion.
- Hosted Dashboard smoke test.
- English / Chinese snapshot test.

### 36.4 Release candidate

- Full suite.
- Performance benchmark.
- Security smoke test.
- Export visual inspection.
- Creator UAT.
- Production-like rollback drill.

---

## 37. Visual Regression Testing

### 37.1 Dashboard screenshots

Capture deterministic screenshots for:

- Core pages.
- Data-unavailable states.
- Significance display modes.
- English and Chinese.
- Client and Creator view.

### 37.2 PDF/PPT inspection

Automated checks:

- File exists.
- Expected page/slide count.
- No rendering failure.

Visual checks:

- No clipping.
- No overlap.
- No missing glyph.
- No unreadable legend.
- No Internal content.

### 37.3 Language snapshots

Each certified template should have at least one English and one Chinese visual-regression reference.

---

## 38. UAT Plan

### 38.1 Participants

Recommended pilot group:

- 2-3 experienced DP users.
- 2 Researchers or Project Owners.
- 1 Admin or Product Owner.

### 38.2 UAT projects

Include:

- Brand Tracking.
- Concept or Product Test.
- CSAT/NPS or Packaging.
- One multi-Market Project.
- One bilingual Project.
- One New-Wave update.
- One Replace Data scenario.

### 38.3 UAT tasks

Participants should:

1. Create Project.
2. Upload Tab Book.
3. Review Draft.
4. Complete Quick Validation.
5. Correct one mapping.
6. Build one multi-table module.
7. Change metric display.
8. Edit one Insight.
9. Review English and Chinese versions.
10. View as Client.
11. Publish Hosted Dashboard.
12. Export PDF.
13. Add a New Wave or Replace Data.

### 38.4 UAT feedback

Capture:

- Task completion.
- Time.
- Confidence in numeric accuracy.
- Number of times user returns to Excel.
- Confusing statuses.
- Missing controls.
- Client-readiness rating.

---

## 39. UAT Acceptance Criteria

MVP may proceed to wider pilot when:

- No open Severity 1 defects.
- No open unmitigated Severity 2 defects in core workflow.
- Golden parser thresholds are met for certified formats.
- All publication gates function correctly.
- Replace Data preserves compatible mapping and design.
- English and Chinese client views pass visual review.
- DP pilot users complete upload-to-publish without engineering assistance for supported workbooks.
- Published numeric audit finds no mismatch.
- Suspend and rollback drills succeed.

---

## 40. Template Certification

Templates should be labelled individually:

- Certified.
- Beta.
- Experimental.

### 40.1 Certified

- Golden project available.
- Module rules tested.
- Chart rules tested.
- English / Chinese tested.
- Insight rules tested.
- Client export tested.

### 40.2 Beta

- Common modules supported.
- Some edge cases require additional review.
- Clear Beta label shown to Creator, not necessarily client.

### 40.3 Experimental

Not recommended for external client publication without Product Owner approval.

---

## 41. Launch Readiness Checklist

### Product

- [ ] MVP scope frozen.
- [ ] Certified templates identified.
- [ ] Known limitations documented.

### Data and parsing

- [ ] Golden Workbook library complete.
- [ ] Truth packages independently reviewed.
- [ ] Parser thresholds passed.
- [ ] Source Lineage verified.

### Dashboard

- [ ] Core visual types validated.
- [ ] Unsupported-filter behavior validated.
- [ ] Base and significance display validated.
- [ ] Insight guardrails validated.

### Bilingual

- [ ] English UI reviewed.
- [ ] Chinese UI reviewed.
- [ ] Terminology dictionary reviewed.
- [ ] Mixed-language Tab tested.
- [ ] English and Chinese export tested.

### Publishing

- [ ] View as Client parity confirmed.
- [ ] Password and expiry tested.
- [ ] Suspend tested.
- [ ] Revoke tested.
- [ ] Rollback tested.

### Operations

- [ ] Monitoring and alerting enabled.
- [ ] Failed-job workflow documented.
- [ ] Data-replacement runbook complete.
- [ ] Security review complete.

---

## 42. Test Automation Priorities

### P0 automation

- Number parsing.
- Header hierarchy.
- Availability status.
- Derived calculations.
- Source Lineage.
- JSON Schema validation.
- Publication Gate.
- Published Package exclusion rules.
- Replace Data migration.
- Bilingual resource completeness.

### P1 automation

- Visual screenshot comparison.
- Full export regression.
- Recommended question tests.
- Advanced template module tests.

### Manual validation remains important for

- Research semantic reasonableness.
- Client-language quality.
- Chart usefulness.
- Insight tone.
- Complex unknown Tab formats.

---

## 43. Traceability Matrix

Every test case should link to:

- PRD requirement.
- Data/JSON object or rule.
- UX screen or interaction.
- Test case ID.
- Execution result.
- Defect ID, if failed.

Example:

```text
Requirement: Client cannot combine unavailable Banners
Data rule: AvailableCombinationMatrix
UX screen: Client Hosted Dashboard
Test case: HB-007
Result: Passed
```

---

## 44. Test Execution Report Template

```text
Test Cycle:
Build Version:
Parser Version:
Semantic Classifier Version:
Dashboard Renderer Version:
Environment:
Executed By:
Execution Date:

Total Test Cases:
Passed:
Failed:
Blocked:
Not Run:

Severity 1 Open:
Severity 2 Open:

Golden Numeric Accuracy:
Golden Header Accuracy:
Published Dashboard Audit Result:
English Visual Result:
Chinese Visual Result:

Release Recommendation:
- Approve
- Approve with conditions
- Reject
```

---

## 45. Recommended Test Data Governance

- Assign a data owner to each Golden Workbook.
- Record whether the fixture is synthetic, anonymized or confidential.
- Store confidential fixtures only in approved environments.
- Maintain a changelog for truth-data corrections.
- Require independent review when a Golden truth value changes.
- Do not alter a truth file simply to match system output.

---

## 46. Open Validation Decisions

- Final parser threshold by certified Tab format.
- Maximum launch workbook size.
- Maximum expected table count.
- Target time to first Draft.
- Number of Quick Validation samples by Project size.
- Languages beyond English and Simplified Chinese after MVP.
- Whether PDF/PPT visual regression is pixel-level or tolerance-based.
- Which Templates launch as Certified versus Beta.
- Which significance formatting styles are officially supported at launch.
- How long old replacement files remain recoverable.
- Production cache time for share-link revocation.

---

## 47. Recommended Next Document

The next document should be:

```text
05_UI_Frontend_Engineering_Specification.md
```

It should define:

- React front-end architecture.
- Kantar AI Colleague design tokens.
- Components and states.
- Dashboard grid implementation.
- AI drawer behavior.
- Creator and Client shells.
- English / Chinese localization implementation.
- Chart wrapper contracts.
- Accessibility.
- Responsive behavior.
- Front-end testing conventions.
