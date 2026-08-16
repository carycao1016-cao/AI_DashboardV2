# AI Research Dashboard Platform
## Product Requirements Document (MVP)

**Document version:** v1.2  
**Status:** Consolidated draft  
**Date:** 13 August 2026  
**Primary users:** Creator (DP / Researcher / Project Owner), Admin  
**Primary input:** Quantum / Dimensions / other Excel Tab Books  
**Primary outputs:** Hosted HTML Dashboard, PDF, PPT Snapshot  
**Recommended backend:** Python  

> **Product thesis**  
> Convert non-standard market research Tab Books into traceable, reviewable and client-ready dashboards without requiring users to reformat files first.

---

## 1. Executive Summary

The product is an AI-powered market research dashboard platform. A Creator uploads an existing Excel Tab Book; the system identifies workbook structure, tables, questions, Base, banners, measures, markets, waves and official significance; converts the results into structured JSON; generates a reviewable Dashboard Draft; and enables the Creator to refine and publish a hosted HTML dashboard for clients.

### 1.1 MVP core workflow

```text
Excel Tab Book
    -> automatic extraction
    -> Extraction JSON
    -> semantic interpretation
    -> Semantic JSON
    -> Dashboard Draft
    -> Creator review and adjustment
    -> Published Data Package
    -> Hosted HTML / PDF / PPT Snapshot
```

### 1.2 Product priority order

1. Numeric accuracy
2. Traceability
3. Low-cost review
4. Dashboard automation
5. Evidence-based Insight
6. Controlled client AI experience

---

## 2. Problem Statement

Current Quantum and Dimensions outputs vary by project, client, market, wave, banner and table specification. DP and Research teams spend substantial time identifying tables, mapping metrics, recreating charts and maintaining repeated dashboard updates.

Generic BI and chatbot products do not reliably understand market research concepts such as Base, Net, Box Score, Banner, brand loop, official significance and cross-wave comparability. A polished dashboard is not acceptable if the result cannot be traced back to the official Tab Book.

---

## 3. Product Goals and Non-goals

### 3.1 MVP goals

- Automatically recognize non-fixed-format Excel Tab Books.
- Generate a useful Dashboard Draft before the user reviews every table.
- Provide low-cost repair for low-confidence or conflicting recognition.
- Support multiple market research templates through one common engine.
- Publish read-only hosted HTML dashboards.
- Export PDF and PPT Snapshots.
- Support simple multi-wave comparison and safe Tab-derived calculations.
- Preserve Creator work when a wave file is updated or replaced.

### 3.2 MVP non-goals

- Respondent-level raw-data calculation.
- Recalculation of official significance tests.
- Creation of a new Net, Box Score or Banner combination not available in the Tab Book.
- Arbitrary respondent-level Cross-tab.
- Advanced pricing, driver, JAR penalty, segmentation, attribution or causal modelling.
- Automatic Power BI report generation.
- Fully editable PowerPoint charts.
- Full customer portal, SSO or row-level security.
- Client modification of Dashboard design or underlying mappings.

---

## 4. Users and Roles

### 4.1 Creator

DP, Researcher and Project Owner use one combined role in MVP. A Creator can complete the end-to-end workflow:

- Create projects and upload Tab Books.
- Review extraction and semantic recognition.
- Confirm structural mappings in a Review Panel.
- Select templates and refine the Dashboard.
- Review and edit Insights.
- Publish, suspend, replace and export Dashboards.
- Configure client-visible filters, view options and downloads.

### 4.2 Admin

- Manage users and system access.
- Manage system templates, themes and global settings.
- View and manage all projects.
- Manage storage, failed processing jobs and external share links.
- Apply retention and permanent-deletion policies.

### 4.3 Client Viewer

A client accesses a read-only Hosted HTML Dashboard using a share link, optional password and expiration date.

The client may:

