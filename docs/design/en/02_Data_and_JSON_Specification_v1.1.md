# AI Research Dashboard Platform
## Data & JSON Specification

**Document ID:** 02_Data_and_JSON_Specification  
**Version:** v1.2
**Status:** Initial engineering specification  
**Date:** 14 August 2026
**Related document:** `01_AI_Research_Dashboard_PRD_MVP_v1.2.md`  
**Primary backend:** Python  

---

## 1. Purpose

This document defines the canonical data model and JSON contracts for the AI Research Dashboard Platform.

It provides a shared contract across:

- Excel Tab Book ingestion.
- Workbook and table extraction.
- AI-assisted semantic recognition.
- Creator review and correction.
- Analysis-module assembly.
- Dashboard generation.
- Tracking Wave updates.
- Replacement of incorrect data.
- Published client packages.
- Hosted HTML, PDF and PPT outputs.
- Client read-only AI questions.

The specification is designed to prevent the parser, semantic layer, Dashboard Builder and publishing service from creating incompatible representations of the same research result.

---

## 2. Scope

### 2.1 Included

- Project and version objects.
- Source-file ingestion metadata.
- Workbook, sheet and table extraction objects.
- Source lineage.
- Semantic metrics and dimensions.
- Base, Banner, Market and Wave definitions.
- Significance representation.
- Analysis modules combining one or more tables.
- Dashboard Plan and visual configuration.
- Insight and supporting evidence.
- Field-level confidence and review status.
- Availability and comparability status.
- Tracking updates and Replace Data.
- Published Data Package.
- Client permissions and recommended questions.
- JSON validation and schema evolution principles.

### 2.2 Not included

The document does not define:

- Final database vendor or physical database indexes.
- Detailed REST endpoint paths.
- Front-end component implementation.
- Raw respondent-level data model.
- Recalculation of significance.
- New respondent-level Net, Box Score or Banner calculation.
- Advanced modelling outputs.

These belong to later technical or analytical specifications.

---

## 3. Design Principles

### 3.1 Separate physical source from research meaning

A physical source location may change while the semantic meaning remains stable.

```text
Semantic Metric:
B2 = Aided Awareness

Source Binding V1:
Workbook A / Sheet1 / F18

Source Binding V2:
Workbook B / Awareness / G22
```

The system must not use an Excel cell reference as the permanent identity of a research metric.

### 3.2 Preserve original evidence

Extraction must preserve:

- Original workbook.
- Original sheet.
- Original cell or range.
- Raw value.
- Excel display value.
- Excel number format.
- Original label.
- Original significance marker.

AI-generated labels and canonical names never replace source evidence.

### 3.3 Use immutable versions

The following objects are immutable after finalization:

- Uploaded `SourceFileVersion`.
- Completed `ExtractionSnapshot`.
- `PublishedRelease`.
- Published Data Package.

Corrections produce a new version rather than overwriting historical evidence.

### 3.4 Make AI recommendations reversible

AI-recognized fields must contain:

- Suggested value.
- Confidence.
- Recognition method.
- Review status.
- User correction history.

Creator-confirmed values have priority over later AI inference.

### 3.5 Distinguish official and derived results

Every result is classified as one of:

- `official_tab_result`
- `derived_from_tab`
- `display_only`

The MVP does not create `recalculated_from_raw_data` results.

### 3.6 Never coerce unavailable data to zero

Unavailable values must retain a reason code. Client display may use `-`, but the backend stores why the value is unavailable.

### 3.7 Use stable identifiers

Display names may change. All relationships must use stable IDs, not labels.

Use UUID or ULID identifiers such as:

```text
project_id
source_file_version_id
extracted_table_id
semantic_metric_id
analysis_module_id
dashboard_id
published_release_id
```

### 3.8 Support multiple Dashboards per Project

The backend must support multiple Dashboard configurations sharing one Project semantic layer.

---

## 4. Object Relationship Overview

```text
Project
├── ProjectMember
├── SourceDataset
│   └── SourceFileVersion
│       └── WorkbookSnapshot
│           ├── SheetSnapshot
│           └── ExtractionSnapshot
│               └── ExtractedTable
│                   ├── ExtractedHeader
│                   ├── ExtractedRow
│                   ├── ExtractedCell
│                   └── SourceLineage
├── SemanticModel
│   ├── StudyContext
│   ├── SemanticQuestion
│   ├── SemanticMetric
│   ├── Dimension
│   ├── BannerSet
│   ├── BaseDefinition
│   ├── CanonicalEntityDictionary
│   └── ComparabilityRule
├── AnalysisModule
│   ├── ModuleMetricBinding
│   ├── DerivedMetricDefinition
│   └── ModuleValidation
├── Dashboard
│   └── DashboardVersion
│       ├── DashboardContext
│       ├── DashboardPage
│       ├── DashboardVisual
│       ├── Insight
│       └── ClientViewOption
└── PublishedRelease
    ├── PublishedDataPackage
    ├── ShareLink
    └── ClientQuestionDefinition
```

---

## 5. Common JSON Conventions

### 5.1 Naming

- JSON properties use `snake_case`.
- IDs end in `_id`.
- Lists use plural names.
- Boolean fields begin with `is_`, `has_`, `can_` or `should_` where practical.
- Date-time values use UTC ISO 8601.
- Date-only values use `YYYY-MM-DD`.

Example:

```json
{
  "created_at": "2026-08-13T06:30:00Z",
  "effective_date": "2026-08-13"
}
```

### 5.2 Schema metadata

Every top-level persisted document should contain:

```json
{
  "schema_name": "semantic_metric",
  "schema_version": "1.0.0",
  "object_id": "01J5...",
  "created_at": "2026-08-13T06:30:00Z",
  "created_by": "user_123",
  "updated_at": "2026-08-13T06:35:00Z",
  "updated_by": "user_123"
}
```

### 5.3 Null versus absent

- Use `null` when a known field has no value.
- Omit optional fields only when the field is not applicable to that object type.
- Do not use empty string to represent missing values.
- Do not use `0` to represent unavailable results.

### 5.4 Numbers

Numeric result objects should preserve:

- Raw numeric value.
- Display value.
- Unit.
- Precision source.
- Source format.

```json
{
  "raw_value": 0.4532,
  "display_value": "45.3%",
  "unit": "percentage",
  "decimal_places": 1,
  "precision_source": "excel_stored_value"
}
```

### 5.5 Enum strategy

Enums must be centralized and versioned. Unknown incoming values should be stored safely as `unknown`, with original text retained.

---

## 6. Core Enumerations

### 6.1 Object status

```json
[
  "draft",
  "processing",
  "active",
  "review_required",
  "confirmed",
  "published",
  "suspended",
  "superseded",
  "archived",
  "failed"
]
```

### 6.2 Review status

```json
[
  "ai_recognized",
  "auto_approved",
  "review_required",
  "user_corrected",
  "creator_verified",
  "conflict",
  "recognition_failed",
  "excluded"
]
```

### 6.3 Availability status

```json
[
  "available",
  "not_asked",
  "not_available",
  "suppressed",
  "not_applicable",
  "recognition_pending",
  "source_conflict"
]
```

### 6.4 Comparability status

```json
[
  "verified_comparable",
  "user_confirmed_comparable",
  "review_required",
  "not_comparable",
  "not_applicable"
]
```

### 6.5 Confidence band

```json
[
  "high",
  "medium",
  "low",
  "not_scored"
]
```

Thresholds are configuration values and are not hard-coded into persisted data.

### 6.6 Result source type

```json
[
  "official_tab_result",
  "derived_from_tab",
  "display_only"
]
```

### 6.7 Metric unit

```json
[
  "count",
  "percentage",
  "percentage_points",
  "relative_percentage_change",
  "mean",
  "mean_difference",
  "score",
  "index",
  "rank",
  "ratio",
  "currency",
  "text",
  "unknown"
]
```

### 6.8 Metric type

```json
[
  "count",
  "percentage",
  "weighted_percentage",
  "mean",
  "median",
  "standard_deviation",
  "top_box",
  "top_n_box",
  "bottom_box",
  "bottom_n_box",
  "custom_box",
  "net",
  "nps",
  "index",
  "rank",
  "difference",
  "relative_change",
  "conversion_rate",
  "distribution",
  "unknown"
]
```

### 6.9 Risk class

```json
[
  "data_blocking",
  "analysis_blocking",
  "publishing_warning",
  "optional_review"
]
```

---

## 7. Project Object

### 7.1 Purpose

`Project` is the long-lived container for a research engagement or Tracking study.

### 7.2 Example

```json
{
  "schema_name": "project",
  "schema_version": "1.0.0",
  "project_id": "prj_01J5A4C5V0",
  "project_name": "Smart Outdoor Lighting Tracker",
  "client_name": "Example Client",
  "project_type": "tracking",
  "primary_template_id": "brand_tracking",
  "additional_template_ids": [
    "campaign_evaluation"
  ],
  "default_language": "en",
  "supported_languages": [
    "en",
    "zh-CN"
  ],
  "status": "active",
  "owner_user_id": "usr_001",
  "created_at": "2026-08-13T06:30:00Z",
  "created_by": "usr_001",
  "updated_at": "2026-08-13T06:30:00Z",
  "updated_by": "usr_001"
}
```

### 7.3 Rules

- A Project may have multiple source datasets and Dashboards.
- Project status does not depend on one specific Published Release.
- Deleting or replacing a file does not delete the Project.
- Project-level confirmed rules are reusable across future Waves.

---

## 8. Project Membership and Roles

```json
{
  "project_member_id": "pm_001",
  "project_id": "prj_01J5A4C5V0",
  "user_id": "usr_001",
  "role": "creator",
  "can_publish": true,
  "can_replace_data": true,
  "can_permanently_delete": false,
  "status": "active"
}
```

MVP roles:

- `admin`
- `creator`

External clients do not require a Project membership object in MVP. Their access is represented by `ShareLink`.

---

## 9. Source Dataset and Source File Version

### 9.1 Source Dataset

A logical dataset identifies the intended Market, Wave or module across file replacements.

