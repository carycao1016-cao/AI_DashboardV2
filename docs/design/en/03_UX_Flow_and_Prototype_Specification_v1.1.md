# AI Research Dashboard Platform
## UX Flow & Prototype Specification

**Document ID:** `03_UX_Flow_and_Prototype_Specification`  
**Version:** v1.1  
**Status:** Initial UX and interaction specification  
**Date:** 13 August 2026  
**Related documents:**  
- `01_AI_Research_Dashboard_PRD_MVP_v1.2.md`  
- `02_Data_and_JSON_Specification_v1.1.md`  
- `KANTAR AI COLLEAGUE UI 真实页面代码重构规范 v260622.docx`  

---

## 1. Purpose

This document translates the Product Requirements Document and Data & JSON Specification into concrete user flows, screens, interaction states and prototype requirements.

It is intended for:

- Product Managers.
- UX/UI Designers.
- Front-end Engineers.
- Python Backend Engineers.
- AI/LLM Engineers.
- QA and UAT teams.

The document defines the MVP Creator experience from Tab Book upload through client publication, plus the read-only client experience.

---

## 2. UX Principles

### 2.1 Draft first, review by risk

The user should see a useful Dashboard Draft quickly. The product must not require the Creator to review hundreds of tables before seeing value.

Review focuses on:

- Publication blockers.
- Data and Header Mapping risks.
- Base and comparability risks.
- Content actually used in the Dashboard.

### 2.2 AI recommends; Creator owns release decisions

AI may:

- Recognize.
- Classify.
- Suggest.
- Assemble.
- Explain.
- Draft language.

AI may not independently publish, mutate underlying mappings or redefine official Tab metrics.

### 2.3 Evidence is always reachable

Every Dashboard visual should provide a clear path to:

```text
Visual
-> Metric
-> Source Table
-> Original Workbook context
```

This evidence is visible internally but hidden from the client experience unless specifically approved.

### 2.4 No silent fallback

The interface must never silently:

- Replace unavailable data with Total.
- Treat unavailable values as zero.
- Guess a Banner combination.
- Recalculate significance.
- Overwrite Creator-confirmed rules.

### 2.5 Preserve user work

New Waves and replacement files should update data while preserving compatible:

- Mappings.
- Module combinations.
- Chart types.
- Layout.
- Colors.
- Titles.
- View Options.
- Creator-edited Insight.

### 2.6 Progressive disclosure

The primary UI should remain simple. Technical evidence, confidence detail and JSON data are available when needed but do not dominate the default workspace.

---

## 3. Visual System and Page Shell

### 3.1 Overall shell

The application uses three primary regions:

```text
+----------------------+--------------------------------------+------------------+
| Left navigation      | Main workspace                       | AI assistant     |
| approximately 240px  | responsive                           | drawer approx.   |
| fixed                |                                      | 380px when open  |
+----------------------+--------------------------------------+------------------+
```

### 3.2 Left navigation

- Fixed width of approximately 240px.
- Background: `#1D1D1B`.
- Full business labels, not icon-only navigation.
- Active item uses `#FCC53B` with black text.
- User name and version appear at the lower left.
- Language switcher appears below the product logo.

Suggested Creator navigation:

```text
1  Projects
2  Data & Recognition
3  Review
4  Dashboard Builder
5  Client Preview
6  Publish & Share
```

Project-scoped navigation should show completion and warning status without using multiple unrelated accent colors.

### 3.3 Main workspace

- Workspace background: `#F5F5F5`.
- Content uses vertically stacked white cards.
- Cards use subtle `#E5E7EB` borders and limited shadow.
- Card headings use a 4px yellow left accent.
- Main content should not be compressed when the AI drawer opens; the layout may reduce width responsively or use overlay behavior depending on viewport.

### 3.4 AI assistant

Collapsed state:

- Floating AI avatar at the lower right.
- Dark interaction capsule with a yellow status point.

Expanded state:

- Right-side drawer, approximately 380px.
- Dark header with assistant name and state.
- Conversation history in the body.
- Fixed input area at the bottom.
- Commands that affect mapping open a Review Panel rather than applying directly.

### 3.5 Core design tokens

```css
--color-primary-bg: #1D1D1B;
--color-workspace-bg: #F5F5F5;
--color-ai-accent: #FCC53B;
--color-ai-callout-bg: #FFF9EB;
--color-secondary-text: #6F7684;
--color-border: #E5E7EB;
--color-surface: #FFFFFF;
--color-text: #1D1D1B;
```

### 3.6 Typography

```css
font-family: "Inter", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif;
```

Numeric IDs, versions and aligned values may use:

```css
font-family: "JetBrains Mono", monospace;
```

Hierarchy:

- H1: 24px, 700.
- H2: 18px, 600.
- Body: 14px, 400/600.
- Caption: 12px, 400.

---

## 4. Information Architecture

### 4.1 Global level

```text
Projects
├── Active Projects
├── Draft Projects
├── Published Projects
├── Archived Projects
└── Admin
```

### 4.2 Project level

```text
Project Overview
├── Data Sources
├── Processing Jobs
├── Recognition Summary
├── Review Workspace
├── Data Explorer
├── Dashboard(s)
├── Published Releases
├── Share Links
└── Activity Log
```

### 4.3 Dashboard level

```text
Dashboard Draft
├── Dashboard Context
├── Core Pages
├── Suggested Pages
├── Appendix
├── Internal Pages
├── Theme
├── Insight Review
├── Client View Options
└── Publish Settings
```

---

## 5. Global Status Model

### 5.1 Project status

- Draft.
- Processing.
- Review Required.
- Ready to Publish.
- Published.
- Suspended.
- Archived.

### 5.2 Data status