- View published pages.
- Use Creator-approved filters.
- Switch among Creator-approved View Options.
- Use recommended AI questions against published data.
- Download PDF/PPT if enabled.

The client may not:

- Modify the Dashboard.
- Modify data mapping, Base, Market, Wave, Banner or significance.
- Create a new metric or Cross-tab.
- Access Draft, Internal, JSON or original Excel content.

---

## 5. MVP Research Templates

Templates are configuration-based recommendation packages rather than independent analysis engines.

### 5.1 Included templates

- Brand Tracking
- Concept Test
- Product Test
- Customer Satisfaction / NPS
- Packaging Test
- Pricing Results
- U&A / Category Study
- Campaign Evaluation
- Custom Dashboard

### 5.2 Template boundary

Every MVP template supports:

- Research-module detection.
- Suggested page structure.
- Chart recommendation.
- Existing Count, Percentage, Mean, Net and Box Score.
- Official significance supplied in the Tab Book.
- Safe Tab-derived comparison metrics.
- Basic descriptive Insight.

Advanced methods are deferred, including pricing modelling, Driver Analysis, JAR Penalty, LCA, segmentation and campaign attribution.

### 5.3 Mixed studies

A project may use:

- One primary research template.
- Additional modules from another template.
- Custom modules.

Example:

```text
Primary template: Product Test
Additional modules: Packaging Evaluation + Pricing Results
```

---

## 6. End-to-End User Flow

1. Creator creates a project and uploads one or more Excel Tab Books.
2. Python backend starts an asynchronous workbook-recognition job.
3. System detects sheets, table boundaries, titles, headers, Base, data rows and footnotes.
4. System generates Extraction JSON.
5. AI and deterministic rules generate Semantic JSON.
6. System immediately creates a Core Dashboard Draft plus Suggested Pages.
7. System generates Review Summary and Quick Data Validation.
8. Creator fixes material issues through Review Panel.
9. Creator adjusts metrics, charts, layout, titles, colors and Insight.
10. Creator opens **View as Client**.
11. Creator publishes an immutable Published Release.
12. System generates a Hosted HTML link and optional PDF/PPT output.

---

## 7. Core Product Data Model

The system must separate source data, semantic definitions, Dashboard design and published releases.

### 7.1 Core objects

- `Project`
- `SourceFileVersion`
- `ExtractedTable`
- `SemanticMetric`
- `AnalysisModule`
- `Dashboard`
- `DashboardDraft`
- `PublishedRelease`
- `ShareLink`

### 7.2 Modelling principle

> Semantic Mapping follows the research metric; Source Binding follows the file version.

For example, `B2 = Aided Awareness` may remain unchanged while the corresponding Excel cell moves from `Sheet1!F18` to `Awareness!G22` in a replacement file.

### 7.3 One project may contain multiple Dashboards

The data model should support:

- Client Executive Dashboard
- Full Research Dashboard
- Market-specific Dashboard
- Internal validation Dashboard

The MVP UI may default to one Dashboard, but the backend should not enforce a one-project-to-one-dashboard relationship.

---

## 8. Tab Understanding Requirements

### 8.1 Workbook recognition

The system should detect:

- Workbook and file metadata.
- Visible and hidden sheets.
- Used ranges.
- Contents, Banner, Weight and technical sheets.
- Market and Wave cues.
- Quantum / Dimensions layout characteristics.

### 8.2 Table boundary recognition

The system should identify:

- Table start and end.
- Title and question text.
- Subtitle.
- Header rows.
- Base rows.
- Data rows.
- Footnotes.
- Repeated page headers.
- Multiple tables on one sheet.

### 8.3 Header hierarchy

The system should retain full hierarchy, for example:

```text
US
  -> Gender
      -> Male
      -> Female
  -> Age
      -> 20-29
      -> 30-39
```

### 8.4 Metric recognition

The MVP recognizes official Tab metrics:

- Count
- Percentage
- Weighted Percentage
- Mean
- Median
- Standard Deviation
- Top Box
- Top N Box
- Bottom N Box
- Net
- Index
- Rank
- Difference
- Official Significance

The system recognizes a supplied T3B but does not recreate T3B from rounded 1-7 score rows.

### 8.5 Table variants

Count, Percentage, Weighted Percentage, Mean and Significance tables for the same question should be treated as variants of one semantic question, not as unrelated questions.

### 8.6 Duplicate question numbers

Internal table identity must consider:

```text
Question Number
+ Table Title
+ Base
+ Metric Type
+ Market
+ Wave
+ Banner Set
+ Row Structure
```

---

## 9. JSON Layers

### 9.1 Extraction JSON

Stores physical workbook evidence:

- Workbook and Sheet.
- Table Range.
- Raw value.
- Excel display value.
- Formula result.
- Number format.
- Merged cells.
- Style and significance marker.

### 9.2 Semantic JSON

Stores interpreted meaning:

- Question number and text.
- Metric type.
- Base.
- Market and Wave.
- Banner hierarchy.
- Research module.
- Brand / Concept / Product.
- Availability and comparability status.
- Field-level confidence.

### 9.3 Analysis Module JSON

Stores one or more source tables combined into a business module, such as:

- Brand Funnel
- Brand Imagery
- Concept Scorecard
- Product Performance
- Purchase Journey

### 9.4 Dashboard Plan JSON

Stores:

- Pages.
- Modules.
- Visuals.
- Metrics.
- Layout.
- Filters.
- View Options.
- Client visibility.
- Theme.

### 9.5 Published Data Package

The client AI and Hosted Dashboard may query only:

- Approved pages.
- Approved charts.
- Approved official metrics.
- Verified derived metrics.
- Approved filters and Banner results.
- Approved Insights.
- Client-visible technical definitions.

---

## 10. Mandatory P0 Reliability Controls

### 10.1 Quick Data Validation

The system automatically samples representative results:

- Base
- Percentage
- Mean
- Net / Box Score
- Significance
- Complex header
- Multiple Market / Wave
- Derived difference

The Review screen compares:

```text
Original Excel -> Structured Result -> Dashboard Result
```

A failed pattern may trigger batch review for structurally similar tables.

### 10.2 Field-level confidence

Confidence must be recorded separately for:

- Table boundary
- Numeric extraction
- Header mapping
- Question number
- Metric type
- Research module
- Base definition
- Significance mapping

Risk classes:

- **Data Blocking:** numeric extraction, header mapping, Market/Wave conflict.
- **Analysis Blocking:** Base comparability for Funnel Conversion.
- **Publishing Warning:** significance unresolved but hidden from client view.
- **Optional Review:** display title or module classification.

### 10.3 Replace Data instead of Hard Delete

A corrected Wave should create a new `SourceFileVersion`. Compatible mappings and Dashboard configuration are migrated; the old version remains replaced or archived for audit and rollback.

### 10.4 View as Client + Suspend / Rollback

Before publishing, the Creator previews the exact client experience. After publishing, the Creator may:

- Suspend a Dashboard.
- Resume a Dashboard.
- Revoke a link.
- Roll back to a previous Published Release.

### 10.5 Graceful degradation

- Semantic AI failure must not block deterministic extraction.
- Insight failure must not block Dashboard publication.
- Title-generation failure falls back to question number plus original title.
- Chart-recommendation failure uses deterministic metric-to-chart defaults.

---

## 11. Draft-first Review Process

### 11.1 Recognition status behavior

- **High confidence:** enter Draft automatically.
- **Medium confidence:** enter Draft with an internal review warning.
- **Low confidence:** show placeholder or exclude until corrected.
- **Conflict:** do not choose a source automatically.
- **Recognition failed:** allow manual range and structure correction.

### 11.2 Review Summary

The system lists:

- Tables detected.
- Tables included in Draft.
- High/medium/low-confidence counts.
- Recognition failures.
- Conflicts.
- Generated modules.
- Publication blockers.