```json
{
  "source_dataset_id": "ds_us_w2",
  "project_id": "prj_01J5A4C5V0",
  "dataset_name": "US Wave 2 Tab Book",
  "market_id": "market_us",
  "wave_id": "wave_2",
  "module_scope": "full_tab_book",
  "active_file_version_id": "sfv_002",
  "status": "active"
}
```

### 9.2 Source File Version

```json
{
  "schema_name": "source_file_version",
  "schema_version": "1.0.0",
  "source_file_version_id": "sfv_002",
  "source_dataset_id": "ds_us_w2",
  "project_id": "prj_01J5A4C5V0",
  "version_number": 2,
  "original_file_name": "US_Wave2_Corrected.xlsx",
  "storage_uri": "secure://project/prj_01J5A4C5V0/source/sfv_002",
  "file_size_bytes": 18348276,
  "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "sha256": "a45f...",
  "upload_status": "active",
  "replacement_reason": "Incorrect values in the first Wave 2 tab book",
  "replaces_source_file_version_id": "sfv_001",
  "is_current": true,
  "uploaded_at": "2026-08-13T07:00:00Z",
  "uploaded_by": "usr_001"
}
```

### 9.3 File-version states

```json
[
  "uploading",
  "processing",
  "active",
  "replaced",
  "archived",
  "rejected",
  "pending_deletion",
  "deleted",
  "failed"
]
```

### 9.4 Rules

- Replacement creates a new version.
- Historical source files are not immediately physically deleted.
- Only one active version is current for a Source Dataset.
- Published Releases retain references to the exact file version used.

---

## 10. Processing Job

Workbook processing is asynchronous.

```json
{
  "processing_job_id": "job_001",
  "project_id": "prj_01J5A4C5V0",
  "source_file_version_id": "sfv_002",
  "job_type": "tab_book_ingestion",
  "status": "processing",
  "current_stage": "semantic_interpretation",
  "progress_percentage": 62,
  "stages": [
    {
      "stage": "file_validation",
      "status": "completed"
    },
    {
      "stage": "workbook_scan",
      "status": "completed"
    },
    {
      "stage": "table_detection",
      "status": "completed"
    },
    {
      "stage": "data_extraction",
      "status": "completed"
    },
    {
      "stage": "semantic_interpretation",
      "status": "processing"
    },
    {
      "stage": "draft_generation",
      "status": "pending"
    }
  ],
  "started_at": "2026-08-13T07:02:00Z",
  "completed_at": null,
  "error_summary": null
}
```

### 10.1 Idempotency

The processing request should include an idempotency key based on:

```text
source_file_version_id + pipeline_version + requested_operation
```

Repeated execution with the same key should not create duplicate Extraction Snapshots.

---

## 11. Workbook and Sheet Snapshot

### 11.1 Workbook Snapshot

```json
{
  "workbook_snapshot_id": "wb_002",
  "source_file_version_id": "sfv_002",
  "workbook_name": "US_Wave2_Corrected.xlsx",
  "detected_source_type": "quantum_tab_book",
  "sheet_count": 18,
  "formula_calculation_mode": "cached_values",
  "detected_markets": [
    "market_us"
  ],
  "detected_waves": [
    "wave_2"
  ],
  "overall_recognition_status": "review_required"
}
```

### 11.2 Sheet Snapshot

```json
{
  "sheet_snapshot_id": "sheet_awareness",
  "workbook_snapshot_id": "wb_002",
  "sheet_name": "Brand Awareness",
  "sheet_index": 3,
  "is_hidden": false,
  "used_range": "A1:W198",
  "sheet_type": "cross_tabulation",
  "detected_table_count": 6,
  "market_ids": [
    "market_us"
  ],
  "wave_ids": [
    "wave_2"
  ],
  "recognition_status": "auto_approved"
}
```

---

## 12. Extraction Snapshot

An `ExtractionSnapshot` freezes the physical interpretation of one source-file version for a particular parser pipeline version.

```json
{
  "extraction_snapshot_id": "ext_002",
  "source_file_version_id": "sfv_002",
  "workbook_snapshot_id": "wb_002",
  "parser_version": "0.3.0",
  "pipeline_version": "0.3.0",
  "status": "completed",
  "table_count": 186,
  "extracted_at": "2026-08-13T07:08:00Z",
  "supersedes_extraction_snapshot_id": "ext_001"
}
```

A new parser version may create a new Extraction Snapshot for the same source file without modifying the earlier snapshot.

### 12.1 Two-layer boundary-recognition artifacts

The ingestion pipeline uses versioned internal artifacts before writing final extraction objects. They support generic Tab Books and are never exposed through the Client API:

```text
WorkbookScanSummary / SheetOutline
    -> Layer 1 SheetOutline response
    -> DetailWindow
    -> Layer 2 TableBoundaryProposal
    -> BoundaryValidationResult
    -> ExtractedTable / ExtractedHeader / ExtractedRow / ExtractedCell
```

- `WorkbookScanSummary` is generated deterministically by Python and contains one `SheetOutline` per Sheet. It is an AI input summary, not a replacement for raw workbook evidence.
- The Layer 1 AI response proposes only coarse candidate ranges and dispatch status. It must favour recall: a non-table candidate is preferable to silently missing a physical table.
- `DetailWindow` is generated deterministically by Python from one or more Layer 1 candidate ranges. It contains bounded, position-based cell samples needed to identify exact regions.
- `TableBoundaryProposal` is structured Layer 2 AI output. It proposes physical table ranges and regions such as title, Header, Base, data, footnote and significance locations. It may include confidence and evidence references, but is never accepted as final source data.
- `BoundaryValidationResult` is generated by Python after re-reading the original workbook at the proposed coordinates. It validates Sheet bounds, regional overlap, source readability, Header construction, Base evidence and adjacent-table conflicts before final extraction objects are written.

Python does not identify table boundaries, question rows or Base rows before AI review. It only compacts observable workbook facts. A-column content is a high-priority clue, but neither question numbers nor table boundaries may be assumed to exist in column A.

### 12.2 Layer 1 `SheetOutline` contract

Layer 1 receives the workbook filename as a non-authoritative hint and, for every Sheet, only the following physical facts:

- Sheet name, used range, total row/column count and hidden-sheet state.
- Per-row row number; A-column value; first non-empty cell/value only when A is empty; non-empty count and column range; text, numeric and percentage-like counts.
- Exact single blank rows and compressed multi-blank row ranges.
- Relevant merged ranges and hidden row/column metadata.

It must not receive per-cell samples, source display values, number formats, formulas, style signals, or Python-generated semantic candidates such as a Base or question label.

For large Sheets the payload uses a shared `row_schema` and positional row arrays. The compact form is part of the contract:

```json
{
  "row_schema": [
    "row_number",
    "a_value",
    "first_non_empty_cell",
    "first_non_empty_value",
    "non_empty_count",
    "non_empty_column_range",
    "text_count",
    "numeric_count",
    "percentage_like_count"
  ],
  "rows": [[12, "Q1", null, null, 18, "A:R", 8, 10, 10]],
  "blank_rows": [[13, 15]]
}
```

Layer 1 may return `complete`, `needs_more_context`, `ambiguous`, or `not_a_table` per coarse range. Unclassified ranges must retain one reason: `sheet_context`, `non_tab_content`, `insufficient_context`, `ambiguous_structure`, or `oversized_or_complex`.

### 12.3 Layer 2 `DetailWindow` contract

Python creates a Detail Window from Layer 1 candidate ranges. The default context is 20 rows before and after the candidate and is configuration rather than a business rule. Nearby candidates with a gap of 20 rows or less may share one request, but retain independent candidate identities.

For every non-empty Detail Window row, Python may provide at most six position-based samples: A when non-empty, then left/middle/right positions. Each sample carries coordinate, raw value, best available display value and its source, data type, number format, formula-presence flag, cached-result availability and error code. Formula expressions are never sent. Merged ranges and hidden metadata remain available.

Layer 2 may request more context. Each request may extend no more than 100 rows above or below, and the combined continuation count is at most two. Fixed overlap is a cost optimisation only, never proof that a table is complete.

Layer 2 returns absolute Excel coordinates. `title_rows`, `header_rows`, `base_rows`, `data_rows`, `footnote_rows` and `significance_locations` are arrays; absent regions are empty arrays. Title, Header, Base, data and footnote regions must not overlap. Significance may overlap Header or data only when its declared layout explains the overlap.

### 12.4 Boundary-validation outcomes

Python assigns exactly one outcome to each proposal: `accepted`, `adjusted`, `rejected`, or `review_required`.

Automatic adjustment is limited to low-risk physical corrections: trimming fully blank external rows/columns; including a merged title/Header range; correcting an obvious terminal coordinate or Sheet-bound issue; including a verified adjacent significance row/column; and classifying verified trailing footnotes. It must not make business guesses, inherit a Base, merge tables, or resolve arbitrary overlap.

The initial validation categories are `range_invalid`, `structure_unresolved`, `data_unreadable`, `significance_unresolved`, and `source_unavailable`. Detailed subcodes are added only after an observed PoC failure needs them.

Example proposal:

```json
{
  "schema_name": "table_boundary_proposal",
  "schema_version": "1.0.0",
  "sheet_snapshot_id": "sheet_awareness",
  "proposals": [
    {
      "proposal_id": "proposal_001",
      "source_range": "A8:W31",
      "regions": {
        "title_rows": [8],
        "header_rows": [9, 10, 11],
        "base_rows": [12],
        "data_rows": [13, 28],
        "footnote_rows": [29, 30, 31],
        "significance_locations": []
      },
      "question_number_hint": "B2",
      "confidence": {
        "table_boundary": 0.92,
        "header_region": 0.84
      },
      "proposal_status": "suggested"
    }
  ]
}
```

---

## 13. Extracted Table

### 13.1 Purpose

`ExtractedTable` represents one physical table, not yet the confirmed business meaning.

### 13.2 Example