- Uploading.
- Processing.
- Active.
- Replaced.
- Archived.
- Failed.

### 5.3 Recognition status

- High Confidence.
- Medium Confidence.
- Low Confidence.
- Conflict.
- Recognition Failed.
- Creator Verified.
- Excluded.

### 5.4 Dashboard content status

- Core.
- Suggested.
- Appendix.
- Internal.
- Excluded.

### 5.5 Published release status

- Draft.
- Publishing.
- Published.
- Suspended.
- Superseded.
- Withdrawn.

---

## 6. Primary Creator Journey

```text
Project List
-> Create Project
-> Upload Tab Book
-> Processing
-> Dashboard Draft Generated
-> Review Summary
-> Quick Data Validation
-> Resolve Blocking Issues
-> Refine Dashboard
-> View as Client
-> Publish
-> Share Hosted HTML
```

The product should allow the Creator to switch between Review and Dashboard Builder without losing progress.

---

# PART A - CREATOR EXPERIENCE

---

## 7. Screen 1 - Project List

### 7.1 Purpose

Allow Creators to find existing projects, understand current status and start a new project.

### 7.2 Main sections

#### Page heading

```text
Projects
Manage Tab Books, Dashboard Drafts and Published Releases
```

#### Primary action

```text
+ Create Project
```

#### Filters

- Search by Project or Client.
- Status.
- Template.
- Owner.
- Last updated.

#### Project cards or table

Each item displays:

- Project name.
- Client.
- Primary template.
- Current Wave.
- Status.
- Publication status.
- Last updated.
- Creator.
- Number of open blocking issues.

### 7.3 Primary actions

- Open Project.
- Continue Review.
- Continue Dashboard.
- View Published Release.
- More menu: Archive, Duplicate Dashboard configuration, Project settings.

### 7.4 Empty state

```text
No projects yet
Upload your first Tab Book to generate an AI-assisted Dashboard Draft.
```

Primary action:

```text
Create Project
```

---

## 8. Screen 2 - Create Project

### 8.1 Purpose

Create the minimum Project shell before uploading data.

### 8.2 Required fields

- Project name.
- Client name, optional for internal pilots.

### 8.3 Optional fields

- Primary research template.
- Language.
- Internal project code.
- Project description.

The template can remain `Auto-detect`.

### 8.4 Suggested layout

Use one white card with sections:

1. Project details.
2. Research setup.
3. Upload next.

### 8.5 Actions

- Cancel.
- Create and Upload.

### 8.6 Validation

- Project name is required.
- Duplicate project names are allowed but should show a warning when Client and Project name match an existing active project.

---

## 9. Screen 3 - Upload Tab Book

### 9.1 Purpose

Upload one or more Quantum, Dimensions or other Excel Tab Books without reformatting.

### 9.2 Upload card

Support:

- Drag and drop.
- File picker.
- Multiple files.
- `.xlsx` as primary MVP format.
- File-size and workbook limits shown before upload.

### 9.3 Upload guidance

```text
Upload the existing Tab Book as delivered.
You do not need to remove merged cells, blank rows or repeated headers.
```

### 9.4 File list

For each file:

- File name.
- Size.
- Upload progress.
- Detection preview, when available.
- Remove before processing.

### 9.5 Optional metadata

Do not require Market and Wave entry. The system detects them automatically.

The user may optionally add a note:

```text
These files contain US and UK Wave 2 results.
```

The note is supporting context, not authoritative mapping.

### 9.6 Actions

- Back.
- Start Recognition.

### 9.7 Errors

- Unsupported file type.
- Password-protected workbook.
- Corrupt workbook.
- File too large.
- Duplicate binary file already uploaded.

For duplicate binary files, offer:

- Use existing source version.
- Upload as a separate dataset only if intentionally duplicated.

---

## 10. Screen 4 - AI Processing Modal and Processing Page

### 10.1 Purpose

Communicate progress for asynchronous workbook processing.

### 10.2 Initial modal

Use the standardized AI Engine loader:

- Full-screen dark overlay.
- White rectangular panel.
- Yellow top border.
- KANTAR / AI ENGINE heading.
- Stage message.
- Percentage using JetBrains Mono.
- Yellow progress bar.

### 10.3 Processing stages

```text
1. Validating files
2. Scanning workbook structure
3. Detecting tables
4. Extracting values and formatting
5. Understanding questions and metrics
6. Building Dashboard Draft
7. Preparing Review Summary
```

### 10.4 Long-running behavior

After the initial modal, allow the user to leave the page.

Processing page displays:

- Current stage.
- Progress.
- Sheets scanned.
- Tables detected.
- Partial warnings.
- Estimated completion only if technically reliable.

### 10.5 Completion notification

- In-app notification.
- Optional email later, not required for MVP.

### 10.6 Partial failure

If some sheets fail:

```text
Dashboard Draft created with partial results
4 sheets require review.
```

Actions:

- Open Dashboard Draft.
- Review failed sheets.

The whole job must not fail because AI title generation or Insight generation failed.

---

## 11. Screen 5 - Draft Generated Landing Page

### 11.1 Purpose

Deliver an immediate value moment after processing.

### 11.2 Hero summary

```text
Your Dashboard Draft is ready
```

Show:

- Tables detected.
- Tables used in Draft.
- Core pages generated.
- Suggested pages generated.
- Blocking issues.
- Important reviews.

### 11.3 Main actions

- Open Dashboard Draft.
- Review Issues.
- Run Quick Data Validation.

Recommended primary action:

```text
Open Dashboard Draft
```

### 11.4 Module preview

Display detected template and modules:

```text
Detected study type: Brand Tracking

Detected modules:
- Brand Awareness
- Brand Funnel
- Brand Imagery
- Purchase Intent
- Purchase Barriers
- Wave Trend
```