### 11.3 Lightweight Data Explorer

Creator can:

- Search by question, module, Market, Wave, metric or status.
- Preview standardized data.
- Open the table in original Workbook context.
- Confirm or exclude a table.
- Move content to Core, Detailed, Appendix or Internal.
- View Source -> Metric -> Module -> Chart -> Insight dependencies.

### 11.4 AI operation boundaries

#### Presentation changes

May be completed through conversation with Preview and Undo:

- Change chart type.
- Change sorting or Top N.
- Change layout.
- Change title and color.
- Change Insight wording.

#### Analysis-module changes

Require structured Change Preview:

- Combine multiple tables.
- Alter Funnel stages.
- Enable Funnel Conversion.
- Move content into Core Dashboard.

#### Underlying mapping changes

Must use a structured Review Panel:

- Table boundary.
- Header mapping.
- Base.
- Market / Wave.
- Metric interpretation.
- Significance mapping.
- Cross-wave option mapping.

A chat instruction may open the Review Panel, but cannot directly write the mapping.

---

## 12. Tab-derived Analysis Rules

### 12.1 Official metrics

The official source for Count, Percentage, Mean, Net, Box Score, Base and Significance is the Tab Book.

### 12.2 Allowed derived calculations

- Wave Difference
- Brand Gap
- Benchmark Gap
- Mean Difference
- Rank
- Trend Direction
- Relative Change
- Index to Total
- Funnel Conversion, after comparability validation

### 12.3 Funnel Conversion validation

Check:

- Same Brand
- Same Market
- Same Wave
- Same Banner
- Compatible Base relationship
- Compatible metric unit
- Valid business-stage relationship

Status:

- `verified_comparable`
- `review_required`
- `not_comparable`

### 12.4 Significance

- Use official Tab significance only.
- Do not retest significance from aggregate values.
- A derived difference is not described as significant unless the Tab provides the relevant official comparison.

### 12.5 Missing and unavailable data

Client visuals use `-` consistently, but the backend retains the cause:

- `not_asked`
- `not_available`
- `suppressed`
- `not_applicable`
- `recognition_pending`

Unavailable values are not ranked, subtracted or treated as zero.

---

## 13. Dashboard Generation

### 13.1 Template skeleton + AI dynamic assembly

A template defines:

- Candidate modules
- Metric priorities
- Page recommendations
- Chart rules
- Insight rules
- Default layout

AI selects modules from the detected Tab content and proposes a Dashboard Plan.

### 13.2 Core Dashboard + Suggested Pages

- **Core Dashboard:** concise main navigation, typically 5-10 pages.
- **Suggested Pages:** previewable pages not included in client navigation by default.
- **Appendix:** approved detailed data.
- **Internal:** not client-visible.

### 13.3 Multi-table modules

- Same metric across multiple waves may auto-combine at high confidence.
- Same metric across multiple markets may auto-combine at high confidence.
- Cross-question business combinations require Creator confirmation.
- Previously confirmed Tracking combinations are reused automatically when compatible.

### 13.4 Rating-question display

AI recommends an official summary metric already present in the Tab, such as T3B or Mean.

Creator may say:

```text
All 7-point rating questions should display T3B by default,
retain Mean as a client View Option,
and keep the full distribution only in Data Explorer.
```

This changes presentation only; it does not redefine or calculate T3B.

### 13.5 Chart recommendation

- Ranking / comparison: Horizontal Bar, Grouped Bar, Dot Plot, Table.
- Trend: standard vertical Line Chart, Slope Chart, Small Multiples.
- Matrix / imagery: Heatmap, Profile Chart, Data Matrix.
- Funnel: Funnel/Pyramid, Grouped Comparison, Connected Dot, Conversion Table.
- Overview: KPI Cards, compact comparison, Takeaway panel.

### 13.6 Layout

Use a responsive 12-column grid.