```json
{
  "schema_name": "extracted_table",
  "schema_version": "1.0.0",
  "extracted_table_id": "tbl_b2_w2_us",
  "extraction_snapshot_id": "ext_002",
  "sheet_snapshot_id": "sheet_awareness",
  "source_range": "A8:W31",
  "table_identity_hash": "sha256:...",
  "detected_question_number": "B2",
  "detected_question_text": "Which of the following brands are you aware of?",
  "detected_table_title": "Aided Brand Awareness",
  "table_variant": "percentage",
  "table_type": "multiple_response_cross_tab",
  "structure": {
    "title_rows": [8],
    "header_rows": [9, 10, 11],
    "base_rows": [12],
    "data_row_start": 13,
    "data_row_end": 28,
    "footnote_rows": [29, 30, 31],
    "data_column_start": 3,
    "data_column_end": 23
  },
  "significance_schema": {
    "presence": "present",
    "layout": "separate_label_row",
    "label_rows": [11],
    "label_map": {
      "A": "hdr_us_total",
      "B": "hdr_us_male"
    },
    "test_definition": {
      "confidence_level": 0.95,
      "method": "unknown",
      "source_cells": ["A7"]
    },
    "parse_status": "mapped"
  },
  "field_confidence": {
    "table_boundary": {
      "score": 0.99,
      "band": "high",
      "method": "layout_rules"
    },
    "numeric_extraction": {
      "score": 0.99,
      "band": "high",
      "method": "excel_parser"
    },
    "header_mapping": {
      "score": 0.97,
      "band": "high",
      "method": "hierarchy_rules_plus_ai"
    },
    "question_number": {
      "score": 0.98,
      "band": "high",
      "method": "regex_and_position"
    },
    "base_definition": {
      "score": 0.78,
      "band": "medium",
      "method": "semantic_ai"
    }
  },
  "review_status": "review_required",
  "review_risk_class": "analysis_blocking"
}
```

### 13.3 Table variant

```json
[
  "count",
  "percentage",
  "weighted_percentage",
  "mean",
  "distribution",
  "significance",
  "combined",
  "unknown"
]
```

### 13.4 Significance schema

`significance_schema` describes how official significance is physically represented in one extracted table. It must be detected per physical table; it must not be inferred from the workbook, Sheet name, or source-system name alone.

Supported `layout` values are:

```json
[
  "header_inline",
  "separate_label_row",
  "adjacent_column",
  "following_row",
  "inline_value",
  "separate_sheet",
  "mixed",
  "none",
  "unknown"
]
```

The `label_map` maps the supplied label to an `extracted_header_id`, not to an Excel column letter. Labels are case-sensitive: `A` and `a` are distinct unless an explicit source rule confirms otherwise. The schema must retain original marker locations and test-definition evidence where available.

An unknown or incomplete mapping retains the original marker and creates a Review issue. The system must not guess missing labels or derive statistical direction from a letter marker.

### 13.5 Header depth and automatic acceptance

MVP natively supports one to three Header levels per physical table. Each `ExtractedTable` owns its Header paths; different tables are not required to use the same Banner structure.

If a table has more than three Header levels, extraction preserves every original Header cell, merged range and complete path, and adds `header_depth_exceeds_mvp` as a warning. The table cannot automatically participate in cross-table variant linking, Banner comparison, complex visuals or publication until confirmed.

An AI boundary proposal with medium confidence may be accepted without manual Review when deterministic validation passes for the boundary, Header mapping, explicit Base where present, numeric extraction, significance mapping where present, and table identity conflicts. Accepted medium-confidence tables must receive elevated risk weight in Quick Data Validation. Review is an exception path for validation failures, conflicts, unknown formats and validation-sample failures, not the normal extraction path.

---

## 14. Extracted Header

```json
{
  "extracted_header_id": "hdr_us_male",
  "extracted_table_id": "tbl_b2_w2_us",
  "column_index": 5,
  "column_letter": "E",
  "source_range": "E9:E11",
  "header_path": [
    "US",
    "Gender",
    "Male"
  ],
  "display_label": "Male",
  "detected_banner_group": "Gender",
  "detected_banner_category": "Male",
  "detected_market_id": "market_us",
  "detected_wave_id": "wave_2",
  "significance_column_code": "A",
  "review_status": "auto_approved"
}
```

### 14.1 Rules

- Retain the entire header path.
- Do not flatten `US -> Gender -> Male` to only `Male` in persisted extraction.
- Repeated labels must remain linked to their parent hierarchy.
- `significance_column_code` is a source-supplied, case-sensitive comparison label. It is not an Excel column letter and is interpreted only through the parent table's `significance_schema.label_map`.

---

## 15. Extracted Row

```json
{
  "extracted_row_id": "row_govee",
  "extracted_table_id": "tbl_b2_w2_us",
  "row_index": 15,
  "source_range": "A15:W15",
  "original_label": "Govee",
  "detected_row_type": "answer_option",
  "detected_metric_type": "percentage",
  "option_code": null,
  "is_net": false,
  "is_total": false,
  "is_other": false,
  "is_none": false,
  "review_status": "auto_approved"
}
```

### 15.1 Row type

```json
[
  "base",
  "answer_option",
  "brand",
  "statement",
  "mean",
  "median",
  "standard_deviation",
  "box_score",
  "net",
  "rank",
  "index",
  "difference",
  "footnote",
  "separator",
  "unknown"
]
```

---

## 16. Extracted Cell and Value

```json
{
  "extracted_cell_id": "cell_b2_govee_total",
  "extracted_table_id": "tbl_b2_w2_us",
  "extracted_row_id": "row_govee",
  "extracted_header_id": "hdr_us_total",
  "source_cell": "D15",
  "raw_value": 0.6237,
  "raw_type": "number",
  "excel_display_value": "62%",
  "excel_number_format": "0%",
  "formula": null,
  "formula_cached_value": null,
  "parsed_value": 0.6237,
  "parsed_unit": "percentage",
  "availability_status": "available",
  "original_significance_marker": "B",
  "significance_marker_source_cell": "E15",
  "significance_representation": "adjacent_column",
  "significance_referenced_header_ids": [
    "hdr_us_male"
  ],
  "significance_mapping_status": "mapped",
  "is_suppressed": false,
  "review_status": "auto_approved"
}
```

### 16.1 Precision source

```json
[
  "excel_stored_value",
  "formula_cached_value",
  "displayed_value_only",
  "text_parsed",
  "unknown"
]
```

### 16.2 Special display values

The parser should normalize visible symbols but preserve original text.

```json
{
  "original_display_text": "—",
  "parsed_value": null,
  "availability_status": "not_asked",
  "client_display_value": "-"
}
```

For an inline value such as `20%ABC`, extraction preserves the original text while splitting a verified numeric display and marker:

```json
{
  "raw_value": "20%ABC",
  "excel_display_value": "20%ABC",
  "parsed_value": 0.2,
  "parsed_unit": "percentage",
  "original_significance_marker": "ABC",
  "significance_representation": "inline_value",
  "significance_mapping_status": "mapped"
}
```

The parser may split a marker only after the parent table's label map is available. If a marker cannot be mapped completely, the original display text remains authoritative and the cell requires Review.

### 16.3 Numeric parsing and qualifiers

Extraction preserves `raw_value`, `excel_display_value`, `parsed_value`, `parsed_unit`, `precision_source` and `availability_status`. `parsed_value` is written only when the source value, display format and table context provide sufficient deterministic evidence; the parser must not guess whether an unformatted `20` means a Count, Percentage or other measure.

For a source display such as `<1%`, use a constraint rather than a fabricated exact value:

```json
{
  "excel_display_value": "<1%",
  "parsed_value": null,
  "parsed_unit": "percentage",
  "value_constraint": {
    "operator": "less_than",
    "upper_bound": 0.01
  },
  "availability_status": "available"
}
```

Constrained values may be displayed using their original text but must not participate in exact sorting, differences, comparisons or formulas.

For a source value such as `60*` or `18**`, retain the display text and parse the numeric portion only when unambiguous:

```json
{
  "excel_display_value": "18**",
  "parsed_value": 18,
  "parsed_unit": "count",
  "source_qualifiers": ["very_small_base"],
  "availability_status": "available"
}
```

`*` maps to `small_base` and `**` maps to `very_small_base` when supported by the source footnote. Qualifiers restrict automatic significance wording, Insight generation and high-risk comparisons, but do not convert the value to zero or unavailable.

Where a physical table repeats a verified Count row followed by a Percentage row for the same option and Header columns, it may use `table_variant: "combined"`. Each metric keeps separate source cells and official results. This requires a stable repeated pattern, matching data columns and unambiguous Count/Percentage formats; otherwise extraction retains independent rows and requires Review.

---

## 17. Source Lineage

Every value used in a Dashboard must resolve to a lineage object.

```json
{
  "source_lineage_id": "lin_001",
  "project_id": "prj_01J5A4C5V0",
  "source_file_version_id": "sfv_002",
  "workbook_snapshot_id": "wb_002",
  "sheet_snapshot_id": "sheet_awareness",
  "extracted_table_id": "tbl_b2_w2_us",
  "extracted_row_id": "row_govee",
  "extracted_header_id": "hdr_us_total",
  "extracted_cell_id": "cell_b2_govee_total",
  "source_reference": "Brand Awareness!D15"
}
```

For a derived result, lineage references all contributing source results.

---

## 18. Field-level Confidence

### 18.1 Confidence object

```json
{
  "score": 0.84,
  "band": "medium",
  "method": "semantic_ai",
  "model_or_rule_version": "semantic_classifier_0.2.0",
  "evidence": [
    "table_title",
    "row_labels",
    "nearby_question_context"
  ],
  "review_risk_class": "publishing_warning"
}
```

### 18.2 Required confidence fields

At minimum:

- `table_boundary`
- `numeric_extraction`
- `header_mapping`
- `question_number`
- `question_text`
- `base_definition`
- `metric_type`
- `research_module`
- `market_mapping`
- `wave_mapping`
- `significance_mapping`

### 18.3 Blocking logic

The platform evaluates risk by field:

```json
{
  "blocking_rule": {
    "field": "header_mapping",
    "condition": "band in ['low', 'not_scored']",
    "applies_when": "table_used_in_published_dashboard",
    "outcome": "block_publication"
  }
}
```

The average table confidence must never override a critical low-confidence field.

---

## 19. Recognition Decision and Audit