Allow `Change template` without rebuilding raw extraction.

---

## 12. Screen 6 - Review Summary

### 12.1 Purpose

Prioritize issues by impact rather than showing an undifferentiated error list.

### 12.2 Summary cards

- Blocking Issues.
- Analysis Blockers.
- Publishing Warnings.
- Optional Review.

Use the yellow accent consistently. Severity differentiation should use iconography, border treatment and text labels, not uncontrolled product-theme colors.

### 12.3 Issue list columns

- Issue.
- Table / Metric.
- Risk class.
- Dashboard usage.
- Affected pages.
- Suggested action.
- Status.

### 12.4 Filters

- Risk class.
- Issue type.
- Market.
- Wave.
- Module.
- Used in Dashboard.
- Open / Resolved.

### 12.5 Bulk actions

Only offer bulk actions when the system detects a shared structural pattern.

Example:

```text
36 tables appear to use the same three-row header layout.
Apply this correction to all matching tables?
```

Options:

- Current table only.
- Matching tables, recommended.
- Select manually.

### 12.6 Publication indicator

Sticky status panel:

```text
Publication blocked by 3 unresolved issues
```

Action:

```text
Review blockers
```

---

## 13. Screen 7 - Quick Data Validation

### 13.1 Purpose

Let the Creator validate representative results without checking every table.

### 13.2 Three-column comparison

```text
Original Excel | Structured Result | Dashboard Result
```

For each sample show:

- Value.
- Header path.
- Row label.
- Base if relevant.
- Metric type.
- Significance marker if relevant.

### 13.3 Sample types

- Base.
- Percentage.
- Mean.
- Net / Box Score.
- Significance.
- Complex header.
- Market / Wave mapping.
- Derived difference.

### 13.4 Creator actions

- Confirm sample.
- Flag mismatch.
- Open source context.
- Open Review Panel.
- Comment.

### 13.5 Pattern escalation

If the Creator flags a sample:

```text
This structure is used by 24 other tables.
Review all matching tables?
```

The system must not automatically mark all related tables incorrect without explaining the detected pattern.

### 13.6 Completion state

```text
Quick Validation complete
18 of 20 samples confirmed
2 items require review
```

Quick Validation does not replace publication gates.

---

## 14. Screen 8 - Lightweight Data Explorer

### 14.1 Purpose

Provide DP-friendly search, verification and source traceability without becoming an online tabulation tool.

### 14.2 Left catalog panel

Columns or list items:

- Question number.
- Short title.
- Module.
- Market.
- Wave.
- Metric type.
- Base status.
- Confidence.
- Review status.
- Dashboard usage.

### 14.3 Search

Support:

- Question number.
- Question text.
- Table title.
- Brand, Product or Concept.
- Module.

### 14.4 Main preview area

Tabs:

1. Standardized View.
2. Original Source View.
3. Usage & Dependencies.
4. Recognition Detail.

### 14.5 Standardized View

Show:

- Short title.
- Original question.
- Base.
- Metric selector for official metrics.
- Multi-level Banner header.
- Values.
- Official significance.
- Availability symbols.

### 14.6 Original Source View

Show a controlled workbook preview centered on the source table, with enough rows and columns around the table for context.

Highlight:

- Table boundary.
- Header rows.
- Base row.
- Data area.
- Footnote rows.

### 14.7 Usage & Dependencies

```text
Source Table
-> Semantic Metric
-> Analysis Module
-> Dashboard Visual
-> Insight
```

Allow the Creator to click each dependent object.

### 14.8 Actions

- Add to Dashboard.
- Move to Detailed Analysis.
- Move to Appendix.
- Mark Internal.
- Exclude.
- Open Review Panel.
- Combine into Module.

### 14.9 MVP restrictions

Do not provide:

- Arbitrary Pivot.
- New Cross-tab.
- New Banner.
- Weight calculation.
- New Box Score.
- Significance calculation.

---

## 15. Screen 9 - Mapping Review Panel

### 15.1 Purpose

Safely confirm changes to underlying structure or semantics.

### 15.2 Opening triggers

- Creator clicks `Review`.
- Creator flags Quick Validation mismatch.
- AI conversation detects mapping intent.
- Publication gate identifies a blocking mapping.

### 15.3 Panel layout

Use a split panel:

```text
Left: Original evidence
Right: Current mapping and proposed change
```

### 15.4 Supported review types

- Table boundary.
- Header mapping.
- Question mapping.
- Base.
- Market.
- Wave.
- Metric type.
- Significance mapping.
- Cross-Wave option mapping.

### 15.5 Required information

- Current recognized value.
- Proposed value.
- Confidence and method.
- Source evidence.
- Affected tables.
- Affected Dashboard pages.
- Affected derived metrics and Insight.

### 15.6 Apply scope

Options:

1. Current table only.
2. Tables with identical structure.
3. Same question across matched Markets and Waves.
4. Manual selection.

System recommends one scope but never hides the alternatives.

### 15.7 Confirmation

Primary button:

```text
Apply confirmed mapping
```

Secondary actions:

- Cancel.
- Exclude table.
- Save as Project rule where applicable.

### 15.8 Undo

Mapping corrections create a history record and can be reversed by a Creator if no permanent deletion has occurred.

---

## 16. Screen 10 - Cross-Wave Option Mapping

### 16.1 Purpose

Handle renamed options without producing false new/removed trends.

### 16.2 Example

```text
Wave 1: Too expensive
Wave 2: Price is too high
```

### 16.3 Panel content

- Original labels by Wave.
- Suggested canonical label.
- Text similarity explanation.
- Question and Base context.
- Proposed trend behavior.
- Comparability status.