Supported patterns include:

- Full width
- 1/2 + 1/2
- 1/3 + 2/3
- KPI row + main chart
- Insight panel + charts
- Three-column cards

The MVP does not provide a pixel-level free canvas.

---

## 14. Dashboard Context, Filters and View Options

### 14.1 Dashboard Context

AI recommends:

- Target Brand / Product / Concept
- Main competitors
- Current Wave
- Comparison Wave
- Priority Markets
- Priority Metrics
- Benchmark

Creator confirmation saves the settings as project-level rules.

### 14.2 Banner classification

- Primary Filters
- Secondary Filters
- Analysis-only Dimensions
- Hidden / Technical Dimensions

### 14.3 Available combinations

Only combinations physically available in the Tab may be selected.

If `Market x Gender` is unavailable:

- Disable the combination.
- Do not estimate it.
- Do not fall back silently to Total.

If only some modules support the combination, supported charts update and unsupported charts show unavailable.

### 14.4 Client View Options

Creator may pre-approve:

- Chart alternatives.
- Official metric alternatives.
- Top 5 / Top 10 / All.
- Target and competitors / all brands.
- Original order / value order.
- Show / hide significance.

Client selections are session-level only.

---

## 15. AI Insight

### 15.1 MVP scope

P0 Insight is structured descriptive analysis. It may identify:

- Highest / lowest result
- Rank
- Wave movement
- Competitive Gap
- Funnel loss
- Funnel Conversion
- Index
- Relative strength / weakness
- Official significance
- Data availability or comparability warning

It must not infer business causes or causality.

### 15.2 Prioritization

Candidate findings are scored using transparent rules:

- Target relevance
- Priority KPI relevance
- Magnitude
- Official significance
- Trend consistency
- Competitive relevance
- Data-quality risk

AI then ranks, deduplicates and writes the final wording.

### 15.3 Display

- Page-level Key Takeaways are the default narrative.
- Chart-level Insight is expandable.
- Creator separately controls client visibility.

### 15.4 Revalidation after data update

- `still_valid`
- `needs_numeric_refresh`
- `no_longer_supported`
- `new_insight_available`

Creator wording is preserved where still valid, but unsupported Insight cannot enter a new release.

---

## 16. Titles, Base and Number Formats

### 16.1 Titles

Store:

- Immutable Original Question Text.
- AI-proposed Dashboard Display Title.
- Creator-confirmed title.

Confirmed titles are reused in future Waves unless the question meaning changes.

### 16.2 Base

Default client view shows a concise Base, for example:

```text
Base: n=602
```

Full detail remains available internally:

- Base definition
- Weighted Base
- Unweighted Base
- Market / Wave / Banner
- Source workbook, sheet and cell

If displayed series have different Bases, the Dashboard must not display one misleading shared Base.

### 16.3 Number formats

Store separately:

- Raw value
- Excel display value
- Excel number format
- Dashboard display format

Examples:

- Percentage: `45%`
- Percentage-point difference: `+5pp`
- Relative change: `+12.5%`
- Mean difference: `+0.4`
- Index: `120`
- Base: `n=602`

Derived calculations use the highest precision actually available.

---

## 17. Theme and UI/UX Direction

The uploaded UI/UX standard should be incorporated into the Product Design and Front-end Specification. The following high-level requirements also belong in this PRD because they affect product behavior and consistency.

### 17.1 Page structure

- Fixed left navigation, approximately 240px wide.
- Main workspace using stacked white cards on a light-grey background.
- Right-side AI assistant displayed as a floating entry and slide-out drawer.
- No redundant top-step header when the left navigation already drives the flow.

### 17.2 Core design tokens

```css
--color-primary-bg: #1D1D1B;
--color-workspace-bg: #F5F5F5;
--color-ai-accent: #FCC53B;
--color-ai-callout-bg: #FFF9EB;
--color-secondary-text: #6F7684;
--color-border: #E5E7EB;
```