```json
{
  "recognition_decision_id": "rd_001",
  "object_type": "extracted_table",
  "object_id": "tbl_b2_w2_us",
  "field_name": "base_definition",
  "previous_value": "Those answering",
  "proposed_value": "All qualified respondents",
  "final_value": "All qualified respondents",
  "decision_source": "creator_review",
  "decision_status": "creator_verified",
  "changed_by": "usr_001",
  "changed_at": "2026-08-13T07:30:00Z",
  "reason": "Confirmed from Base row and surrounding tables",
  "affected_object_ids": [
    "metric_awareness",
    "module_brand_funnel"
  ]
}
```

### 19.1 Decision priority

```text
Creator-confirmed project rule
> Creator-confirmed object correction
> inherited previous-wave mapping
> deterministic rule
> AI recommendation
> system fallback
```

---

## 20. Study Context

```json
{
  "study_context_id": "ctx_001",
  "project_id": "prj_01J5A4C5V0",
  "primary_template_id": "brand_tracking",
  "target_entity_ids": [
    "brand_govee"
  ],
  "competitor_entity_ids": [
    "brand_philips_hue",
    "brand_ring"
  ],
  "current_wave_id": "wave_2",
  "comparison_wave_id": "wave_1",
  "priority_market_ids": [
    "market_us",
    "market_uk"
  ],
  "priority_metric_ids": [
    "metric_awareness",
    "metric_current_use",
    "metric_purchase_intent"
  ],
  "benchmark_type": "previous_wave",
  "source": "creator_confirmed"
}
```

---

## 21. Market and Wave

### 21.1 Market

```json
{
  "market_id": "market_us",
  "project_id": "prj_01J5A4C5V0",
  "canonical_name": "United States",
  "display_name": "US",
  "known_labels": [
    "US",
    "USA",
    "United States"
  ],
  "sort_order": 1,
  "status": "active"
}
```

### 21.2 Wave

```json
{
  "wave_id": "wave_2",
  "project_id": "prj_01J5A4C5V0",
  "canonical_name": "Wave 2",
  "display_name": "Wave 2",
  "known_labels": [
    "W2",
    "Current",
    "Wave 2"
  ],
  "sequence_number": 2,
  "fieldwork_start": null,
  "fieldwork_end": null,
  "status": "active"
}
```

### 21.3 Automatic correction

If a user says `Current means Wave 2`, the conversation opens a structured review. The confirmed relationship is stored in `known_labels` and the Recognition Decision log.

---

## 22. Dimension and Banner Model

### 22.1 Dimension

```json
{
  "dimension_id": "dim_gender",
  "project_id": "prj_01J5A4C5V0",
  "canonical_name": "Gender",
  "display_name": "Gender",
  "dimension_type": "demographic",
  "categories": [
    {
      "category_id": "gender_male",
      "canonical_name": "Male",
      "display_name": "Male",
      "sort_order": 1
    },
    {
      "category_id": "gender_female",
      "canonical_name": "Female",
      "display_name": "Female",
      "sort_order": 2
    }
  ]
}
```

### 22.2 Banner Set

```json
{
  "banner_set_id": "banner_total_gender_age",
  "project_id": "prj_01J5A4C5V0",
  "banner_set_name": "Total + Gender + Age",
  "dimension_ids": [
    "dim_total",
    "dim_gender",
    "dim_age"
  ],
  "significance_column_map": {
    "A": "gender_male",
    "B": "gender_female",
    "C": "age_20_29",
    "D": "age_30_39"
  }
}
```

### 22.3 Available combination matrix

```json
{
  "available_combination_id": "comb_market_gender",
  "project_id": "prj_01J5A4C5V0",
  "dimension_ids": [
    "dim_market",
    "dim_gender"
  ],
  "is_available": true,
  "available_category_combinations": [
    ["market_us", "gender_male"],
    ["market_us", "gender_female"],
    ["market_uk", "gender_male"],
    ["market_uk", "gender_female"]
  ],
  "availability_scope": {
    "semantic_metric_ids": [
      "metric_awareness",
      "metric_current_use"
    ],
    "analysis_module_ids": [
      "module_awareness",
      "module_brand_funnel"
    ]
  }
}
```

A combination not represented in this matrix cannot be selected or estimated.

---

## 23. Base Definition

```json
{
  "base_definition_id": "base_all_qualified",
  "project_id": "prj_01J5A4C5V0",
  "canonical_name": "All qualified respondents",
  "display_name": "All respondents",
  "original_labels": [
    "All qualified respondents",
    "All respondents"
  ],
  "base_type": "total_qualified",
  "weighted_status": "unknown",
  "review_status": "creator_verified"
}
```

### 23.1 Base result

```json
{
  "base_result_id": "base_result_b2_total",
  "base_definition_id": "base_all_qualified",
  "semantic_metric_id": "metric_awareness",
  "market_id": "market_us",
  "wave_id": "wave_2",
  "dimension_category_ids": [
    "total"
  ],
  "unweighted_base": 602,
  "weighted_base": 600.4,
  "display_value": "n=602",
  "source_lineage_ids": [
    "lin_base_b2_total"
  ]
}
```

### 23.2 Base comparability

```json
{
  "base_comparison_id": "base_cmp_001",
  "left_base_definition_id": "base_all_qualified",
  "right_base_definition_id": "base_all_qualified",
  "status": "verified_comparable",
  "reason": "Canonical definitions match"
}
```

Equal sample size does not imply equal Base definition.

---

## 24. Canonical Entity Dictionary

The dictionary supports Brands, Products, Concepts, answer options and other reusable entities.

### 24.1 Entity

```json
{
  "canonical_entity_id": "brand_govee",
  "project_id": "prj_01J5A4C5V0",
  "entity_type": "brand",
  "canonical_name": "Govee",
  "display_name": "Govee",
  "known_labels": [
    {
      "label": "Govee",
      "market_id": "market_us",
      "wave_id": "wave_1",
      "mapping_status": "creator_verified"
    }
  ],
  "parent_entity_id": null,
  "display_order": 1,
  "display_color": "#FCC53B",
  "status": "active"
}
```

### 24.2 Cross-wave option mapping

```json
{
  "option_mapping_id": "omap_price_high",
  "project_id": "prj_01J5A4C5V0",
  "canonical_entity_id": "option_price_high",
  "mapping_type": "cross_wave_one_to_one",
  "source_options": [
    {
      "wave_id": "wave_1",
      "original_label": "Too expensive",
      "extracted_row_id": "row_w1_expensive"
    },
    {
      "wave_id": "wave_2",
      "original_label": "Price is too high",
      "extracted_row_id": "row_w2_price_high"
    }
  ],
  "mapping_status": "creator_verified",
  "comparability_status": "user_confirmed_comparable",
  "trend_enabled": true,
  "difference_enabled": true
}
```

### 24.3 One-to-many and many-to-one

For aggregate Tab Books:

- Do not sum split options.
- Do not combine merged options.
- Do not enable direct trend unless an official Net exists.

```json
{
  "mapping_type": "one_to_many",
  "trend_enabled": false,
  "difference_enabled": false,
  "reason": "Aggregate percentages cannot be deduplicated"
}
```

---

## 25. Semantic Question

```json
{
  "semantic_question_id": "q_b2",
  "project_id": "prj_01J5A4C5V0",
  "canonical_question_number": "B2",
  "original_question_text_by_wave": {
    "wave_1": "Which brands are you aware of?",
    "wave_2": "Which of the following brands are you aware of?"
  },
  "dashboard_display_title": "Aided Brand Awareness",
  "question_family": "brand_awareness",
  "question_type": "multiple_response",
  "primary_research_module": "brand_awareness",
  "review_status": "creator_verified"
}
```

Original question text is never overwritten by a short Dashboard title.

---

## 26. Semantic Metric

### 26.1 Example

```json
{
  "schema_name": "semantic_metric",
  "schema_version": "1.0.0",
  "semantic_metric_id": "metric_awareness",
  "project_id": "prj_01J5A4C5V0",
  "semantic_question_id": "q_b2",
  "canonical_name": "Aided Awareness",
  "display_name": "Aided Awareness",
  "metric_type": "percentage",
  "unit": "percentage",
  "entity_type": "brand",
  "base_definition_id": "base_all_qualified",
  "default_display_format": "0%",
  "research_module": "brand_awareness",
  "result_source_type": "official_tab_result",
  "review_status": "creator_verified"
}
```

### 26.2 Metric version

A Metric may vary by Wave.

```json
{
  "semantic_metric_version_id": "metric_awareness_w2",
  "semantic_metric_id": "metric_awareness",
  "wave_id": "wave_2",
  "market_id": "market_us",
  "base_definition_id": "base_all_qualified",
  "metric_type": "percentage",
  "unit": "percentage",
  "definition_status": "unchanged",
  "comparability_status": "verified_comparable",
  "source_table_variant": "percentage"
}
```

### 26.3 Definition status

```json
[
  "unchanged",
  "label_changed",
  "wording_changed_minor",
  "wording_changed_material",
  "base_changed",
  "scale_changed",
  "option_structure_changed",
  "unknown"
]
```

---

## 27. Official Result

```json
{
  "official_result_id": "res_b2_govee_w2_total",
  "semantic_metric_id": "metric_awareness",
  "semantic_metric_version_id": "metric_awareness_w2",
  "canonical_entity_id": "brand_govee",
  "market_id": "market_us",
  "wave_id": "wave_2",
  "dimension_category_ids": [
    "total"
  ],
  "value": 0.6237,
  "unit": "percentage",
  "display_value": "62%",
  "source_type": "official_tab_result",
  "availability_status": "available",
  "base_result_id": "base_result_b2_total",
  "significance_result_ids": [
    "sig_b2_govee_total"
  ],
  "source_lineage_ids": [
    "lin_001"
  ],
  "precision_source": "excel_stored_value",
  "review_status": "creator_verified"
}
```

---

## 28. Official Significance

### 28.1 Result

```json
{
  "significance_result_id": "sig_b2_govee_male",
  "official_result_id": "res_b2_govee_male",
  "source": "official_tab_significance",
  "comparison_type": "column_comparison",
  "direction": "unknown",
  "direction_source": "not_available",
  "comparison_target_category_ids": [
    "gender_female"
  ],
  "confidence_level": 0.95,
  "confidence_level_source": "table_footnote",
  "original_marker": "B",
  "source_lineage_ids": [
    "lin_sig_b2_govee_male"
  ],
  "review_status": "creator_verified"
}
```