### 16.4 Actions

- Treat as the same option.
- Keep separate.
- Map but retain comparability warning.
- Create a new canonical option.

### 16.5 One-to-many warning

If one option is split into two:

```text
These percentages cannot be combined reliably from an aggregated Tab Book.
Direct trend will be disabled unless an official Net exists.
```

### 16.6 Display-name choice

Allow Creator to choose:

- Wave 1 label.
- Wave 2 label.
- New canonical display name.

Original labels remain in source evidence.

---

## 17. Screen 11 - Dashboard Builder Overview

### 17.1 Purpose

Provide the main Creator workspace for page structure, visuals and Insight.

### 17.2 Layout

```text
Left page panel | Center Dashboard canvas | Right properties / AI drawer
```

The fixed global left navigation remains outside the project workspace. The page panel may be a secondary slim panel within the main content area.

### 17.3 Page panel

Sections:

- Core Pages.
- Suggested Pages.
- Appendix.
- Internal.

Actions:

- Add page.
- Reorder.
- Move category.
- Duplicate page configuration.
- Delete from current Dashboard.

### 17.4 Canvas

- 12-column grid.
- Drag to reorder modules.
- Resize using preset spans: 4, 6, 8 or 12 columns.
- No free pixel placement.
- Show internal review badges only in Creator mode.

### 17.5 Top toolbar

- Dashboard selector.
- Current Draft version.
- Undo / Redo.
- Theme.
- Dashboard Context.
- View as Client.
- Publish readiness.

### 17.6 Right-side properties

Contextual tabs:

- Data.
- Visual.
- Display.
- Client Options.
- Evidence.

---

## 18. Screen 12 - Dashboard Context

### 18.1 Purpose

Confirm cross-Dashboard settings recommended by AI.

### 18.2 Fields

- Primary template.
- Target Brand / Product / Concept.
- Main competitors.
- Current Wave.
- Comparison Wave.
- Priority Markets.
- Priority KPIs.
- Benchmark.
- Default filters.

### 18.3 Status

Each field displays:

- AI Recommended.
- Creator Confirmed.
- Inherited from previous Wave.

### 18.4 Updates

Changing Dashboard Context shows an impact preview:

```text
This will update:
- 4 overview visuals
- 6 default brand selections
- 9 Insight candidates
```

The Creator confirms before applying broad changes.

---

## 19. Screen 13 - Core and Suggested Pages

### 19.1 Core page card

Display:

- Page preview.
- Page name.
- Modules.
- Review status.
- Client visibility.

### 19.2 Suggested page card

Display:

- Suggested page name.
- Reason for recommendation.
- Source tables.
- Candidate visuals.
- Data coverage.
- Review issues.

Actions:

- Preview.
- Add to Core.
- Add to Appendix.
- Merge into existing page.
- Internal only.
- Ignore.

### 19.3 Merge flow

When merging Suggested content into an existing page, show:

- Current page grid.
- Proposed module location.
- Potential overcrowding warning.
- Output impact for PDF/PPT.

---

## 20. Screen 14 - Analysis Module Preview

### 20.1 Purpose

Confirm semantic combinations such as Funnel, Concept Scorecard or Purchase Journey.

### 20.2 Module preview content

- Module name.
- Source tables.
- Metrics.
- Stage or display order.
- Common Brands / Products / Concepts.
- Market / Wave coverage.
- Base comparison.
- Available derived calculations.
- Available significance.

### 20.3 Example Funnel preview

```text
1. TOM - B1
2. Unaided Awareness - B2
3. Aided Awareness - B3
4. Ever Used - B4
5. Current Use - B5
6. Purchase Intent - B9
```

### 20.4 Actions

- Accept module.
- Reorder metrics.
- Remove a metric.
- Add another table.
- Split into separate modules.
- Disable conversion.

### 20.5 Validation message

```text
Funnel chart is available.
Conversion requires review because Base comparability could not be confirmed.
```

The Creator may publish the chart without the conversion calculation.

---

## 21. Screen 15 - Visual Configuration

### 21.1 Data tab

- Analysis module.
- Official metric.
- Entity scope.
- Market / Wave scope.
- Banner or view dimension.
- Top N.

### 21.2 Visual tab

- Recommended chart.
- Alternative compatible charts.
- Axis and label options.
- Legend.
- Data labels.
- Significance display.
- Base display.

### 21.3 Display tab

- Title.
- Subtitle.
- Number format.
- Sorting.
- Pinned entities.
- `Other` and `None` placement.

### 21.4 Client Options tab

- Allowed chart types.
- Allowed official metrics.
- Allowed sort options.
- Approved entity scopes.
- Show / hide significance toggle.
- Show / hide detailed table.

### 21.5 Evidence tab

- Source tables.
- Source cells or ranges.
- Mapping status.
- Derived formula.
- Comparability.
- Review issues.

### 21.6 Metric-selection rule

Only official Tab metrics appear as selectable defaults.

If Creator requests unavailable T3B:

```text
Top 3 Box is not available as an official metric in the uploaded Tab Book.
The MVP cannot reconstruct it from rounded aggregate rows.
```

---

## 22. Screen 16 - Creator AI Assistant

### 22.1 Purpose

Accelerate presentation and Dashboard editing without bypassing controls.

### 22.2 Example presentation requests

```text
Change this chart to a line chart.
Show T3B and Mean only for 7-point questions.
Place the Funnel on the left and Conversion Table on the right.
Keep Govee first and sort the remaining Brands by Awareness.
Move Purchase Barriers to a separate page.
```

### 22.3 AI response structure

```text
Understanding
Proposed changes
Affected scope
Warnings
Apply / Modify / Cancel
```