The yellow `#FCC53B` is the single product accent and status color. Non-standard purple, green or decorative gradients should not be introduced as product theme colors.

### 17.3 Typography

Front-end font stack:

```css
font-family: "Inter", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif;
```

Numerical IDs, versions and aligned statistics may use:

```css
font-family: "JetBrains Mono", monospace;
```

Recommended hierarchy:

- H1: 24px / 700
- H2: 18px / 600
- Body: 14px / 400 or 600
- Caption: 12px / 400

### 17.4 Key components

- Card title with a 4px yellow vertical accent.
- Yellow submitted-status label and regenerate button.
- Two-column selection grid for categories where applicable.
- Fixed bottom action group with Back and primary action.
- Standard rectangular input fields.
- AI drawer approximately 380px wide.
- Full-screen AI processing modal with dark overlay, white panel, yellow top border and visible progress indicator.

### 17.5 Implementation placement

The detailed component dimensions, hover states, CSS tokens, accessibility states and page examples should live in a separate **UI/Front-end Engineering Specification**, not continue expanding the main PRD.

---

## 18. Backend and Technical Direction

### 18.1 Backend language

The MVP backend will use **Python**.

Recommended responsibility split:

- Excel and workbook parsing.
- Tab boundary and structure extraction.
- JSON validation and schema generation.
- Async processing jobs.
- Derived calculations and validation.
- Dashboard-data API.
- PDF/PPT export orchestration.
- AI orchestration and guardrails.
- Version, replacement and publication workflows.

### 18.2 Recommended Python service layers

```text
backend/
  api/
  workers/
  parsers/
  extractors/
  semantic/
  analysis/
  validation/
  dashboards/
  publishing/
  ai/
  models/
  schemas/
  repositories/
  tests/
```

### 18.3 Backend principles

- Deterministic extraction before AI interpretation.
- Typed schemas for all JSON contracts.
- Immutable source versions and published releases.
- Idempotent background jobs where possible.
- Explicit lineage for every displayed number.
- No direct LLM mutation of underlying mapping.
- Unit tests for calculations and JSON transformations.
- Golden-file regression tests for representative Tab Books.
- Structured logs without sensitive cell-level content unless required for controlled diagnostics.

### 18.4 AI boundary

The LLM should primarily receive:

- Metadata.
- Structured semantic objects.
- Approved aggregate results.
- Limited workbook context required for classification.

The application, not the language model, executes numeric calculations and source updates.

---

## 19. Bilingual Product Requirements

### 19.1 Supported product languages

The MVP must support two product languages:

- English: `en`
- Simplified Chinese: `zh-CN`

The language switcher is available in both Creator and Client experiences. Language preference is saved per user or browser session and does not change the underlying source data.

### 19.2 Interface localization

The following interface content must be localized:

- Navigation.
- Buttons and form labels.
- Processing stages.
- Review status and error messages.
- Dashboard Builder controls.
- Publication and sharing settings.
- Client access and unavailable-data messages.
- AI recommended-question labels.
- PDF/PPT system-generated labels and technical notes.

No hard-coded user-facing English or Chinese strings should be embedded directly in front-end components.

### 19.3 Research-content language

The system must distinguish between:

1. **Source language** - the original Tab Book question, option and footnote text.
2. **Canonical semantic language** - stable internal meaning and IDs.
3. **Display language** - the language currently shown in the Dashboard.

Original source text must always be preserved. AI-generated short titles, module names and Insights may have approved English and Chinese versions.

Example:

```text
Original source label: Price is too high
Canonical option ID: option_price_high
English display: High price
Chinese display: 价格过高
```

### 19.4 Translation and review status

Every translated research label or Insight should carry a translation status:

- AI Translated.
- Creator Reviewed.
- Creator Confirmed.
- Source Provided.
- Translation Not Available.