`direction` may be `higher`, `lower`, or `unknown`. A column-reference marker such as `ABC` identifies comparison targets only; it does not independently establish direction. The parser must use `unknown` unless the official Tab explicitly supplies direction evidence. It must never infer direction by comparing aggregate values.

### 28.2 If confidence level is unknown

```json
{
  "confidence_level": null,
  "review_status": "review_required",
  "warning_code": "confidence_level_not_identified"
}
```

### 28.3 Presentation

Internal view may retain letters. Client view uses one of:

```json
[
  "hidden",
  "visual_marker_only",
  "visual_marker_with_tooltip",
  "full_statistical_detail"
]
```

If official significance is absent, the result may be published without a significance display. If markers exist but mapping is unresolved, numerical results may be published with significance hidden. Published visuals, Insights and AI answers must not claim statistical significance for unresolved markers.

---

## 29. Derived Metric Definition

### 29.1 Wave difference

```json
{
  "derived_metric_definition_id": "dm_awareness_wave_change",
  "project_id": "prj_01J5A4C5V0",
  "canonical_name": "Awareness Wave Change",
  "metric_type": "difference",
  "unit": "percentage_points",
  "formula_type": "subtract",
  "formula_expression": "current_value - previous_value",
  "input_metric_ids": [
    "metric_awareness"
  ],
  "validation_rule_ids": [
    "same_market",
    "same_banner",
    "same_entity",
    "comparable_metric_version"
  ],
  "result_source_type": "derived_from_tab"
}
```

### 29.2 Funnel conversion

```json
{
  "derived_metric_definition_id": "dm_awareness_to_trial",
  "canonical_name": "Awareness to Ever Used Conversion",
  "metric_type": "conversion_rate",
  "unit": "percentage",
  "formula_type": "ratio",
  "formula_expression": "lower_stage / upper_stage",
  "numerator_metric_id": "metric_ever_used",
  "denominator_metric_id": "metric_awareness",
  "required_validation_rules": [
    "same_brand",
    "same_market",
    "same_wave",
    "same_banner",
    "base_relationship_valid",
    "stage_relationship_valid"
  ]
}
```

### 29.3 Derived result

```json
{
  "derived_result_id": "dres_awareness_change_govee",
  "derived_metric_definition_id": "dm_awareness_wave_change",
  "input_official_result_ids": [
    "res_awareness_govee_w1",
    "res_awareness_govee_w2"
  ],
  "value": 0.0492,
  "unit": "percentage_points",
  "display_value": "+5pp",
  "calculation_precision": "excel_stored_value",
  "comparability_status": "verified_comparable",
  "significance_status": "not_available",
  "source_type": "derived_from_tab"
}
```

A derived result does not inherit significance from its inputs.

---

## 30. Analysis Module

### 30.1 Brand Funnel example

```json
{
  "schema_name": "analysis_module",
  "schema_version": "1.0.0",
  "analysis_module_id": "module_brand_funnel",
  "project_id": "prj_01J5A4C5V0",
  "module_type": "brand_funnel",
  "module_name": "Brand Funnel",
  "creation_source": "creator_confirmed_ai_suggestion",
  "metric_bindings": [
    {
      "semantic_metric_id": "metric_tom",
      "role": "funnel_stage",
      "stage_order": 1
    },
    {
      "semantic_metric_id": "metric_aided_awareness",
      "role": "funnel_stage",
      "stage_order": 2
    },
    {
      "semantic_metric_id": "metric_ever_used",
      "role": "funnel_stage",
      "stage_order": 3
    },
    {
      "semantic_metric_id": "metric_current_use",
      "role": "funnel_stage",
      "stage_order": 4
    }
  ],
  "derived_metric_definition_ids": [
    "dm_awareness_to_trial"
  ],
  "supported_dimension_ids": [
    "dim_market",
    "dim_wave",
    "dim_gender"
  ],
  "validation_status": "review_required",
  "review_status": "creator_verified"
}
```

### 30.2 Combination source

```json
[
  "inherited_previous_wave",
  "high_confidence_auto_combination",
  "ai_suggested",
  "creator_defined"
]
```

### 30.3 Module validation

```json
{
  "module_validation_id": "mval_funnel_001",
  "analysis_module_id": "module_brand_funnel",
  "checks": [
    {
      "check": "same_entity_dictionary",
      "status": "passed"
    },
    {
      "check": "base_comparability",
      "status": "review_required"
    }
  ],
  "overall_status": "review_required",
  "blocks_publishing": false,
  "blocks_derived_conversion": true
}
```

The Funnel chart may publish while conversion is withheld.

---

## 31. Dashboard

```json
{
  "dashboard_id": "dash_client_full",
  "project_id": "prj_01J5A4C5V0",
  "dashboard_name": "Client Research Dashboard",
  "dashboard_type": "client_full",
  "status": "active",
  "current_draft_version_id": "dashv_003"
}
```

### 31.1 Dashboard version

```json
{
  "dashboard_version_id": "dashv_003",
  "dashboard_id": "dash_client_full",
  "version_number": "2.1",
  "version_type": "minor",
  "status": "draft",
  "based_on_dashboard_version_id": "dashv_002",
  "semantic_model_version_id": "semv_004",
  "created_reason": "Wave 2 corrected data replacement",
  "created_at": "2026-08-13T08:00:00Z"
}
```

---

## 32. Dashboard Context

```json
{
  "dashboard_context_id": "dctx_003",
  "dashboard_version_id": "dashv_003",
  "target_entity_ids": [
    "brand_govee"
  ],
  "competitor_entity_ids": [
    "brand_philips_hue",
    "brand_ring"
  ],
  "current_wave_id": "wave_2",
  "comparison_wave_id": "wave_1",
  "priority_market_ids": [
    "market_us"
  ],
  "priority_metric_ids": [
    "metric_awareness",
    "metric_current_use",
    "metric_purchase_intent"
  ],
  "default_filter_state": {
    "market_id": "market_us",
    "wave_id": "wave_2"
  },
  "source": "creator_confirmed"
}
```

---

## 33. Dashboard Page

```json
{
  "dashboard_page_id": "page_brand_funnel",
  "dashboard_version_id": "dashv_003",
  "page_name": "Brand Funnel",
  "page_category": "core",
  "page_order": 3,
  "layout": {
    "layout_type": "grid",
    "columns": 12,
    "responsive": true
  },
  "client_visible": true,
  "review_status": "creator_verified"
}
```

### 33.1 Page category

```json
[
  "core",
  "suggested",
  "appendix",
  "internal",
  "excluded"
]
```

---

## 34. Dashboard Visual

```json
{
  "dashboard_visual_id": "visual_brand_funnel",
  "dashboard_page_id": "page_brand_funnel",
  "analysis_module_id": "module_brand_funnel",
  "visual_type": "funnel_chart",
  "title": "Brand Funnel",
  "subtitle": "US Total, Wave 2",
  "metric_ids": [
    "metric_tom",
    "metric_aided_awareness",
    "metric_ever_used",
    "metric_current_use"
  ],
  "entity_ids": [
    "brand_govee",
    "brand_philips_hue",
    "brand_ring"
  ],
  "layout_position": {
    "row": 2,
    "column_start": 1,
    "column_span": 8
  },
  "sort_rule_id": "sort_target_first",
  "number_format_rule_id": "fmt_percentage_0",
  "base_display_mode": "standard",
  "significance_display_mode": "visual_marker_only",
  "client_visible": true,
  "source": "creator_confirmed"
}
```

### 34.1 Visual type

```json
[
  "kpi_card",
  "horizontal_bar",
  "vertical_bar",
  "grouped_bar",
  "line_chart",
  "slope_chart",
  "dot_plot",
  "heatmap",
  "profile_chart",
  "funnel_chart",
  "conversion_table",
  "data_table",
  "ranking_table",
  "text_panel"
]
```

---

## 35. Sort Rule

```json
{
  "sort_rule_id": "sort_target_first",
  "rule_type": "hybrid",
  "pinned_top_entity_ids": [
    "brand_govee",
    "brand_philips_hue",
    "brand_ring"
  ],
  "remaining_sort": {
    "semantic_metric_id": "metric_awareness",
    "wave_id": "wave_2",
    "direction": "descending"
  },
  "pinned_bottom_entity_ids": [
    "option_other",
    "option_none"
  ]
}
```

---

## 36. Number Format Rule

```json
{
  "number_format_rule_id": "fmt_percentage_0",
  "scope_type": "project",
  "unit": "percentage",
  "format_pattern": "0%",
  "positive_sign": false,
  "negative_sign": true,
  "small_value_rule": "show_less_than_one",
  "null_display": "-"
}
```

Priority:

```text
Metric rule
> Module rule
> Project rule
> Original Tab format
> System default
```

---

## 37. Theme

```json
{
  "theme_id": "theme_client_001",
  "project_id": "prj_01J5A4C5V0",
  "theme_name": "Kantar AI Colleague Light",
  "primary_background": "#1D1D1B",
  "workspace_background": "#F5F5F5",
  "accent_color": "#FCC53B",
  "ai_callout_background": "#FFF9EB",
  "secondary_text_color": "#6F7684",
  "border_color": "#E5E7EB",
  "font_family": "Inter, Source Han Sans SC, Noto Sans CJK SC, sans-serif",
  "numeric_font_family": "JetBrains Mono, monospace",
  "brand_color_dictionary": {
    "brand_govee": "#FCC53B",
    "brand_philips_hue": "#4B63C3",
    "brand_ring": "#6F7684"
  },
  "footer_text": "Confidential",
  "status": "creator_verified"
}
```

---

## 38. Filter Definition

```json
{
  "filter_definition_id": "filter_market",
  "dashboard_version_id": "dashv_003",
  "dimension_id": "dim_market",
  "filter_class": "primary",
  "scope": "global",
  "applicable_page_ids": [],
  "allowed_category_ids": [
    "market_us",
    "market_uk"
  ],
  "default_category_ids": [
    "market_us"
  ],
  "client_visible": true,
  "availability_rule": "use_available_combination_matrix"
}
```

### 38.1 Filter class

```json
[
  "primary",
  "secondary",
  "analysis_only",
  "hidden_technical"
]
```

### 38.2 Unsupported combination response