### 22.4 Scope selection

For reusable changes:

- Current visual.
- Current page.
- Current module.
- All matching questions in Project.

### 22.5 Mapping-related request

If Creator says:

```text
Current is actually Wave 2.
```

AI responds:

```text
This changes underlying Wave Mapping.
I found 38 affected tables.
Open Review Panel to confirm the mapping and scope.
```

No direct write occurs from chat.

### 22.6 Undo

Every applied presentation or module change should be reversible from the Dashboard editing history.

---

## 23. Screen 17 - Insight Review

### 23.1 Purpose

Review, edit and approve page and chart-level Insight.

### 23.2 Insight card

Display:

- Draft statement.
- Insight type.
- Priority score.
- Evidence summary.
- Significance status.
- Any availability or comparability warning.
- Client visibility.

### 23.3 Actions

- Approve.
- Edit.
- Reject.
- Pin to Executive Overview.
- Internal only.
- Move to Chart Detail.
- Regenerate wording.
- View evidence.

### 23.4 Guardrails

Show an inline warning if edited text introduces an unsupported claim:

```text
The phrase "driven by" implies causality that is not supported by the published analysis.
```

Creator may revise the wording but cannot publish a claim that contradicts numeric evidence.

### 23.5 Data update state

When a new Wave or replacement is processed, show:

- Still Valid.
- Needs Numeric Refresh.
- No Longer Supported.
- New Insight Available.

Unsupported Insight is excluded from the new release until resolved.

---

## 24. Screen 18 - Theme and Branding

### 24.1 Theme presets

- Corporate Light.
- Executive Dark.
- Research Report.
- Minimal Brand.
- Kantar AI Colleague.

### 24.2 Editable properties

- Client Logo.
- Project Logo.
- Primary color.
- Secondary color.
- Accent color.
- Target entity color.
- Competitor colors.
- Font.
- Footer.
- Confidentiality text.

### 24.3 Color consistency

Show a Brand Color Dictionary.

```text
Govee            #FCC53B
Philips Hue      #4B63C3
Ring              #6F7684
Other Brands      neutral grey
```

### 24.4 Accessibility warning

If colors are too similar or contrast is weak:

```text
The selected colors may be difficult to distinguish.
Preview an accessible alternative.
```

The system recommends but does not silently overwrite a Creator-confirmed palette.

---

## 25. Screen 19 - View as Client

### 25.1 Purpose

Show the exact published experience before release.

### 25.2 Client-preview mode hides

- Creator toolbars.
- Recognition confidence.
- Source cells.
- Review notes.
- Internal pages.
- Draft Insight.
- JSON.

### 25.3 Preview controls

Creator can preview:

- Default desktop width.
- Smaller responsive width.
- Password entry screen.
- Client filter behavior.
- Client View Options.
- Recommended questions.
- PDF download availability.
- Data-unavailable states.

### 25.4 Preview checklist

- Correct pages visible.
- Correct default filters.
- No Internal content.
- Base display correct.
- Significance display appropriate.
- Insight approved.
- Recommended questions relevant.
- Download permissions correct.

### 25.5 Return action

```text
Exit Client Preview
```

Return to the exact editing location.

---

## 26. Screen 20 - Publication Gate

### 26.1 Purpose

Prevent release of unresolved critical issues.

### 26.2 Gate sections

- Source lineage.
- Numeric and Header Mapping.
- Market and Wave.
- Source conflicts.
- Significance.
- Derived metric validation.
- Insight support.
- Internal-content exclusion.
- Share settings.

### 26.3 Status display

```text
Ready to Publish
```

or:

```text
Publication blocked by 2 issues
```

### 26.4 Blocking issue action

Each failed check links directly to the relevant Review Panel or visual.

### 26.5 Accepted warning

Non-blocking warnings may be acknowledged with a Creator comment, but Data Blocking issues cannot be bypassed.

---

## 27. Screen 21 - Publish and Share

### 27.1 Publish settings

- Release name.
- Version number.
- Release note.
- Pages included.
- Appendix included.
- Insight visibility.
- Significance display.
- Detailed-table visibility.

### 27.2 Hosted share settings

- Password required.
- Password.
- Expiry date.
- PDF download.
- PPT download.
- Recommended questions enabled.

### 27.3 Publish action

Primary:

```text
Publish Hosted Dashboard
```

### 27.4 Post-publication success

```text
Dashboard published successfully
```

Show:

- Share URL.
- Copy link.
- Copy password separately.
- Expiration date.
- Open client view.
- Generate PDF.
- Generate PPT Snapshot.

The plain-text password should not be displayed again after the creation flow.

---

## 28. Screen 22 - Published Release Management

### 28.1 Release list

Display:

- Release version.
- Published date.
- Published by.
- Data version.
- Status.
- Active share links.

### 28.2 Actions

- Open.
- View as Client.
- Suspend.
- Resume.
- Revoke link.
- Roll back.
- Create new Draft from release.

### 28.3 Suspend confirmation

```text
Suspend this Dashboard?
Clients will see a temporary-unavailable message.
The Project and Published Release will not be deleted.
```

### 28.4 Rollback confirmation

Show:

- Current release.
- Target previous release.
- Affected links.
- Whether links will point to the previous release.

Rollback creates a new active release pointer; it does not mutate the historical release.

---

## 29. Screen 23 - PDF and PPT Export

### 29.1 Export types

#### PDF

- Executive.
- Full Report.

#### PPT

- Snapshot.

### 29.2 Export options

- Current filters or published defaults.
- Include Insight.
- Include Appendix.
- Include Base.
- Include technical notes.
- Page orientation where supported.

### 29.3 Pagination preview

Show thumbnails with warnings:

- Chart clipped.
- Legend overflow.
- Table too long.
- Insight separated from visual.

Allow limited corrections:

- Move visual to new page.
- Stack visuals vertically.
- Exclude Appendix.
- Reduce visible Top N.

### 29.4 Background task

Exports are asynchronous. Show job progress and notification on completion.

---

## 30. Screen 24 - New Wave Update

### 30.1 Entry point

Project Overview action:

```text
+ Add New Wave
```

### 30.2 Upload behavior

Upload one or more new-Wave Tab Books. Market and Wave are auto-detected.

### 30.3 Change Impact Summary

Show:

- Tables matched.
- Safe updates.
- New tables.
- Removed tables.
- Changed definitions.
- Changed Base.
- New Brands / Products / Concepts.
- New options.
- Dashboard pages affected.
- Insight status changes.

### 30.4 Safe updates

Automatically apply to a new Draft:

- New Wave values.
- Trend points.
- Wave differences.
- Official significance.
- Ranking.
- Validated derived metrics.

### 30.5 Review-required changes

- Question definition.
- Base.
- Banner.
- Scale.
- Option split / merge.
- New business module.
- Incompatible visual density.

### 30.6 Existing design

Display a reassurance message:

```text
Your confirmed layout, charts, titles, colors and client options will be retained where compatible.
```

---

## 31. Screen 25 - Replace Wave Data

### 31.1 Entry point

Data Sources menu for a Wave:

```text
Replace Data
```

Do not use a primary action labelled `Delete and re-upload`.

### 31.2 Pre-replacement warning

```text
You are replacing the source data for Wave 2.
Existing mappings and Dashboard settings will be retained where compatible.
The current Published Release will not change until you publish a corrected release.
```

### 31.3 Existing published-data choice

If the incorrect data is published:

- Keep current release visible until correction is ready.
- Temporarily suspend current release.

### 31.4 Upload corrected file

Show old and new source-version labels.

### 31.5 Mapping Migration Summary

- Reused mappings.
- Review required.
- New tables.
- Missing old sources.
- Conflicts.

### 31.6 Replacement Impact Report

- Numeric values changed.
- Bases changed.
- Significance changed.
- Visuals affected.
- Insight revalidation.
- Export regeneration requirement.

### 31.7 Resulting Draft

Create a new Draft clearly labelled:

```text
Corrected Wave 2 Data - Draft
```

The Creator reviews only the affected items.

---

## 32. Screen 26 - Data Source Management

### 32.1 Source list

Group by logical dataset:

```text
US Wave 1
  - File Version 1 - Active

US Wave 2
  - File Version 1 - Replaced
  - File Version 2 - Active
```

### 32.2 Actions

- View processing history.
- View extraction snapshot.
- Replace Data.
- Archive.
- Remove from current Project.
- Request permanent deletion, permission dependent.

### 32.3 Historical source safety

Replaced files remain visibly marked and cannot be confused with current active data.

---

# PART B - CLIENT EXPERIENCE

---

## 33. Screen 27 - Share Link Access

### 33.1 Without password

Open the Hosted Dashboard directly if the link is active and unexpired.

### 33.2 With password

Show a simple branded access screen:

- Client / Project logo.
- Dashboard title.
- Password input.
- Access button.
- Expiry or support message if necessary.

Do not disclose whether a guessed token exists before password validation.

### 33.3 Expired link

```text
This Dashboard link has expired.
Please contact the project team for access.
```

### 33.4 Suspended Dashboard

```text
This Dashboard is temporarily unavailable while the data is being updated.
```

---

## 34. Screen 28 - Client Hosted Dashboard

### 34.1 Navigation

Use a simplified client navigation, not the Creator workflow navigation.

Suggested:

- Dashboard pages.
- More analyses / Appendix, if enabled.
- Download.
- Help / AI questions.

### 34.2 Header

Show:

- Project title.
- Current filter scope.
- Last published date.
- Client logo.

### 34.3 Filters

- Only Creator-approved filters.
- Primary filters visible.
- Secondary filters under More Filters.
- Unsupported combinations disabled.

### 34.4 Visual behavior

- Approved client View Options only.
- Client changes are session-only.
- Default published view is restored on a new session.
- Unsupported selected combination displays `Data unavailable`.
- No silent Total fallback.

### 34.5 Base and significance

Use Creator-selected display mode.

Internal technical details remain hidden.

---

## 35. Screen 29 - Client Recommended Questions

### 35.1 Entry point

```text
Ask about this Dashboard
```

MVP uses recommended question buttons rather than an unrestricted input box.

### 35.2 Dynamic availability

Questions are generated only when the required data exists.

Examples:

- Summarize this page.
- What changed versus the previous Wave?
- Which Brand performs best?
- What is the largest competitive Gap?
- Where is the largest Funnel drop?
- What are the top barriers?

### 35.3 Answer layout

- Direct answer.
- Supporting evidence.
- Scope.
- Statistical or availability note.
- View source chart.

### 35.4 Scope restrictions

The AI queries only the Published Data Package.

If a combination is unavailable:

```text
This combination is not available in the published Tab Book.
The available dimensions cannot be combined reliably.
```

### 35.5 No modification

The client AI cannot:

- Change Dashboard design.
- Change mapping.
- Create a metric.
- Create a Banner combination.
- Recalculate significance.

---

## 36. Screen 30 - Client Download

### 36.1 Download options

Show only enabled formats:

- PDF.
- PPT Snapshot.

### 36.2 Export scope

Creator decides whether the client can export:

- Published default view only.
- Current session filters.

### 36.3 Download status

If a file is generated asynchronously, show:

```text
Preparing download...
```

The client cannot request internal or technical export modes.

---