AI translation may be used in Draft. Client publication should use Creator-confirmed translation for high-visibility content such as page titles, KPI names, Executive Insight and technical definitions.

### 19.5 Language behavior

- Switching language changes interface and approved display text, not the metric identity or numeric result.
- Filters remain on the same selected IDs when language changes.
- Dashboard page structure, chart selection, Base and significance remain unchanged.
- If a translation is unavailable, the system may fall back to the source label and visibly mark the missing translation internally.
- Client view must not display an internal missing-translation warning; publication should either provide an approved fallback or block bilingual release for required content.

### 19.6 Bilingual Dashboard publication

Creator can publish:

- English only.
- Chinese only.
- Bilingual with language switcher.

A bilingual Published Release contains one set of approved data and layout definitions plus localized display resources. It must not duplicate calculations independently by language.

### 19.7 AI language behavior

- Creator AI responds in the currently selected interface language unless the user explicitly requests another language.
- Client recommended questions and answers follow the selected Dashboard language.
- AI answers use approved localized metric and entity names.
- English and Chinese Insights must reference the same supporting result IDs.
- Translation must not alter the strength of statistical claims or change `significant`, `increase`, `decrease`, Base or unit meaning.

### 19.8 Export language

PDF and PPT export options include:

- Current language.
- English.
- Chinese.
- Both languages, where the selected export template supports bilingual labels.

The MVP may produce separate English and Chinese exports when a side-by-side bilingual layout would reduce readability.

### 19.9 Font and rendering requirements

- English UI: Inter.
- Chinese UI: Source Han Sans SC or Noto Sans CJK SC.
- Numeric and aligned technical content: JetBrains Mono where appropriate.
- Hosted HTML, PDF and PPT must embed or reliably reference fonts that support Simplified Chinese.
- Export QA must check missing glyphs, unexpected font fallback and text clipping in both languages.

---

## 19. Tracking Update and Replace Data

### 19.1 New Wave

- Create a new Draft Version.
- Keep current Published Release visible.
- Auto-apply structurally safe updates.
- Preserve confirmed chart, layout, order, color, metric and title settings.
- New ordinary options may join compatible detailed charts automatically.
- Earlier Waves show `-`, not zero.
- Structural or conceptual changes enter Review.

### 19.2 Replace Wave Data

When a Wave file is wrong:

1. Mark old source version Replaced or Superseded.
2. Upload corrected file as a new Source File Version.
3. Re-run extraction.
4. Compare with previous Semantic JSON.
5. Reuse compatible mappings.
6. Rebind to new source cells.
7. Generate Replacement Impact Report.
8. Refresh charts, derived metrics and Insight in a new Draft.
9. Publish only after blockers are resolved.

### 19.3 If Dashboard is already completed

- Retain Dashboard design.
- Refresh data and significance.
- Revalidate charts and Insight.
- Regenerate PDF/PPT.
- Publish a corrected release.

### 19.4 If mapping is completed but Dashboard is not completed

- Migrate mapping.
- Review only unmatched or changed tables.
- Generate the Dashboard using the corrected file.

---

## 20. Publishing and Client Experience

### 20.1 Hosted HTML Dashboard

- Read-only hosted URL.
- Optional password.
- Expiry date.
- Immediate revocation.
- Suspend / resume.
- Link points to an immutable Published Release.
- Search-engine indexing disabled.

### 20.2 Client AI questions

MVP provides page-specific recommended questions, such as:

- Summarize this page.
- What changed versus the previous Wave?
- Which Brand performs best?
- Where is the largest Funnel drop?
- What are the top barriers?

The answer must include:

- Direct answer.
- Supporting data.
- Current scope.
- Statistical or availability note.
- Link to the supporting chart.

### 20.3 Export

- Hosted HTML is the primary client-delivery format.
- PDF supports Executive and Full Report modes.
- Creator receives a pagination preview.
- PPT Snapshot is static and presentation-ready.
- Standalone HTML Snapshot is optional, not the primary sharing mechanism.