```json
{
  "data_status": "unavailable",
  "reason_code": "filter_combination_not_available",
  "client_message": "This breakdown is not available for the selected filters.",
  "fallback_applied": false
}
```

---

## 39. Client View Option

```json
{
  "client_view_option_id": "cvo_imagery_001",
  "dashboard_visual_id": "visual_brand_imagery",
  "is_enabled": true,
  "allowed_visual_types": [
    "heatmap",
    "profile_chart",
    "data_table"
  ],
  "allowed_metric_ids": [
    "metric_imagery_t2b",
    "metric_imagery_mean"
  ],
  "allowed_sort_rule_ids": [
    "sort_original",
    "sort_current_desc"
  ],
  "default_state": {
    "visual_type": "heatmap",
    "metric_id": "metric_imagery_t2b",
    "sort_rule_id": "sort_original"
  },
  "changes_persist": false
}
```

Client state is session-only and cannot update Dashboard Version JSON.

---

## 40. Insight

### 40.1 Insight object

```json
{
  "insight_id": "ins_awareness_change",
  "dashboard_version_id": "dashv_003",
  "dashboard_page_id": "page_overview",
  "dashboard_visual_id": "visual_awareness_trend",
  "insight_type": "wave_change",
  "statement": "Govee awareness increased by 5 percentage points versus Wave 1.",
  "evidence_rule": {
    "rule_type": "metric_difference",
    "semantic_metric_id": "metric_awareness",
    "canonical_entity_id": "brand_govee",
    "current_wave_id": "wave_2",
    "comparison_wave_id": "wave_1",
    "condition": "difference_gt_0"
  },
  "supporting_result_ids": [
    "res_awareness_govee_w1",
    "res_awareness_govee_w2",
    "dres_awareness_change_govee"
  ],
  "significance_status": "not_available",
  "priority_score": 8.2,
  "priority_factors": [
    "target_brand",
    "priority_metric",
    "large_change"
  ],
  "creator_edited": false,
  "review_status": "review_required",
  "client_visibility": "page_takeaway"
}
```

### 40.2 Client visibility

```json
[
  "hidden",
  "internal_only",
  "page_takeaway",
  "chart_detail"
]
```

### 40.3 Data update validation

```json
{
  "insight_validation_id": "ival_001",
  "insight_id": "ins_awareness_change",
  "new_semantic_model_version_id": "semv_004",
  "status": "needs_numeric_refresh",
  "old_statement": "Awareness increased by 5 percentage points.",
  "suggested_statement": "Awareness increased by 3 percentage points.",
  "eligible_for_new_release": false
}
```

Validation status:

```json
[
  "still_valid",
  "needs_numeric_refresh",
  "no_longer_supported",
  "new_insight_available"
]
```

---

## 41. Review Issue

```json
{
  "review_issue_id": "issue_001",
  "project_id": "prj_01J5A4C5V0",
  "object_type": "extracted_table",
  "object_id": "tbl_b5_w2_us",
  "field_name": "semantic_metric",
  "issue_type": "ambiguous_metric_meaning",
  "risk_class": "publishing_warning",
  "severity": "medium",
  "message": "B5 may represent Current Use or Used in the Past 6 Months.",
  "suggested_actions": [
    "select_current_use",
    "select_recent_use",
    "exclude_from_dashboard"
  ],
  "status": "open",
  "blocks_publication": true,
  "created_at": "2026-08-13T07:20:00Z"
}
```

### 41.1 Review issue status

```json
[
  "open",
  "in_review",
  "resolved",
  "accepted_risk",
  "excluded",
  "obsolete"
]
```

---

## 42. Quick Data Validation

### 42.1 Validation run

```json
{
  "validation_run_id": "qv_001",
  "project_id": "prj_01J5A4C5V0",
  "extraction_snapshot_id": "ext_002",
  "dashboard_version_id": "dashv_003",
  "sampling_strategy_version": "1.0.0",
  "status": "review_required",
  "sample_count": 20,
  "passed_count": 18,
  "failed_count": 2,
  "created_at": "2026-08-13T07:40:00Z"
}
```

### 42.2 Validation sample

```json
{
  "validation_sample_id": "qvs_001",
  "validation_run_id": "qv_001",
  "sample_type": "header_mapping",
  "source_lineage_id": "lin_001",
  "original_excel_display": "62%",
  "structured_display": "62%",
  "dashboard_display": "62%",
  "original_header_path": [
    "US",
    "Total"
  ],
  "structured_header_path": [
    "US",
    "Total"
  ],
  "status": "passed",
  "creator_comment": null
}
```

### 42.3 Pattern escalation

If a sample fails, record the potentially affected pattern:

```json
{
  "pattern_escalation_id": "pe_001",
  "validation_sample_id": "qvs_002",
  "pattern_signature": "three_row_merged_header_with_repeated_total",
  "affected_extracted_table_ids": [
    "tbl_01",
    "tbl_02",
    "tbl_03"
  ],
  "recommended_action": "batch_review"
}
```

---

## 43. Dashboard Change Preview

```json
{
  "change_preview_id": "chg_001",
  "dashboard_version_id": "dashv_003",
  "requested_by": "usr_001",
  "request_source": "creator_chat",
  "original_instruction": "Show T3B and Mean only for all 7-point questions.",
  "change_category": "presentation",
  "scope_options": [
    {
      "scope_id": "current_visual",
      "affected_count": 1
    },
    {
      "scope_id": "current_module",
      "affected_count": 6
    },
    {
      "scope_id": "project_7_point_questions",
      "affected_count": 28,
      "recommended": true
    }
  ],
  "proposed_changes": {
    "default_metric_priority": [
      "top_3_box",
      "mean"
    ],
    "hide_individual_scale_points": true
  },
  "requires_review_panel": false,
  "status": "awaiting_creator_action"
}
```

---

## 44. Published Release

### 44.1 Release object

```json
{
  "published_release_id": "rel_2026_08_13_01",
  "project_id": "prj_01J5A4C5V0",
  "dashboard_id": "dash_client_full",
  "dashboard_version_id": "dashv_003",
  "semantic_model_version_id": "semv_004",
  "release_version": "2.1",
  "status": "published",
  "published_at": "2026-08-13T09:00:00Z",
  "published_by": "usr_001",
  "supersedes_published_release_id": "rel_2026_07_01_01",
  "published_data_package_id": "pkg_003"
}
```

### 44.2 Release status

```json
[
  "draft",
  "publishing",
  "published",
  "suspended",
  "superseded",
  "withdrawn",
  "failed"
]
```

A Published Release is immutable. Suspending changes access state, not release content.

---

## 45. Published Data Package

```json
{
  "published_data_package_id": "pkg_003",
  "published_release_id": "rel_2026_08_13_01",
  "package_schema_version": "1.0.0",
  "page_ids": [
    "page_overview",
    "page_brand_funnel",
    "page_imagery"
  ],
  "visual_ids": [
    "visual_awareness_trend",
    "visual_brand_funnel",
    "visual_brand_imagery"
  ],
  "official_result_ids": [
    "res_b2_govee_w2_total"
  ],
  "derived_result_ids": [
    "dres_awareness_change_govee"
  ],
  "insight_ids": [
    "ins_awareness_change"
  ],
  "visible_dimension_ids": [
    "dim_market",
    "dim_wave",
    "dim_gender"
  ],
  "visible_combination_ids": [
    "comb_market_gender"
  ],
  "contains_internal_metadata": false,
  "generated_at": "2026-08-13T08:59:00Z"
}
```

### 45.1 Excluded content

The package must not contain:

- Draft results.
- Internal tables.
- Source Excel binary.
- Recognition confidence.
- Review notes.
- Raw JSON beyond the client contract.
- Unapproved Insights.
- Unverified derived metrics.

---

## 46. Share Link

```json
{
  "share_link_id": "share_001",
  "published_release_id": "rel_2026_08_13_01",
  "token_hash": "sha256:...",
  "status": "active",
  "password_required": true,
  "password_hash": "argon2:...",
  "expires_at": "2026-09-30T15:59:59Z",
  "allow_pdf_download": true,
  "allow_ppt_download": false,
  "show_insights": true,
  "show_significance": true,
  "show_detailed_tables": false,
  "created_at": "2026-08-13T09:02:00Z",
  "created_by": "usr_001",
  "revoked_at": null
}
```

Never store the plain-text password or link token.

---

## 47. Client Recommended Question

```json
{
  "client_question_definition_id": "cq_funnel_drop",
  "published_release_id": "rel_2026_08_13_01",
  "dashboard_page_id": "page_brand_funnel",
  "question_text": "Where is the largest funnel drop?",
  "question_type": "funnel_drop_summary",
  "required_analysis_module_id": "module_brand_funnel",
  "required_derived_metric_type": "conversion_rate",
  "is_available": true,
  "display_order": 2
}
```

### 47.1 Client answer

```json
{
  "client_answer_id": "ans_001",
  "published_release_id": "rel_2026_08_13_01",
  "client_question_definition_id": "cq_funnel_drop",
  "filter_state": {
    "market_id": "market_us",
    "wave_id": "wave_2"
  },
  "direct_answer": "The largest drop occurs between Aided Awareness and Ever Used.",
  "supporting_result_ids": [
    "res_awareness_govee_w2",
    "res_ever_used_govee_w2",
    "dres_awareness_to_trial_govee"
  ],
  "statistical_note": "No official significance result is available for this conversion.",
  "source_visual_id": "visual_brand_funnel",
  "generated_at": "2026-08-13T09:10:00Z"
}
```

The client answer service must query only the Published Data Package.

---

## 48. Data Replacement Model

### 48.1 Replacement operation

```json
{
  "replacement_operation_id": "repl_001",
  "project_id": "prj_01J5A4C5V0",
  "source_dataset_id": "ds_us_w2",
  "old_source_file_version_id": "sfv_001",
  "new_source_file_version_id": "sfv_002",
  "operation_status": "review_required",
  "requested_reason": "Wave 2 values were incorrect",
  "requested_by": "usr_001",
  "requested_at": "2026-08-13T07:00:00Z"
}
```

### 48.2 Mapping migration result