# PART C - CROSS-CUTTING INTERACTION PATTERNS

---

## 37. Empty, Loading and Error States

### 37.1 Empty state principles

Every empty state should explain:

- What is missing.
- Why it matters.
- What the user can do next.

Example:

```text
No Suggested Pages
The system did not identify additional analysis pages beyond the Core Dashboard.
```

### 37.2 Loading state principles

- Show the current stage.
- Avoid indefinite spinners where progress can be measured.
- Preserve user navigation for long-running jobs.

### 37.3 Error state principles

Error messages contain:

- Plain-language issue.
- Impact.
- Suggested next action.
- Retry option if safe.
- Technical ID for support.

Do not show stack traces.

---

## 38. Notification System

### 38.1 Toasts

Use for:

- Saved visual change.
- Mapping applied.
- Link copied.
- Share revoked.
- Dashboard suspended.

### 38.2 Persistent banners

Use for:

- Publication blocked.
- Replacement in progress.
- Published data may be incorrect.
- Partial extraction failure.

### 38.3 Inbox or activity panel

Useful events:

- Processing completed.
- Export completed.
- New Wave Draft ready.
- Replacement Draft ready.
- Insight needs refresh.

---

## 39. Confirmation and Undo Patterns

### 39.1 No confirmation required

- Change chart title.
- Change visual width.
- Change sorting.
- Move page order.

These actions support Undo.

### 39.2 Preview required

- Apply a display rule across many visuals.
- Combine tables into a module.
- Change Dashboard Context.
- Move Suggested Page into Core.

### 39.3 Structured Review required

- Mapping changes.
- Base changes.
- Market / Wave changes.
- Significance mapping.
- Cross-Wave option mapping.

### 39.4 Strong confirmation required

- Publish.
- Suspend.
- Rollback.
- Replace Data.
- Revoke share link.
- Permanent delete.

---

## 40. Accessibility Requirements

- Full keyboard access for navigation, dialogs and primary editing controls.
- Visible focus state.
- Form labels, not placeholder-only inputs.
- ARIA labels for charts and controls.
- Text alternative or accessible data table for charts.
- Do not use color alone for status.
- Minimum contrast validation for themes.
- Client AI answer readable by screen readers.
- Responsive layouts maintain logical reading order.

---

## 41. Bilingual UX and Language Switching

### 41.1 Supported languages

The MVP supports:

- English.
- Simplified Chinese.

The language switcher is displayed below the product logo in the left navigation for Creator screens and in the client Dashboard header or navigation area for published screens.

Suggested control:

```text
中文 / ENGLISH
```

### 41.2 Language-switch behavior

Switching language updates:

- Navigation and system controls.
- Status and error messages.
- Page and visual titles.
- Metric and filter labels.
- Base definitions.
- Approved Insight.
- Client recommended questions and answers.
- Export labels.

Switching language does not change:

- Current Project.
- Selected IDs.
- Filter values as semantic IDs.
- Numbers.
- Chart type.
- Layout.
- Base.
- Significance.
- Published Release version.

### 41.3 Creator language control

Creator can set:

- Interface language.
- Default client language.
- Published languages.
- Translation fallback language.

The Creator should see translation status badges only when editing localized research content:

- AI Translated.
- Creator Reviewed.
- Creator Confirmed.
- Missing.

Do not display translation-status noise on every standard interface control.

### 41.4 Translation Review workspace

Add a localized-content review mode accessible from Dashboard Builder and Publication Gate.

Recommended side-by-side layout:

```text
English                          Chinese
Aided Brand Awareness            提示后品牌知名度
```

Supported content groups:

- Dashboard pages.
- Visual titles and subtitles.
- Metric names.
- Filters and categories.
- Base definitions.
- Insight.
- Recommended client questions.
- Technical notes.

Actions:

- Accept AI translation.
- Edit translation.
- Copy source text.
- Mark as not requiring translation.
- Apply approved terminology to matching items.

### 41.5 Terminology consistency

The UI should surface a Project terminology dictionary for frequently reused research terms.

Example:

```text
Aided Awareness       提示后品牌知名度
Unaided Awareness     未提示品牌知名度
Top 2 Box              T2B
Base                   样本基数
Significance           显著性
Wave                   期次
```

Creator-confirmed terminology should be reused across pages and future Waves.

### 41.6 Source-language visibility

Data Explorer and Mapping Review Panel always provide access to the original source-language label, even when the current interface displays a translation.

Example:

```text
Display label: 价格过高
Original source label: Price is too high
```

### 41.7 Mixed-language Tab Books

The product may encounter:

- English questions with Chinese options.
- Chinese questions with English Brand names.
- Mixed-language technical footnotes.

The parser should preserve original text per cell. AI may propose a normalized display language, but mixed source content is not automatically treated as an extraction error.

### 41.8 Client language experience

For bilingual releases:

- Client selects English or Chinese.
- Preference persists for the current browser where allowed.
- Page remains on the same route and filter state.
- AI recommended questions update immediately.
- Client answers use the selected language and the same Published Data Package evidence.

### 41.9 Language-specific layout validation

Chinese labels may be shorter in some cases and longer in others. English technical labels may wrap differently.

Before publication, View as Client must test both languages for:

- Clipped page titles.
- Wrapped filter labels.
- Chart-axis label collisions.
- Legend overflow.
- Missing glyphs.
- PDF/PPT pagination changes.

### 41.10 Export language selection

Export screen includes:

- Current language.
- English.
- Chinese.
- Both, when supported by the chosen template.

For MVP, separate English and Chinese PDF/PPT exports are preferred over forcing side-by-side bilingual chart labels that reduce readability.

### 41.11 Publication Gate localization checks

Add checks for:

- Required English coverage.
- Required Chinese coverage.
- Missing client-visible translations.
- Unreviewed high-priority Insight translation.
- Font availability.
- Language-specific export preview.

### 41.12 Client access and error messages

Password, expired-link, suspended-Dashboard and unavailable-data states must be localized in English and Chinese.

Example:

```text
English: This Dashboard is temporarily unavailable while the data is being updated.
Chinese: 数据更新期间，此仪表板暂时无法访问。
```

---

## 41. Responsive Behavior

### 41.1 Creator workspace

Desktop-first MVP.

At narrower widths:

- AI drawer overlays rather than excessively compressing the main canvas.
- Secondary page panel can collapse.
- Grid modules stack according to responsive rules.

### 41.2 Client Dashboard

- Page navigation may become collapsible.
- Primary filters remain accessible.
- Two-column charts stack vertically.
- Large tables use horizontal scrolling only as a final fallback.

### 41.3 Mobile

Client read-only viewing may support mobile-responsive rendering. Full Creator Dashboard editing on mobile is not an MVP requirement.

---

## 42. Prototype Scope

### 42.1 High-fidelity prototype screens

The prototype should include at least:

1. Project List.
2. Create Project.
3. Upload Tab Book.
4. AI Processing.
5. Draft Generated.
6. Review Summary.
7. Quick Data Validation.
8. Data Explorer.
9. Mapping Review Panel.
10. Dashboard Builder.
11. Analysis Module Preview.
12. Visual Configuration.
13. Creator AI drawer.
14. Insight Review.
15. View as Client.
16. Publication Gate.
17. Publish & Share.
18. Hosted Client Dashboard.
19. Client Recommended Questions.
20. Replace Wave Data.
21. Replacement Impact Report.
22. Suspend / Rollback.

### 42.2 Prototype content

Use one coherent sample project across all screens:

```text
Study: Smart Outdoor Lighting Brand Tracker
Markets: US and UK
Waves: Wave 1 and Wave 2
Target Brand: Govee
Competitors: Philips Hue and Ring
Modules: Awareness, Funnel, Imagery, Intent, Barriers, Channels
```

Use clearly labelled synthetic values in the prototype.

---

## 43. UX Acceptance Criteria

### 43.1 Upload and first Draft

- User can upload without formatting guidance beyond file limits.
- Processing stages are understandable.
- Partial failure does not hide successful content.
- User reaches a visible Dashboard Draft quickly.

### 43.2 Review

- Blocking issues are easy to distinguish from optional review.
- Original Excel evidence is reachable in no more than two interactions from a flagged visual.
- Mapping changes show impact scope before confirmation.
- Quick Validation supports representative sample confirmation.

### 43.3 Dashboard Builder

- Core and Suggested Pages are clearly separated.
- Creator can change existing official metric through AI conversation.
- Creator cannot accidentally calculate a missing metric.
- Layout changes remain within the grid.
- Creator-confirmed settings are not overwritten by AI regeneration.

### 43.4 Publish

- View as Client matches the live release.
- Publication gates link directly to required corrections.
- Share settings are understandable.
- Suspend and rollback are easy to find after publication.

### 43.5 Client

- Client cannot modify any underlying data or Dashboard definition.
- Client can understand unavailable-data states.
- Recommended questions use only published data.
- AI answers link to a supporting visual.

### 43.6 Replace Data

- Creator can replace a file without rebuilding compatible Mapping and design.
- Old and new data versions are clearly distinguished.
- Impact Report identifies changed visuals and Insight.
- Current Published Release is unchanged until a corrected release is published.

---

## 44. Analytics and UX Telemetry

Track product behavior without logging unnecessary confidential data.

### 44.1 Funnel metrics

- Project created.
- File uploaded.
- First Draft generated.
- Quick Validation completed.
- Blocking issues resolved.
- Dashboard published.
- Client link opened.

### 44.2 Quality metrics

- Manual correction count.
- Issue type frequency.
- Mapping reuse rate.
- Suggested page acceptance.
- Recommended chart acceptance.
- Insight approval / edit / rejection.
- Post-publish correction.

### 44.3 Usability metrics

- Time to first Draft.
- Time in Review.
- Time to Publish.
- Number of times user returns to Excel.
- Undo frequency.
- Abandoned processing jobs.

Do not capture raw research values in telemetry by default.

---

## 45. Open UX Decisions

The following require prototype testing:

- Whether the project-level page panel should be permanently visible or collapsible by default.
- Whether Review Summary opens before or after the first Dashboard preview.
- The optimal number of Quick Validation samples.
- Whether confidence scores are shown numerically or only as bands in the default Creator view.
- Whether publishing warnings use a separate yellow-outline status treatment.
- How many Suggested Pages to preview before using pagination.
- Default placement of Key Takeaways: top versus right side.
- Whether client recommended questions open in an AI drawer or an inline answer panel.
- Whether share-link password and expiry are required by default.
- Whether client-filter state may be included in PDF exports.
- Whether Creator Dashboard supports tablet editing in MVP.

---

## 46. Handoff to UI and Engineering

This UX specification should be followed by two implementation documents:

```text
04_Validation_and_Acceptance_Test_Plan.md
05_UI_Frontend_Engineering_Specification.md
```

The Front-end Engineering Specification should define:

- React component architecture.
- Design tokens.
- Tailwind configuration.
- Component states.
- Chart wrapper contracts.
- Grid behavior.
- Drawer behavior.
- Accessibility implementation.
- Responsive breakpoints.

The Validation Plan should define:

- Golden Tab Books.
- Screen-level acceptance tests.
- Data accuracy tests.
- Mapping correction tests.
- New Wave tests.
- Replace Data tests.
- Publish, Suspend and Rollback tests.