---

## 21. Security and Non-functional Requirements

### 21.1 Security

- Encryption in transit and at rest.
- Project isolation.
- Protected share tokens.
- Optional password and expiry.
- Audit publish, suspend, replace, rollback and delete.
- Minimize data sent to AI services.
- Do not use customer data for training without explicit governance.

### 21.2 Performance

- Asynchronous workbook processing.
- Visible processing stages.
- Partial-failure reporting.
- Lazy loading of pages.
- Paginated or virtualized large tables.
- Background PDF/PPT generation.

### 21.3 Reliability

- Every published value has lineage.
- Published Releases are immutable and reproducible.
- AI failure does not block deterministic parsing and review.

---

## 22. Acceptance Criteria

A release is acceptable when:

- A representative Quantum / Dimensions workbook can be uploaded without pre-formatting.
- Every published value has source lineage.
- Numeric and header mappings are verified.
- Critical conflicts block publication.
- Core Dashboard and Suggested Pages are generated before full workbook review.
- Creator can correct critical structure through Review Panel.
- Only official Tab metrics are selectable.
- Derived metrics show formula, unit and comparability status.
- Only official Tab significance is described as significant.
- Unsupported Banner combinations are disabled or unavailable.
- Published Insight is supported by Published Data Package evidence.
- Replace Data preserves compatible mappings and Dashboard design.
- View as Client matches the actual share-link experience.
- Creator can suspend or revoke a Dashboard.
- PDF and PPT do not expose internal review content.

---

## 23. Roadmap

### MVP

- Tab-first parsing.
- Review and Quick Validation.
- Configurable research templates.
- Dashboard Draft.
- Descriptive Insight.
- Hosted HTML.
- PDF/PPT Snapshot.
- Replace Data.
- Recommended client questions.

### V1

- Richer Tracking Update Center.
- Client account portal.
- Controlled client Data Explorer.
- Client template reuse.
- Stronger Canonical Dictionary.
- Controlled free-text client Q&A.

### V2

- Raw-data analysis.
- New Net and Box Score calculation.
- Approved arbitrary Cross-tabs.
- Significance recalculation.
- Deeper Power BI / Fabric integration.
- Editable PPT.

### Advanced

- Pricing models.
- Driver Analysis.
- JAR Penalty.
- LCA / Segmentation.
- Campaign attribution.

---

## 24. Follow-on Specification Pack

The recommended document set is:

1. **Data & JSON Specification**  
   Object model, JSON schemas, lineage, confidence, availability, version and replacement fields.

2. **UX Flow & Prototype Specification**  
   Upload, processing, Review Summary, Data Explorer, Dashboard Builder, View as Client, publish, update and replace screens.

3. **Validation & Acceptance Test Plan**  
   Golden Tab Books, truth data, edge cases, regression tests and release gates.

4. **UI / Front-end Engineering Specification**  
   Detailed use of the Kantar AI Colleague UI/UX layout, color tokens, typography, components, responsive behavior and accessibility.

5. **Python Technical Architecture & Delivery Plan**  
   Services, frameworks, background jobs, storage, API contracts, AI boundary, PDF/PPT generation, hosting and implementation milestones.

### Recommended next step

Create the **Data & JSON Specification** first, followed by the **UX Flow & Prototype Specification**. The UI/Front-end Engineering Specification should reuse the uploaded UI/UX standard rather than duplicating all component details in the PRD.

---

## 25. Open Questions for Prototype Validation

- Maximum workbook size and target processing time.
- Initial golden Quantum / Dimensions workbook set.
- Field-level confidence thresholds.
- Which templates are production-certified versus Beta at launch.
- Default hosted-link duration and password policy.
- Exact PPT Snapshot slide size.
- Approved data residency and AI endpoint.
- Whether Standalone HTML Snapshot is required for the first pilot.
- Front-end framework and charting library.
- Python web framework, task queue and database selection.