```json
{
  "mapping_migration_report_id": "mmr_001",
  "replacement_operation_id": "repl_001",
  "old_extraction_snapshot_id": "ext_001",
  "new_extraction_snapshot_id": "ext_002",
  "mappings_reused": 176,
  "mappings_review_required": 5,
  "new_tables_without_mapping": 3,
  "old_mappings_without_source": 1,
  "conflicts": 0,
  "status": "review_required"
}
```

### 48.3 Replacement impact report

```json
{
  "replacement_impact_report_id": "rir_001",
  "replacement_operation_id": "repl_001",
  "tables_matched": 182,
  "numeric_values_changed": 143,
  "base_values_changed": 12,
  "significance_results_changed": 18,
  "new_tables": 2,
  "removed_tables": 1,
  "affected_visual_ids": [
    "visual_awareness_trend",
    "visual_brand_funnel"
  ],
  "insight_validation_summary": {
    "still_valid": 12,
    "needs_numeric_refresh": 4,
    "no_longer_supported": 2,
    "new_insight_available": 6
  },
  "blocking_issue_ids": [
    "issue_base_change_01"
  ]
}
```

### 48.4 Rules

- Never mutate an existing Published Release.
- Generate a new Dashboard Draft from the replacement.
- Reuse semantic mappings when identity and structure match.
- Rebind source lineage to the new file version.
- Regenerate exports after a corrected release.

---

## 49. Localization and Bilingual Data Model

### 49.1 Supported locales

MVP locales:

```json
[
  "en",
  "zh-CN"
]
```

Locale codes use BCP 47-compatible values. Internal IDs and formulas are language-neutral.

### 49.2 Localized text object

All user-facing semantic text should support a common localized-text structure:

```json
{
  "text_id": "txt_metric_awareness",
  "source_locale": "en",
  "source_text": "Aided Awareness",
  "translations": {
    "en": {
      "text": "Aided Awareness",
      "translation_status": "source_provided",
      "review_status": "creator_verified"
    },
    "zh-CN": {
      "text": "提示后品牌知名度",
      "translation_status": "creator_confirmed",
      "review_status": "creator_verified"
    }
  }
}
```

### 49.3 Translation status enum

```json
[
  "source_provided",
  "ai_translated",
  "creator_reviewed",
  "creator_confirmed",
  "translation_not_available"
]
```

`source_provided` includes a translation imported from a Creator-supplied translation file. It has priority over `ai_translated`. A Creator-confirmed or Creator-reviewed translation has priority over all AI output.

### 49.4 Source, canonical and display labels

Objects that carry research labels should retain:

```json
{
  "original_labels": [
    {
      "locale": "en",
      "text": "Price is too high",
      "source_lineage_id": "lin_option_price_w2"
    }
  ],
  "canonical_name": "High price",
  "localized_display_names": {
    "en": "High price",
    "zh-CN": "价格过高"
  }
}
```

`canonical_name` is not used as a substitute for preserving the original source label.

### 49.5 Project localization settings

```json
{
  "localization_settings_id": "loc_prj_001",
  "project_id": "prj_01J5A4C5V0",
  "supported_locales": [
    "en",
    "zh-CN"
  ],
  "default_creator_locale": "zh-CN",
  "default_client_locale": "en",
  "fallback_locale": "en",
  "publication_language_mode": "bilingual_switcher",
  "missing_translation_policy": "block_required_client_text"
}
```

Publication language mode:

```json
[
  "english_only",
  "chinese_only",
  "bilingual_switcher"
]
```

### 49.6 Localized entities and metrics

The following objects require localized display fields:

- Project title and description.
- Market and Wave display names where localized wording is required.
- Dimension and Banner names.
- Category labels.
- Canonical entity display names.
- Semantic Question display title.
- Semantic Metric display name and definition.
- Analysis Module name.
- Dashboard Page title.
- Dashboard Visual title, subtitle and footnote.
- Base display definition.
- Insight statement.
- Client recommended question and answer template.
- Export title, footer and technical note.

### 49.7 Localized Insight

```json
{
  "insight_id": "ins_awareness_change",
  "localized_statements": {
    "en": {
      "text": "Govee awareness increased by 5 percentage points versus Wave 1.",
      "translation_status": "creator_confirmed"
    },
    "zh-CN": {
      "text": "Govee 的品牌知名度较第一期上升了 5 个百分点。",
      "translation_status": "creator_confirmed"
    }
  },
  "supporting_result_ids": [
    "res_awareness_govee_w1",
    "res_awareness_govee_w2",
    "dres_awareness_change_govee"
  ]
}
```

Both language versions must reference the same evidence and validation status.

### 49.8 Published localization package

```json
{
  "published_localization_package_id": "ploc_003",
  "published_release_id": "rel_2026_08_13_01",
  "available_locales": [
    "en",
    "zh-CN"
  ],
  "default_locale": "en",
  "fallback_locale": "en",
  "resource_versions": {
    "en": "locres_en_003",
    "zh-CN": "locres_zh_003"
  },
  "required_translation_coverage": 1.0,
  "actual_translation_coverage": 1.0
}
```

### 49.9 Missing-translation rules

Required client-facing text includes:

- Page titles.
- Visual titles.
- Metric labels.
- Filter labels and categories.
- Base definitions shown to clients.
- Published Insights.
- Recommended questions.
- Data-unavailable and access messages.

If the requested language is missing:

1. Use the configured fallback only when allowed.
2. Record the fallback event internally.
3. Block bilingual publication if required translation coverage is below the release threshold.

For a Chinese-source workbook, the Creator may upload an English translation file or request an AI translation Draft. AI translation never changes numeric values, question codes, significance labels, formulas or source coordinates. It is bound to the stable object ID of the question, option, Header, Base, Insight or other display object, not matched back by source text alone.

An English release containing `ai_translated` content requires an explicit, auditable Creator publication choice to accept AI Draft translations. Without that choice, only language versions meeting the configured confirmed-translation policy may be published.

### 49.10 Translation audit

```json
{
  "translation_audit_event_id": "ta_001",
  "project_id": "prj_01J5A4C5V0",
  "object_type": "semantic_metric",
  "object_id": "metric_awareness",
  "locale": "zh-CN",
  "old_text": "品牌认知",
  "new_text": "提示后品牌知名度",
  "changed_by": "usr_001",
  "change_source": "creator_edit",
  "changed_at": "2026-08-13T08:30:00Z"
}
```

### 49.11 Language-neutral calculations

Calculations, comparisons, sort orders and Source Lineage reference IDs and numeric values, not localized labels. Switching the UI locale must never recompute results.

---

## 49. Tracking Wave Update Model

```json
{
  "wave_update_operation_id": "wu_003",
  "project_id": "prj_01J5A4C5V0",
  "new_wave_id": "wave_3",
  "source_file_version_ids": [
    "sfv_w3_us",
    "sfv_w3_uk"
  ],
  "based_on_semantic_model_version_id": "semv_004",
  "based_on_dashboard_version_id": "dashv_003",
  "status": "review_required"
}
```

### 49.1 Change classification

```json
[
  "safe_update",
  "review_required",
  "conflict",
  "new_content",
  "removed_content",
  "not_comparable",
  "recognition_failed"
]
```

### 49.2 New option

```json
{
  "change_id": "wchg_new_barrier",
  "change_type": "new_option",
  "semantic_question_id": "q_purchase_barriers",
  "canonical_entity_id": "option_difficult_install",
  "first_available_wave_id": "wave_3",
  "change_classification": "safe_update",
  "historical_display": "-",
  "difference_enabled": false,
  "ranking_change_enabled": false
}
```

### 49.3 Removed option

A disappeared option first enters review:

```json
{
  "change_type": "possible_removed_option",
  "old_label": "Limited availability",
  "new_match_candidates": [
    {
      "label": "Limited in-store availability",
      "match_score": 0.91,
      "match_type": "possible_rename"
    }
  ],
  "change_classification": "review_required"
}
```

---

## 50. Publication Gate

```json
{
  "publication_gate_id": "gate_001",
  "dashboard_version_id": "dashv_003",
  "status": "blocked",
  "checks": [
    {
      "check_id": "published_values_have_lineage",
      "status": "passed"
    },
    {
      "check_id": "no_unresolved_header_mapping",
      "status": "passed"
    },
    {
      "check_id": "no_source_conflicts",
      "status": "failed",
      "blocking_issue_ids": [
        "issue_002"
      ]
    },
    {
      "check_id": "published_derived_metrics_validated",
      "status": "passed"
    },
    {
      "check_id": "published_insights_supported",
      "status": "passed"
    }
  ]
}
```

Required release checks:

- Published values have lineage.
- Numeric/header mapping is confirmed.
- Market and Wave are resolved.
- No unresolved source conflicts.
- Published significance is official and verified.
- Published derived metrics passed validation.
- Published Insights are supported.
- No Internal content is included.
- Client sharing settings are valid.

Publication evaluates each visual and result independently. A result with unparsed numeric content, unresolved Header mapping, missing source lineage, source conflict or invalid variant merge is excluded from the release together with dependent visuals and Insights. The remaining verified Dashboard content may be published, and the Creator receives an explicit exclusion report. The gate blocks the entire release only when no publishable client content remains, a global security/sharing rule fails, or the Creator has configured an excluded item as mandatory.

Base is displayed only when it is explicitly extracted from the physical table. The platform must not inherit, infer or display a Base from a prior table or another Sheet. Results without an explicit Base may be published only for use cases that do not require Base comparability, significance interpretation or Base-dependent calculations.

---

## 51. Error Model

```json
{
  "error_id": "err_001",
  "error_code": "HEADER_HIERARCHY_AMBIGUOUS",
  "error_category": "recognition",
  "severity": "warning",
  "message": "The three-row header could not be mapped reliably.",
  "user_message": "This table's column headers require review.",
  "object_type": "extracted_table",
  "object_id": "tbl_001",
  "retryable": false,
  "suggested_action": "open_review_panel",
  "technical_details": {
    "parser_version": "0.3.0"
  },
  "created_at": "2026-08-13T07:06:00Z"
}
```

### 51.1 Error principles

- Do not expose stack traces to clients.
- Do not log passwords or share tokens.
- Limit raw cell data in logs.
- Use stable error codes.
- Separate user-facing and technical messages.
- AI enrichment failure should not invalidate successful extraction.

---

## 52. Event and Audit Model

```json
{
  "audit_event_id": "audit_001",
  "project_id": "prj_01J5A4C5V0",
  "event_type": "mapping_updated",
  "actor_type": "user",
  "actor_id": "usr_001",
  "object_type": "semantic_metric",
  "object_id": "metric_b5",
  "event_time": "2026-08-13T07:35:00Z",
  "before_summary": {
    "canonical_name": "Recent Use"
  },
  "after_summary": {
    "canonical_name": "Current Use"
  },
  "reason": "Creator confirmed B5 meaning",
  "correlation_id": "req_001"
}
```

Audit events include:

- File uploaded.
- Extraction completed.
- Mapping changed.
- Mapping applied in bulk.
- Dashboard visual changed.
- Insight edited.
- Data replaced.
- Dashboard published.
- Dashboard suspended.
- Dashboard rolled back.
- Share link revoked.
- Data permanently deleted.

---

## 53. Schema Validation in Python

The Python backend should use typed validation models. Pydantic-style models are recommended, with JSON Schema generated from the same definitions.

Illustrative model:

```python
from datetime import datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class AvailabilityStatus(StrEnum):
    AVAILABLE = "available"
    NOT_ASKED = "not_asked"
    NOT_AVAILABLE = "not_available"
    SUPPRESSED = "suppressed"
    NOT_APPLICABLE = "not_applicable"
    RECOGNITION_PENDING = "recognition_pending"
    SOURCE_CONFLICT = "source_conflict"


class NumericValue(BaseModel):
    raw_value: float | None = None
    display_value: str
    unit: str
    decimal_places: int | None = None
    precision_source: str
    availability_status: AvailabilityStatus


class SourceReference(BaseModel):
    source_file_version_id: str
    sheet_snapshot_id: str
    extracted_table_id: str
    source_cell: str | None = None
    source_range: str | None = None


class OfficialResult(BaseModel):
    official_result_id: str
    semantic_metric_id: str
    market_id: str | None = None
    wave_id: str | None = None
    dimension_category_ids: list[str] = Field(default_factory=list)
    value: NumericValue
    source_lineage_ids: list[str]
    created_at: datetime
```

### 53.1 Validation rules

- Reject unknown required enum values at API boundaries.
- Preserve unknown extracted labels as original evidence.
- Validate units against metric type.
- Validate all foreign IDs before publication.
- Validate that a derived result references at least two official inputs when required.
- Validate that every published result has lineage.
- Validate that every published Insight has supporting result IDs.

---

## 54. Storage Guidance

The logical model can use a hybrid storage pattern:

### Relational storage

Suitable for:

- Projects.
- Users and roles.
- Source versions.
- Semantic entities.
- Dashboard versions.
- Published releases.
- Review issues.
- Audit events.

### Object storage

Suitable for:

- Original workbook binaries.
- Immutable Extraction Snapshot artifacts.
- Published package artifacts.
- PDF/PPT exports.

### JSON columns or document store

Suitable for:

- Header paths.
- Extraction structures.
- Chart configuration.
- Template configuration.
- Confidence evidence.

The final technology choice belongs to the Technical Architecture document.

---

## 55. API Contract Principles

The later API design should follow these principles:

- IDs, not labels, in mutation APIs.
- Optimistic concurrency for Dashboard editing.
- Idempotency keys for upload, extraction and publish operations.
- Pagination for Table Catalog and large result sets.
- Async job endpoints for ingestion and export.
- Separate internal Creator contract from client Published Package contract.
- Never expose internal Extraction JSON through the client API.

Example optimistic-lock field:

```json
{
  "dashboard_version_id": "dashv_003",
  "revision": 18
}
```

A conflicting update returns a revision conflict rather than silently overwriting another edit.

---

## 56. Schema Versioning and Migration

### 56.1 Semantic versioning

Use:

```text
MAJOR.MINOR.PATCH
```

- MAJOR: incompatible contract change.
- MINOR: backward-compatible field addition.
- PATCH: clarification or validation correction.

### 56.2 Migration rules

- Persist the schema version with every top-level object.
- Read at least the current and previous major version during controlled migration.
- Never rewrite a Published Data Package in place.
- Migration creates a new package or snapshot version.
- Maintain migration tests with golden JSON fixtures.

---

## 57. Data Retention and Deletion

### 57.1 Logical removal

MVP operations:

- Replace.
- Archive.
- Remove from Project.
- Suspend publication.

### 57.2 Permanent deletion

Permanent deletion should require Admin or explicit Project Owner permission and must:

- Evaluate existing Published Releases.
- Revoke or suspend affected links.
- Display impact.
- Record audit event.
- Follow the configured retention period.

### 57.3 Tombstone

```json
{
  "deletion_tombstone_id": "del_001",
  "object_type": "source_file_version",
  "object_id": "sfv_001",
  "deleted_at": "2026-10-01T00:00:00Z",
  "deleted_by": "usr_admin",
  "deletion_reason": "Retention policy",
  "content_removed": true,
  "audit_reference_retained": true
}
```

---

## 58. Testing Requirements for JSON Contracts

### 58.1 Unit tests

- Enum validation.
- Numeric-unit compatibility.
- Source-lineage completeness.
- Availability behavior.
- Sort-rule resolution.
- Derived calculation input validation.
- Publication-gate evaluation.

### 58.2 Golden JSON tests

Maintain fixtures for:

- Simple Percentage table.
- Multi-level Banner.
- Count + Percentage variants.
- Mean + Box Score.
- Official significance letters.
- Multiple Markets.
- Multiple Waves.
- New option.
- Renamed option.
- Split or merged option.
- Corrected Wave replacement.
- Incomplete Published Package.

### 58.3 Golden table-recognition tests

The first Golden set contains 20-30 annotated physical tables rather than complete workbooks. It must cover Quantum normal tables, different significance layouts, alternating Count/Percentage rows, Decipher Count/Percentage/significance variants, merged and unmerged Headers, missing Base, question text outside column A, Header depth above three and complex/error regions.

Every physical table annotation records exact table, title, Header, Base, data, footnote and significance regions. It also contains three to five Cell Truth samples covering an explicit Base where present, a normal Count or Percentage value, a significance marker and exceptional values where present. `Table_Annotation` must include `Significance_Layout`, `Expected_Outline_Status`, `Expected_Validation_Result`, `Header_Depth`, and `Has_Explicit_Base`.

Layer 1 covers a Golden table when its coarse candidate covers the Golden Header or first data row, contains the full table, or correctly requests continuation that covers it. Layer 2 is scored against Python's final validated or adjusted structure, not against raw AI coordinates.

Initial release thresholds are:

- Layer 1 Outline coverage: 100%; missed tables: 0.
- Layer 2 final exact-structure accuracy: at least 95%.
- Incorrectly auto-accepted tables: 0.
- `review_required` tables: at most 10% of the Golden set.

Every run writes a status-only report without business content. It includes Layer 1 coverage, misses, status and unclassified-reason distributions; Layer 2 window and candidate-status distributions; validation outcomes; and breakdowns by source family, Sheet, Header depth and significance layout.

### 58.4 Round-trip tests

Verify:

```text
Excel source
-> Extraction JSON
-> Semantic JSON
-> Dashboard Result
-> Published Package
```

The published numeric value and scope must match the validated source.

---

## 59. MVP Required Schemas

The following schemas are required before MVP engineering is complete:

1. `project.schema.json`
2. `source_file_version.schema.json`
3. `processing_job.schema.json`
4. `workbook_snapshot.schema.json`
5. `sheet_snapshot.schema.json`
6. `extraction_snapshot.schema.json`
7. `extracted_table.schema.json`
8. `extracted_header.schema.json`
9. `extracted_row.schema.json`
10. `extracted_cell.schema.json`
11. `source_lineage.schema.json`
12. `review_issue.schema.json`
13. `semantic_question.schema.json`
14. `semantic_metric.schema.json`
15. `official_result.schema.json`
16. `significance_result.schema.json`
17. `derived_metric_definition.schema.json`
18. `derived_result.schema.json`
19. `analysis_module.schema.json`
20. `dashboard.schema.json`
21. `dashboard_version.schema.json`
22. `dashboard_page.schema.json`
23. `dashboard_visual.schema.json`
24. `insight.schema.json`
25. `published_release.schema.json`
26. `published_data_package.schema.json`
27. `share_link.schema.json`
28. `replacement_operation.schema.json`
29. `wave_update_operation.schema.json`
30. `publication_gate.schema.json`

---

## 60. MVP Data Contract Checklist

Before a result may be published:

- [ ] `source_file_version_id` exists and is active for the Draft.
- [ ] Extraction Snapshot completed successfully.
- [ ] Extracted value has Source Lineage.
- [ ] Header path is resolved.
- [ ] Market and Wave are resolved.
- [ ] Metric unit is resolved.
- [ ] Availability status is not conflicting.
- [ ] Base is linked where applicable.
- [ ] Official significance is verified if displayed.
- [ ] Derived result passed comparability checks.
- [ ] Insight references supporting results.
- [ ] Dashboard visual references existing approved metrics.
- [ ] Client filter combinations exist in the available matrix.
- [ ] Internal-only fields are excluded from Published Data Package.
- [ ] Published Release points to immutable versions.

---

## 61. Open Technical Decisions

The following items remain for `06_Python_Technical_Architecture.md`:

- FastAPI or alternative Python web framework.
- Pydantic version and schema-generation process.
- PostgreSQL schema and JSONB usage.
- Celery, RQ, Dramatiq or cloud-native job queue.
- Redis requirement.
- Object-storage provider.
- Excel parsing libraries and formula-cache strategy.
- Chart rendering and HTML Dashboard framework.
- PDF and PPT service implementation.
- Authentication and secret management.
- AI provider and data-residency controls.
- Observability stack.
- Deployment model and environments.

---

## 62. Recommended Next Document

The next document should be:

```text
03_UX_Flow_and_Prototype_Specification.md
```

It should map the objects and states in this Data Specification to concrete screens:

- Upload.
- Processing.
- Review Summary.
- Quick Data Validation.
- Data Explorer.
- Mapping Review Panel.
- Dashboard Draft.
- Creator AI drawer.
- View as Client.
- Publish.
- New Wave Update.
- Replace Data.
- Suspend and Rollback.
