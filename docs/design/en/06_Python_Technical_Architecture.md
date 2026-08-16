# AI Research Dashboard Platform
## Python Technical Architecture & Delivery Plan

**Document ID:** `06_Python_Technical_Architecture`  
**Version:** v1.1
**Status:** Initial technical architecture specification  
**Date:** 14 August 2026
**Primary backend language:** Python  
**Supported product languages:** English (`en`) and Simplified Chinese (`zh-CN`)  
**Related documents:**  
- `01_AI_Research_Dashboard_PRD_MVP_v1.2.md`  
- `02_Data_and_JSON_Specification_v1.1.md` 
- `03_UX_Flow_and_Prototype_Specification_v1.1.md` 
- `04_Validation_and_Acceptance_Test_Plan.md` v1.0  
- `05_UI_Frontend_Engineering_Specification.md` v1.1  

---

## 1. Purpose

This document defines the recommended Python backend architecture and delivery plan for the AI Research Dashboard Platform MVP.

It translates the product and data requirements into an engineering design for:

- Excel Tab Book ingestion.
- Workbook extraction.
- Table-boundary detection.
- Header and Base parsing.
- Semantic interpretation.
- JSON contract validation.
- Creator Review workflows.
- Dashboard data preparation.
- Derived calculations.
- Insight generation and validation.
- Bilingual content management.
- New-Wave updates.
- Replace Data.
- Published Data Packages.
- Hosted HTML delivery.
- PDF and PPT Snapshot generation.
- Client read-only AI questions.
- Security, observability and deployment.

---

## 2. Architecture Goals

### 2.1 Primary goals

- Preserve numeric accuracy and Source Lineage.
- Separate deterministic processing from AI interpretation.
- Support non-fixed-format Excel Tab Books.
- Generate a Dashboard Draft before full manual review.
- Make processing asynchronous and resumable.
- Keep Published Releases immutable.
- Reuse compatible Mapping and Dashboard design across Waves and replacement files.
- Support English and Chinese without duplicating calculations.
- Degrade gracefully when AI or export services fail.
- Support future Raw Data and advanced analytics without rewriting MVP foundations.

### 2.2 Non-goals for MVP architecture

- Microservice decomposition for every feature.
- Raw respondent-level analytical warehouse.
- Real-time collaborative editing.
- Arbitrary client-authored analysis queries.
- Power BI report authoring.
- Advanced statistical-model execution.

---

## 3. Recommended Architecture Style

### 3.1 Modular monolith first

The MVP should begin as a **modular Python monolith with asynchronous workers**, rather than many independently deployed microservices.

Reasons:

- The product domain is still evolving.
- Extraction, semantic interpretation, review and publishing share a connected data model.
- Distributed transactions would add avoidable complexity.
- A modular monolith is easier to debug during parser development.
- Modules can be separated into services later when scale or operational ownership requires it.

### 3.2 Deployable units

Recommended initial deployable units:

```text
1. Web/API application
2. Background worker application
3. Scheduler / maintenance worker
4. Front-end application
5. Database
6. Object storage
7. Queue / cache
```

The API and worker may share the same Python package and domain models while running as separate processes.

### 3.3 Architectural boundaries

```text
Presentation/API
    -> Application Services
        -> Domain Modules
            -> Repositories / External Adapters
```

Domain logic must not depend directly on web-framework request objects, queue task objects or database ORM sessions.

---

## 4. Recommended Technology Baseline

The following is the recommended default stack, subject to security and platform review.

### 4.1 Python runtime

- Python 3.12 or the organization's approved current version.
- Locked dependency versions.
- Reproducible builds.

### 4.2 Web API

- FastAPI.
- Pydantic v2 for typed contracts.
- Uvicorn behind a production ingress or application gateway.

### 4.3 Database

- PostgreSQL.
- SQLAlchemy 2.x.
- Alembic migrations.
- JSONB for selected configuration and extraction structures.

### 4.4 Asynchronous jobs

Recommended default:

- Celery or Dramatiq workers.
- Redis or an approved managed message broker.

The final choice should consider:

- Managed-platform availability.
- Retry semantics.
- Visibility timeout.
- Scheduled jobs.
- Operational monitoring.
- Message security.

### 4.5 Object storage

Use secure object storage for:

- Uploaded workbook binaries.
- Extraction artifacts.
- Source previews.
- Published package artifacts.
- PDF and PPT outputs.

### 4.6 Excel processing

Potential Python libraries:

- `openpyxl` for workbook structure, cells, formulas, styles and merged regions.
- `pandas` for selected structured transformations, not as the sole workbook parser.
- `python-calamine` or another read-optimized adapter as an optional future performance path.

Do not use DataFrame loading alone for complex formatted Tab Book interpretation because it can lose workbook layout evidence.

### 4.7 PDF and PPT

Potential MVP direction:

- Server-side browser rendering for HTML-to-PDF.
- `python-pptx` or a controlled rendering pipeline for PPT Snapshot generation.

The output pipeline should use a stable Dashboard export contract rather than scraping the interactive Creator DOM.

### 4.8 AI provider adapter

Use a provider-neutral Python interface. The domain should not import provider SDKs directly.

---

## 5. High-Level Component Diagram

```text
Browser - Creator / Client
        |
        v
Front-end Web Application
        |
        v
Python API Application
        |
        +------------------------------+
        |                              |
        v                              v
PostgreSQL                      Object Storage
        |                              |
        +---------------+--------------+
                        |
                        v
                Job Queue / Broker
                        |
                        v
                Python Worker Pool
                        |
        +---------------+-----------------------------+
        |               |              |              |
        v               v              v              v
Excel Pipeline   Semantic Pipeline  Export Worker  AI Adapter
        |               |              |              |
        +---------------+--------------+--------------+
                        |
                        v
             Versioned Domain Artifacts
```

---

## 6. Python Repository Structure

```text
backend/
  pyproject.toml
  alembic.ini
  src/
    app/
      main.py
      settings.py
      logging.py
      dependencies.py
      api/
        internal/
        client/
        admin/
      application/
        commands/
        queries/
        services/
      domain/
        projects/
        sources/
        extraction/
        semantics/
        dimensions/
        analysis/
        dashboards/
        insights/
        localization/
        publishing/
        access/
        audit/
      infrastructure/
        db/
        repositories/
        object_storage/
        queue/
        ai/
        rendering/
        security/
      pipelines/
        ingestion/
        extraction/
        semantic/
        dashboard/
        publishing/
        replacement/
      workers/
        tasks/
        scheduler/
      schemas/
        api/
        events/
        artifacts/
      shared/
        ids.py
        time.py
        errors.py
        enums.py
        hashing.py
        idempotency.py
  tests/
    unit/
    integration/
    contract/
    e2e/
    golden/
  scripts/
  migrations/
```

### 6.1 Dependency rules

- `domain` must not import FastAPI, Celery or ORM-specific objects.
- `application` may orchestrate domain services and repository interfaces.
- `infrastructure` implements repository and external-service adapters.
- `api` maps HTTP contracts to application commands and queries.
- `workers` maps queue messages to application commands.
- `pipelines` coordinates long-running processing stages.

---

## 7. Configuration Management

### 7.1 Environment configuration

Use typed settings.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ARD_",
        env_file=".env",
        extra="ignore",
    )

    environment: str = "development"
    database_url: str
    object_storage_endpoint: str
    object_storage_bucket: str
    queue_url: str
    ai_provider: str
    ai_model: str
    default_locale: str = "en"
    supported_locales: tuple[str, ...] = ("en", "zh-CN")
```

### 7.2 Secret management

Secrets must come from an approved secret store in deployed environments.

Do not store:

- Database passwords.
- AI keys.
- Share-link signing keys.
- Object-storage credentials.
- Encryption keys.

in source control or plain configuration files.

### 7.3 Feature flags

Feature flags should control:

- Template certification.
- Optional visual plugins.
- Client recommended questions.
- Standalone HTML export.
- Beta significance formats.
- New parser strategies.

Feature flags must not bypass data-validation or security gates.

---

## 8. Domain Model Implementation

### 8.1 Typed domain identifiers

Avoid freely mixing IDs.

```python
from typing import NewType

ProjectId = NewType("ProjectId", str)
SourceFileVersionId = NewType("SourceFileVersionId", str)
ExtractionSnapshotId = NewType("ExtractionSnapshotId", str)
SemanticMetricId = NewType("SemanticMetricId", str)
DashboardVersionId = NewType("DashboardVersionId", str)
PublishedReleaseId = NewType("PublishedReleaseId", str)
```

### 8.2 Stable IDs

Use UUIDv7, ULID or another sortable globally unique ID format.

### 8.3 Pydantic contracts versus domain objects

- Pydantic models validate boundaries and serialized artifacts.
- Domain entities may use dataclasses or explicit classes where behavior is important.
- ORM models are persistence representations, not the public API contract.

### 8.4 Immutable artifacts

Model immutability through both application rules and database constraints for:

- Source File Version content metadata.
- Completed Extraction Snapshot.
- Published Release.
- Published Data Package.

---

## 9. Database Design Direction

### 9.1 Relational tables

Recommended relational entities:

- users
- projects
- project_members
- source_datasets
- source_file_versions
- processing_jobs
- workbook_snapshots
- sheet_snapshots
- extraction_snapshots
- extracted_tables
- semantic_questions
- semantic_metrics
- semantic_metric_versions
- dimensions
- dimension_categories
- base_definitions
- base_results
- canonical_entities
- option_mappings
- official_results
- significance_results
- derived_metric_definitions
- derived_results
- analysis_modules
- dashboards
- dashboard_versions
- dashboard_pages
- dashboard_visuals
- insights
- review_issues
- published_releases
- share_links
- audit_events

### 9.2 JSONB candidates

Use JSONB for structures that are nested, versioned or configuration-oriented:

- Table structure coordinates.
- Header path.
- Field-level confidence.
- Visual options.
- Dashboard layout.
- Theme configuration.
- Localized text sets.
- Processing-stage details.

### 9.3 Avoiding excessive JSONB

Core relationships, IDs, versions and status fields should remain queryable relational columns.

Do not store the entire application state in one Project JSONB document.

### 9.4 Result storage

Official results require efficient querying by:

- Metric.
- Entity.
- Market.
- Wave.
- Dimension categories.

A normalized or semi-normalized result table is preferable to large opaque JSON arrays for published-query performance.

---

## 10. Object Storage Layout

Recommended logical keys:

```text
projects/{project_id}/sources/{source_file_version_id}/original.xlsx
projects/{project_id}/extractions/{extraction_snapshot_id}/manifest.json
projects/{project_id}/extractions/{extraction_snapshot_id}/source-previews/...
projects/{project_id}/releases/{published_release_id}/package.json
projects/{project_id}/releases/{published_release_id}/exports/report-en.pdf
projects/{project_id}/releases/{published_release_id}/exports/report-zh-CN.pdf
```

### 10.1 Rules

- Storage keys are never exposed as direct client identifiers.
- Downloads use short-lived authorized URLs or streamed API responses.
- Original file access is Creator-only.
- Published package artifacts are immutable per release.
- Replaced files follow retention policy.

---

## 11. Upload and Ingestion Pipeline

### 11.1 Upload stages

```text
Create upload session
-> Stream file to object storage
-> Validate size and type
-> Calculate hash
-> Create Source File Version
-> Enqueue ingestion job
```

### 11.2 Duplicate detection

SHA-256 identifies identical binaries.

A duplicate does not automatically mean the same logical dataset. The API returns duplicate context and lets the Creator decide whether to reuse or attach intentionally.

### 11.3 Workbook safety checks

- Extension and MIME agreement.
- Archive integrity.
- Workbook readability.
- Password protection.
- Macro-enabled file policy.
- Sheet count.
- Defined size limits.
- Formula-cache availability.

### 11.4 Malware scanning

Integrate approved malware scanning before processing or publishing uploaded files.

### 11.5 Idempotency

Upload finalization and ingestion-start endpoints accept idempotency keys.

---

## 12. Workbook Extraction Pipeline

### 12.1 Pipeline stages

```text
Workbook scan
-> Layer 1 bounded SheetOutline generation
-> AI coarse range proposal
-> Layer 2 DetailWindow generation for proposed ranges
-> AI exact TableBoundaryProposal
-> Deterministic BoundaryValidationResult
-> Table structure parsing
-> Header hierarchy parsing
-> Row classification
-> Value and marker parsing
-> Extraction Snapshot write
```

### 12.2 Cell-grid representation

For each used cell retain selectively:

- Row and column.
- Raw value.
- Data type.
- Formula.
- Cached value.
- Display number format.
- Merged-region membership.
- Hidden row/column state.
- Relevant style signature.

### 12.3 Memory management

Large workbooks should be processed Sheet by Sheet or in bounded chunks.

Avoid materializing every style object into a Python object when a shared style signature is sufficient.

### 12.4 Formula strategy

The platform should not run an Excel calculation engine in MVP.

Use cached formula values when available. If a required formula result has no cache:

- Mark value unavailable.
- Create Review issue.
- Do not calculate an approximate result unless an explicitly supported deterministic formula is implemented.

---

## 13. Table Detection

### 13.1 Two-stage AI-assisted detection

Generic Tab Books use two AI layers with Python as the factual reader and final validator.

Layer 1 creates a compact `SheetOutline` from observable facts only: Sheet metadata; A-column value or first non-empty value; row density; non-empty column span; text, numeric and percentage-like counts; blank row ranges; merged ranges; and hidden metadata. It does not send per-cell samples, display formats, formulas, styles, inferred questions, inferred Base rows or Python table candidates. The AI returns coarse ranges and one dispatch status: `complete`, `needs_more_context`, `ambiguous`, or `not_a_table`.

Layer 2 creates `DetailWindow` payloads only for Layer 1 ranges. A Detail Window exposes up to six position-based samples per non-empty row, including source coordinate, raw and best-available display value, type, number format and formula-state facts. Default before/after context is 20 rows and is configurable. Nearby candidates within a configurable 20-row gap may share one request while preserving distinct identities. The AI returns absolute table and region coordinates; it never returns final numeric results, makes significance claims or replaces source evidence.

For continuation, the AI may ask for at most 100 extra rows on either side and at most two continuations total. Fixed chunks and overlaps are only transport controls, not table-boundary evidence.

Python re-reads original cells at the proposed coordinates, validates them, performs only permitted low-risk physical corrections and writes a `BoundaryValidationResult` before creating an `ExtractedTable`. It may not infer a boundary, question row or Base row before AI review, silently fill a missing Base, merge unrelated tables or use confidence alone as acceptance evidence.

### 13.2 Context budgets and provider adapter

Outline and Detail token budgets are deployment configuration, not business rules. The chosen provider must support the required structured JSON output and configured context capacity; long-context Outline dispatch should minimise request count without exceeding its hard per-request limit. The PoC records estimated input tokens for each payload so cost, latency and Golden accuracy can be evaluated together.

The provider boundary is intentionally neutral:

```python
class StructuredGenerationAdapter(Protocol):
    def generate_structured(self, payload: dict, output_schema: dict) -> dict:
        ...
```

No extraction-domain module imports a provider SDK or hardcodes a model name. Provider selection must be evaluated on context capacity, strict JSON reliability, low-temperature control, data residency and retention policy, auditability, cost, and Golden outcomes. Difficult exceptions may use a higher-quality configured model, but the same contracts and validation apply.

### 13.3 Parser adapter interface

```python
from typing import Protocol


class WorkbookFormatAdapter(Protocol):
    adapter_id: str
    version: str

    def score_compatibility(self, workbook_context) -> float:
        ...

    def detect_tables(self, sheet_context):
        ...

    def parse_table_structure(self, table_candidate):
        ...
```

Adapters may include:

- Generic Excel Tab.
- Quantum-family patterns.
- Dimensions-family patterns.
- Project-specific learned layout rules.

### 13.4 General parser fallback

Unknown layouts use a general detector. Low confidence routes to Review rather than failing the entire workbook.

Python returns one of `accepted`, `adjusted`, `rejected`, or `review_required` for every AI proposal. It may adjust only blank external edges, required merged title/Header extents, obvious terminal coordinate bounds, verified adjacent significance rows/columns and verified trailing footnotes. A medium-confidence proposal may be accepted without manual Review only when deterministic validation confirms source range, non-overlapping regions, Header mapping, numeric extraction, explicit Base where present, significance mapping where present, and no identity conflict. The accepted table is included in risk-weighted Quick Data Validation. Invalid proposals, unresolved conflicts and failed validation samples route to Review; Review remains an exception path rather than the normal ingestion workflow.

---

## 14. Header and Banner Parsing

### 14.1 Header tree

Build a hierarchical tree from merged cells and repeated labels.

```python
@dataclass
class HeaderNode:
    label: str
    row_start: int
    row_end: int
    column_start: int
    column_end: int
    children: list["HeaderNode"]
```

### 14.2 Flattened paths

Every result column receives a full path such as:

```text
US -> Gender -> Male
```

MVP supports one to three Header levels natively. Each physical table owns its complete Header paths, so different tables may use different Banner structures. Preserve deeper paths and raw layout evidence, but mark them as `header_depth_exceeds_mvp` and prevent automatic cross-table linking, Banner comparison, complex visuals and publication until confirmed.

### 14.3 Significance column codes

Significance labels are mapped separately from display labels and are not Excel column letters. The parser must support per-table layouts including header-inline labels, a separate label row, adjacent marker columns, following marker rows, inline value suffixes, separate significance Sheets and mixed layouts.

For each physical table, construct a case-sensitive `label -> extracted_header_id` map. For example, `A` and `a` are separate labels unless the source explicitly declares otherwise. Store the raw marker, its source cell, its layout, and all mapped header IDs. Unknown labels or incomplete maps create Review issues; the parser must not guess their target columns.

### 14.4 Combination matrix

The semantic pipeline derives actual available dimension combinations from full column paths.

It must not infer a joint combination from separate marginal columns.

---

## 15. Row and Metric Parsing

### 15.1 Deterministic recognition

Recognize common rows through patterns and formatting:

- Base.
- Unweighted Base.
- Weighted Base.
- Mean.
- Median.
- Standard deviation.
- Top/Bottom N Box.
- Net.
- Rank.
- Index.
- Difference.
- Footnote.

### 15.2 AI assistance

AI may classify ambiguous labels, but the original row and evidence remain unchanged.

### 15.3 Table variants

Link Count, Percentage, Mean and Significance variants using:

- Question number.
- Title.
- Base.
- Row structure.
- Market/Wave.
- Banner set.

Physical tables remain independently traceable to their Sheet and source range. After extraction, compatible variants may be linked to one semantic question even when they occur at different Sheet positions or use different layouts. Linking must retain each variant's own metric type, source bindings and significance schema.

Automatic variant linking is intentionally strict. Table title, question number, normalized option content and complete Header paths must each match exactly; Market, Wave and Base definitions must also match. Normalization may remove only leading/trailing and repeated whitespace, line breaks, tabs, full-width/half-width spaces, non-semantic invisible characters and Unicode representation differences. It must not ignore punctuation, case, language, bracket content, units, question-code prefixes or business text.

Count, Percentage and official-significance variants may be linked only when their metrics are complementary. A significance variant may contain auxiliary marker rows or columns, but its business value columns must map one-to-one to the matched table. Sheet name, physical position, formatting and approximate text similarity are not identity evidence. Any mismatch retains independent physical tables.

For a verified repeated Count/Percentage pattern within one physical table, produce one combined extraction with separate metric blocks and source coordinates; do not create an artificial cross-table link.

### 15.4 Unknown metric

Store as `unknown`, retain original label and allow Creator confirmation.

### 15.5 Value parsing and CSV encoding

Keep Excel stored values and displayed values separately. Only normalize a value into a calculation-ready number when the source format and row context prove its unit. Preserve unavailable symbols and render them as `-` to clients without ever converting them to zero. Represent `<1%` as a bound, not `0.01`; bound values cannot enter exact calculations or ordering.

Parse `*` and `**` as source qualifiers such as `small_base` and `very_small_base` only when supported by source notes. They restrict significance wording and high-risk interpretation but do not make the numeric value unavailable.

For CSV ingestion, preserve original bytes and try approved encodings including UTF-8, UTF-8 BOM, GB18030, GBK and Big5. Record the selected encoding and confidence using reversibility, replacement-character rate and expected CJK/Latin text validity. Low-confidence decoding must not send damaged text to AI or use it for identity matching, publication or automatic variant linking; the Creator may specify an encoding or re-export UTF-8.

---

## 16. Extraction Artifact Validation

Before completing an Extraction Snapshot:

- Every Extracted Cell references a Table.
- Every result column has a Header path or Review issue.
- Availability symbols are non-numeric.
- Percentage parsing respects source format.
- Source ranges stay within Sheet bounds.
- Table ranges do not overlap unexpectedly without an explicit relationship.
- AI-proposed ranges are within Sheet bounds and pass deterministic boundary validation before extraction.
- Every mapped significance label resolves through the table-level label map; unknown labels retain original evidence and require Review.

Failures may be:

- Snapshot blocking.
- Table blocking.
- Warning only.

---

## 17. Semantic Interpretation Pipeline

### 17.1 Inputs

AI receives a bounded semantic context:

- Table title.
- Question number and text.
- Row labels.
- Header labels.
- Nearby Section title.
- Table variant.
- Previous confirmed mappings.
- Project terminology.

Avoid sending the entire Workbook unless a controlled processing mode explicitly requires it.

### 17.2 Outputs

- Research template suggestion.
- Research module.
- Semantic question.
- Semantic metric.
- Entity mapping.
- Market and Wave recommendation.
- Short localized title.
- Confidence and evidence.

### 17.3 Structured response

All AI responses must validate against Pydantic schemas.

Invalid JSON triggers:

- One controlled repair attempt.
- Fallback to unclassified state.
- Review issue.

Do not repeatedly retry indefinitely.

### 17.4 Creator-confirmed precedence

Confirmed Project rules are injected as constraints, not merely suggestions.

---

## 18. AI Adapter

### 18.1 Provider-neutral interface

```python
from typing import Protocol, TypeVar, type
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class StructuredAIClient(Protocol):
    async def generate_structured(
        self,
        *,
        task_name: str,
        prompt_version: str,
        input_payload: dict,
        output_model: type[T],
        locale: str,
        correlation_id: str,
    ) -> T:
        ...
```

### 18.2 AI task categories

- Candidate table-boundary and region proposal from bounded structural summaries.
- Semantic classification.
- Short-title generation.
- Template/module recommendation.
- Change-preview interpretation.
- Insight wording.
- Translation.
- Client recommended-answer wording.

### 18.3 AI must not perform

- Read or interpret every workbook cell as the primary extraction method.
- Supply final table values, header mappings, Base mappings or significance mappings without deterministic source validation.
- Final numeric calculation.
- Database mutation.
- Mapping mutation.
- Permission decision.
- Publication decision.
- Significance calculation.

### 18.4 Prompt versioning

Every persisted AI result records:

- Task name.
- Prompt version.
- Model/provider version.
- Input object references.
- Output schema version.
- Confidence when supported.

---

## 19. Review Workflow Architecture

### 19.1 Review issue generation

Rules and AI create `ReviewIssue` records.

### 19.2 Review mutation command

```python
@dataclass
class ApplyMappingDecisionCommand:
    project_id: ProjectId
    object_type: str
    object_id: str
    field_name: str
    proposed_value: object
    apply_scope: str
    expected_revision: int
    actor_user_id: str
    reason: str | None
```

### 19.3 Impact analysis

Before applying:

- Resolve related tables.
- Resolve semantic metrics.
- Resolve modules.
- Resolve visuals.
- Resolve insights.
- Compute preview.

### 19.4 Transaction boundary

One confirmed mapping decision and its immediate canonical mapping changes should commit atomically.

Dependent Dashboard recalculation may run asynchronously after the mapping transaction.

### 19.5 Audit

Record before/after summary, actor, scope and reason.

---

## 20. Quick Data Validation Service

### 20.1 Sampler

A risk-weighted sampler chooses representative results.

```python
class ValidationSampler:
    def select_samples(
        self,
        extraction_snapshot_id: str,
        dashboard_version_id: str,
        sample_budget: int,
    ) -> list[str]:
        ...
```

### 20.2 Sample priorities

- Published or Core Dashboard source.
- Medium-confidence Header.
- New layout pattern.
- Different table variants.
- Multiple Markets/Waves.
- Significance.
- Derived calculation.

### 20.3 Pattern escalation

A failed sample may produce a pattern signature and related-table batch review suggestion.

### 20.4 No circular truth

Quick Validation compares source evidence with structured and Dashboard outputs. It must not use Dashboard output as the original truth.

---

## 21. Semantic Version and Mapping Reuse

### 21.1 Semantic-model version

Mapping changes create a new semantic-model version or revision, depending on implementation detail.

### 21.2 Identity matching

Candidate match score may use:

- Question number.
- Normalized question text.
- Table title.
- Row-label set.
- Header tree.
- Base.
- Market/Wave.
- Table variant.

### 21.3 Reuse categories

- Exact reusable.
- High-confidence reusable.
- Review required.
- Not reusable.

### 21.4 Cell-independent mapping

Source location change alone must not invalidate semantic mapping.

---

## 22. Official Result Materialization

### 22.1 Purpose

Convert verified Extracted Cells into queryable official result records.

### 22.2 Required dimensions

- Semantic metric.
- Entity, where applicable.
- Market.
- Wave.
- Dimension categories.
- Base result.
- Availability.
- Source Lineage.

### 22.3 Publishing eligibility

An Official Result can exist internally before Creator verification, but Published Package Builder filters by release-policy status.

---

## 23. Derived Calculation Engine

### 23.1 Deterministic engine

All derived calculations run in Python using decimal-aware or controlled floating arithmetic according to the metric.

### 23.2 Supported MVP calculations

- Difference.
- Mean Difference.
- Relative Change.
- Index to Total.
- Rank.
- Trend Direction.
- Funnel Conversion.

### 23.3 Calculation registry

```python
class DerivedCalculation(Protocol):
    calculation_type: str
    version: str

    def validate_inputs(self, inputs, context):
        ...

    def calculate(self, inputs, context):
        ...
```

### 23.4 Validation before calculation

- Same relevant scope.
- Unit compatibility.
- Availability.
- Non-zero denominator.
- Metric version comparability.
- Base relationship where required.

### 23.5 Significance isolation

Derived calculations never infer significance from input significance.

### 23.6 Formula version

Persist calculation version with every Derived Result.

---

## 24. Ranking Service

### 24.1 Precision

Rank using the highest available valid precision.

### 24.2 Ties

Define configurable tie behavior:

- Exact raw-value tie.
- Display-value tie warning.

### 24.3 Missing values

Unavailable values do not participate.

### 24.4 Special entities

`Other`, `None`, `Don't know` may be excluded or pinned by configured rules.

---

## 25. Analysis Module Service

### 25.1 Responsibilities

- Suggest modules.
- Bind metrics.
- Validate common dimensions.
- Validate Base compatibility.
- Maintain stage order.
- Expose available visual types.
- Reuse confirmed modules across Waves.

### 25.2 Module plugin pattern

```python
class AnalysisModuleHandler(Protocol):
    module_type: str
    version: str

    def suggest(self, semantic_context):
        ...

    def validate(self, module_definition, semantic_model):
        ...

    def build_visual_data(self, module_definition, query_context):
        ...
```

Initial handlers:

- Brand Awareness.
- Brand Funnel.
- Brand Imagery.
- Purchase Barriers.
- Purchase Channels.
- Concept Scorecard.
- Product Performance.
- Satisfaction/NPS.
- Pricing Results.

---

## 26. Template Engine

### 26.1 Configuration-driven templates

Templates should be stored as versioned configuration, validated by Pydantic.

```yaml
template_id: brand_tracking
version: 1.0.0
candidate_modules:
  - brand_awareness
  - brand_funnel
  - brand_imagery
  - brand_usage
  - purchase_intent
  - purchase_barriers
  - purchase_channels
  - wave_trend
```

### 26.2 Template contents

- Module recognition rules.
- Metric priorities.
- Page recommendations.
- Visual recommendations.
- Insight priorities.
- Default client questions.
- Localization keys.

### 26.3 Certification

Template state:

- Certified.
- Beta.
- Experimental.

Publication policy can restrict Experimental templates.

---

## 27. Dashboard Planning Service

### 27.1 Inputs

- Semantic-model version.
- Dashboard Context.
- Template configuration.
- Confirmed Analysis Modules.
- Existing Dashboard Version, for updates.

### 27.2 Outputs

- Core pages.
- Suggested pages.
- Visual definitions.
- Grid layout.
- Default metrics.
- Client View Options.
- Insight candidates.

### 27.3 Preservation rules

Existing Creator-confirmed settings take precedence over AI recommendation.

### 27.4 Change operations

Use explicit change commands rather than replacing the whole Dashboard JSON.

Examples:

- Add Visual.
- Update Visual Type.
- Reorder Page.
- Set Metric.
- Apply Sort Rule.
- Move Page Category.

### 27.5 Optimistic concurrency

Dashboard Version uses a revision number.

---

## 28. Visual Registry Backend Contract

The backend stores and validates visual capabilities independently of the front-end chart library.

### 28.1 Registry fields

- Visual type.
- Configuration schema version.
- Supported metric types.
- Supported units.
- Supported data shapes.
- Client support.
- Export support.
- Certification status.

### 28.2 Advanced visuals

Future plugins include:

- Word Cloud.
- Combination Chart.
- Dual-axis Chart.
- Waterfall.
- Scatter/Bubble.
- Treemap.
- Sankey.
- Correspondence Map.

### 28.3 Word Cloud backend boundary

Word Cloud input must be an approved frequency dataset.

MVP does not process raw respondent open text for Word Cloud without a future approved text-analytics pipeline.

### 28.4 Combination Chart validation

Validate:

- Shared category axis.
- Metric units.
- Axis assignment.
- Scope compatibility.
- Base compatibility.

---

## 29. Dashboard Query Service

### 29.1 Creator query

Creator may query verified and reviewable internal data, subject to Project permission.

### 29.2 Client query

Client query reads only Published Data Package content.

### 29.3 Query context

```python
@dataclass(frozen=True)
class DashboardQueryContext:
    project_id: str
    semantic_model_version_id: str
    market_id: str | None
    wave_id: str | None
    dimension_category_ids: tuple[str, ...]
    locale: str
    mode: str
```

### 29.4 Available Combination Matrix

Validate filters before querying.

### 29.5 No fallback

Do not automatically substitute Total for an unsupported combination.

### 29.6 Caching

Cache query results by:

- Immutable semantic/release version.
- Visual ID.
- Filter-state hash.
- Locale only when localized labels are embedded.

---

## 30. Insight Engine

### 30.1 Candidate detection

Deterministic rules identify:

- Highest/lowest.
- Rank.
- Difference.
- Trend.
- Gap.
- Funnel loss.
- Strength/weakness.
- Data warning.

### 30.2 Priority scoring

Calculate rule-based score in Python.

### 30.3 AI wording

AI converts evidence objects into natural language.

### 30.4 Evidence binding

Every Insight references Official and/or Derived Result IDs.

### 30.5 Claim validator

Before release, validate:

- Numbers match evidence.
- Units match.
- Significant wording has official support.
- Causal phrases are prohibited unless supported by future approved analysis.
- English and Chinese versions have equivalent claim strength.

### 30.6 Update validation

Re-evaluate evidence rules after New Wave or Replace Data.

---

## 31. Localization Service

### 31.1 Design

One semantic object, multiple localized display resources.

### 31.2 Responsibilities

- Store localized names and definitions.
- Track translation status.
- Apply Project terminology.
- Generate AI translation Drafts.
- Validate required publication coverage.
- Build Published Localization Package.

Creator-supplied translation files are a first-class source and take priority over AI translation Drafts. AI translation binds to stable domain object IDs and must preserve protected tokens, numeric values, question codes, significance labels, formulas and source references.

### 31.3 Translation memory

Use Project-level confirmed terminology first.

Future Client-level terminology can be added with stronger governance.

### 31.4 No language-specific calculations

Numbers, formulas, scope and evidence stay language-neutral.

### 31.5 Translation validation

Check protected tokens:

- Brand names.
- Wave labels when intentionally fixed.
- Numeric values.
- Units.
- Significance meaning.
- Base definitions.

An AI-translated locale is publishable only after an explicit Creator release choice accepting AI Draft translations. Without that choice, the release includes only locales satisfying the configured confirmed-translation policy. Record this choice in the publication audit.

---

## 32. Published Package Builder

### 32.1 Inputs

- Dashboard Version.
- Semantic-model version.
- Publication settings.
- Localization settings.
- Publication Gate result.

### 32.2 Output

Immutable Published Data Package containing only:

- Approved pages.
- Approved visuals.
- Approved Official Results.
- Verified Derived Results.
- Approved filters/combinations.
- Approved Insights.
- Approved localization resources.
- Client View Options.

### 32.3 Exclusions

- Draft.
- Review issues.
- Confidence.
- Source workbook.
- Raw Extraction JSON.
- Internal pages.
- Unapproved Insight.

### 32.4 Package signing or checksum

Store a checksum to support immutability verification and audit.

---

## 33. Share Link and Client Access Architecture

### 33.1 Token

Generate cryptographically secure random tokens. Store only a hash where possible.

### 33.2 Password

Use an approved password-hashing algorithm such as Argon2id.

### 33.3 Access session

After password validation, issue a short-lived secure access session bound to the Share Link.

### 33.4 Expiry and revocation

Check access state on package retrieval and protected export download.

### 33.5 Cache control

Protected responses require cache behavior that supports practical revocation.

### 33.6 Rate limiting

Rate-limit:

- Password attempts.
- Share-link access.
- Client question requests.
- Export requests.

---

## 34. Client Recommended Question Service

### 34.1 Question definition

Questions are pre-approved definitions tied to page/module availability.

### 34.2 Execution

```text
Question Definition
-> Published permission check
-> Filter validation
-> Published result retrieval
-> Deterministic evidence assembly
-> AI wording
-> Source visual link
```

### 34.3 AI boundary

AI receives only the evidence required for the answer.

### 34.4 No free-form mutation

MVP Client has no command path to mapping, visual or publication mutations.

### 34.5 Answer caching

Cache by:

- Published Release.
- Question definition.
- Valid filter state.
- Locale.

---

## 35. New-Wave Update Pipeline

### 35.1 Stages

```text
Upload new Wave
-> Extract
-> Match existing semantic model
-> Classify changes
-> Apply safe updates to new Draft
-> Create Review issues
-> Refresh derived results
-> Revalidate Insights
-> Generate Impact Report
```

### 35.2 Change classification

- Safe Update.
- Review Required.
- Conflict.
- New Content.
- Removed Content.
- Not Comparable.
- Recognition Failed.

### 35.3 Preserved configuration

- Mapping.
- Analysis Module.
- Chart.
- Layout.
- Sort.
- Color.
- Title.
- Client View Options.

### 35.4 New options

Historical Wave stores `not_asked`, not zero.

---

## 36. Replace Data Pipeline

### 36.1 Stages

```text
Create replacement operation
-> Upload new Source File Version
-> Extract new snapshot
-> Match old and new tables
-> Migrate semantic bindings
-> Generate Mapping Migration Report
-> Materialize corrected official results
-> Refresh Dashboard Draft
-> Revalidate Insight
-> Generate Replacement Impact Report
```

### 36.2 Existing release

Published Release remains immutable.

### 36.3 Suspension option

Creator may suspend the active Share Link while correction is reviewed.

### 36.4 Mapping migration

Match semantic identity independently of cell coordinates.

### 36.5 Replaced source

Old source remains recoverable according to retention policy.

---

## 37. PDF Generation Architecture

### 37.1 Recommended approach

Create a dedicated export-rendering route or rendering document using immutable Published Package or selected Draft export data.

Use a server-side browser renderer to generate PDF.

### 37.2 Export mode

- Executive.
- Full Report.
- English.
- Chinese.

### 37.3 Pagination

The front-end export layout supplies page-break hints. The Python export service coordinates job state and artifact storage.

### 37.4 Determinism

- Fixed fonts.
- Fixed viewport/page size.
- Animation disabled.
- Network idle and chart-ready hooks.
- Versioned renderer.

### 37.5 QA metadata

Store:

- Published Release.
- Export configuration.
- Renderer version.
- Locale.
- Generated timestamp.
- Checksum.

---

## 38. PPT Snapshot Architecture

### 38.1 Snapshot scope

MVP generates presentation-ready static slides.

### 38.2 Options

Potential implementation:

- Render page/module images from export route.
- Use Python to place images, titles, footer and notes into PPTX.

### 38.3 Client template

Full arbitrary client-template replication is not mandatory for initial MVP. The architecture should allow a versioned Slide Theme adapter later.

### 38.4 Bilingual export

Generate separate English and Chinese files by default.

### 38.5 Speaker notes

Optional future use for:

- Source notes.
- Technical definitions.
- Chart-level Insight.

Do not expose internal Source Cell or Review metadata in client output by default.

---

## 39. Event and Task Model

### 39.1 Domain events

Examples:

- SourceFileUploaded.
- ExtractionCompleted.
- MappingConfirmed.
- SemanticModelUpdated.
- DashboardDraftGenerated.
- DataReplacementCompleted.
- PublishedReleaseCreated.
- ShareLinkSuspended.
- ExportCompleted.

### 39.2 Transactional outbox

Use an outbox pattern for reliable event delivery when database changes must trigger workers.

### 39.3 Task payload

Queue messages should contain IDs and operation metadata, not large workbook content.

### 39.4 Task idempotency

Every long-running task records operation ID and pipeline version.

---

## 40. Retry and Failure Handling

### 40.1 Retryable

- Temporary AI timeout.
- Temporary object-storage error.
- Temporary export browser startup failure.
- Queue/network transient failure.

### 40.2 Non-retryable without user action

- Password-protected workbook.
- Corrupt workbook.
- Unsupported file structure where no fallback succeeds.
- Mapping conflict.
- Missing formula cache for required value.

### 40.3 Retry limits

Use bounded exponential backoff with clear terminal state.

### 40.4 Partial completion

Persist successful Sheet/Table results where architecture permits. One failed Sheet should not discard all successful extraction.

### 40.5 Dead-letter process

Terminal failed tasks should be inspectable and replayable by authorized support staff.

---

## 41. API Design Principles

### 41.1 Internal Creator API

Supports:

- Projects.
- Uploads.
- Processing.
- Review.
- Data Explorer.
- Dashboard editing.
- Publishing.
- Updates and replacements.

### 41.2 Client API

Supports only:

- Share access.
- Published Package.
- Approved filter query.
- Recommended questions.
- Approved downloads.

### 41.3 Commands versus queries

Separate mutation and read models conceptually.

### 41.4 Pagination

Required for:

- Table catalog.
- Review issues.
- Audit events.
- Releases.

### 41.5 Error contract

Use stable codes, localized user messages and correlation IDs.

### 41.6 OpenAPI

Generate OpenAPI and typed front-end client contracts.

---

## 42. Illustrative API Endpoints

The final endpoint design may change, but the following illustrates scope.

```text
POST   /api/projects
GET    /api/projects/{project_id}
POST   /api/projects/{project_id}/uploads
POST   /api/uploads/{upload_id}/complete
GET    /api/jobs/{job_id}
GET    /api/projects/{project_id}/review-issues
POST   /api/review-issues/{issue_id}/resolve
GET    /api/projects/{project_id}/tables
GET    /api/tables/{table_id}
POST   /api/mapping-decisions/preview
POST   /api/mapping-decisions/apply
GET    /api/dashboards/{dashboard_id}/versions/{version_id}
POST   /api/dashboard-changes/preview
POST   /api/dashboard-changes/apply
POST   /api/dashboards/{dashboard_id}/publish
POST   /api/releases/{release_id}/suspend
POST   /api/releases/{release_id}/rollback
POST   /api/source-datasets/{dataset_id}/replace
GET    /api/replacements/{replacement_id}/impact
```

Client examples:

```text
POST   /api/share/{token}/access
GET    /api/share/{token}/package
POST   /api/share/{token}/query-visual
POST   /api/share/{token}/questions/{question_id}/answer
POST   /api/share/{token}/exports
```

---

## 43. Authorization

### 43.1 Roles

- Admin.
- Creator.
- External Share Viewer.

### 43.2 Permission checks

Check at application-service layer, not only API routing.

### 43.3 Project isolation

Every Project-scoped query includes authorized Project context.

### 43.4 Share viewer

Share access is limited to one Published Release or configured release pointer.

### 43.5 Object storage

The browser never receives unrestricted Project storage access.

---

## 44. Security Controls

### 44.1 Encryption

- TLS in transit.
- Storage and database encryption at rest.

### 44.2 Sensitive values

- Secret manager.
- Password hashing.
- Signed short-lived downloads.
- Token hashing.

### 44.3 Input security

- Workbook malware scan.
- File limits.
- Zip-bomb protection.
- Safe XML parser settings.
- Formula content treated as data, not executed.

### 44.4 Output security

- Escape source text.
- Sanitize AI-generated rich text.
- Content Security Policy.
- No internal metadata in Published Package.

### 44.5 AI privacy

- Minimize supplied context.
- Do not send original workbook when structured context suffices.
- Record provider and model-use policy.
- Support approved regional endpoint configuration.

---

## 45. Audit and Compliance

Audit:

- Upload.
- Mapping change.
- Bulk mapping.
- Dashboard change.
- Insight edit.
- Translation edit.
- Replace Data.
- Publish.
- Suspend.
- Rollback.
- Share revoke.
- Permanent delete.

Audit events retain summaries, not unnecessary full cell content.

---

## 46. Observability

### 46.1 Structured logging

Include:

- Correlation ID.
- Project ID where authorized and safe.
- Job ID.
- Pipeline stage.
- Parser version.
- Duration.
- Outcome.

### 46.2 Metrics

- Upload count and size.
- Processing duration by stage.
- Tables per workbook.
- Recognition failure rate.
- AI task latency and failure.
- Mapping reuse.
- Dashboard query latency.
- Export duration.
- Client-access errors.

### 46.3 Tracing

Trace:

```text
HTTP request
-> Application command
-> Queue task
-> Pipeline stage
-> AI call / storage call
```

### 46.4 Alerts

- Queue backlog.
- Repeated extraction failure.
- Publication failure.
- Share-access error spike.
- Export failure spike.
- AI error spike.
- Object-storage failure.

### 46.5 Sensitive-data rule

Do not emit raw respondent or full Tab content into normal logs.

---

## 47. Health and Readiness

### 47.1 Liveness

Process is running.

### 47.2 Readiness

Required dependencies are available for the service role.

API readiness may check:

- Database.
- Queue connection.
- Object storage.

AI provider may be treated as degraded rather than making the whole API unready, because graceful degradation is required.

### 47.3 Worker health

Track heartbeats and task throughput.

---

## 48. Performance Strategy

### 48.1 Asynchronous heavy work

- Workbook extraction.
- AI semantic batches.
- Dashboard Draft generation.
- PDF/PPT export.
- New-Wave update.
- Replace Data.

### 48.2 Batch AI calls

Group semantically related tables while respecting token limits and isolation.

### 48.3 Database indexes

Likely query dimensions:

- Project.
- Metric.
- Wave.
- Market.
- Entity.
- Dashboard Version.
- Published Release.
- Review status.

### 48.4 Published Package optimization

Build a compact query-optimized package instead of reconstructing client views from all internal tables on each request.

### 48.5 Cache invalidation

Published Release is immutable, simplifying caching. Draft caches include revision/version.

---

## 49. Scalability Path

The modular monolith can later split by pressure point.

Possible service extraction order:

1. Export rendering.
2. Workbook extraction workers.
3. AI orchestration.
4. Client-published query service.
5. Advanced analytics.

Do not split solely to follow a microservice trend.

---

## 50. Deployment Environments

Recommended:

- Development.
- Integration.
- UAT.
- Production.

Optional:

- Performance/benchmark environment.

Each environment has separate:

- Database.
- Object storage namespace.
- Queue.
- AI credentials.
- Share-link signing material.

---

## 51. Containerization

Package API and worker into container images from the same source revision.

### 51.1 Image principles

- Minimal base image.
- Non-root execution.
- Pinned system packages.
- Vulnerability scanning.
- Separate build and runtime stages.
- Fonts required for Chinese export included where licensing permits.

### 51.2 Export image

Browser-rendering dependencies may justify a dedicated export-worker image.

---

## 52. Database Migration Strategy

- Alembic migrations reviewed with application changes.
- Backward-compatible expansion before code switches to new fields.
- Destructive migrations scheduled separately.
- Published Release data cannot be silently transformed without migration artifacts and tests.

### 52.1 Deployment pattern

Prefer:

```text
Expand
-> Deploy compatible code
-> Backfill
-> Switch reads/writes
-> Contract later
```

---

## 53. Backup and Disaster Recovery

### 53.1 Backup scope

- PostgreSQL.
- Object-storage versioning or backup.
- Configuration and template definitions.

### 53.2 Recovery objectives

RPO and RTO require business confirmation.

### 53.3 Restore test

Perform periodic restore drills including:

- Project.
- Source version.
- Extraction Snapshot.
- Published Release.
- Share-link state.

---

## 54. Data Retention

Configurable retention for:

- Active source files.
- Replaced source files.
- Extraction artifacts.
- Export files.
- Audit records.
- AI interaction metadata.

Permanent deletion creates an audit tombstone while removing protected content according to policy.

---

## 55. Python Testing Strategy

### 55.1 Unit tests

- Parsers.
- Header trees.
- Value normalizers.
- Derived calculations.
- Comparability.
- Localization validation.
- Publication Gate.

### 55.2 Property-based tests

Useful for:

- Number-format conversion.
- Difference and ratio edge cases.
- Header-tree flattening.
- Availability-state invariants.

### 55.3 Golden Workbook tests

Run extraction and semantic comparison against truth fixtures. The first fixture set contains 20-30 annotated physical tables, not complete workbooks, and includes Quantum, Decipher, multiple significance layouts, alternating Count/Percentage rows, merged and unmerged Headers, missing Base, question text outside A, Header depth above three and complex/error regions.

Each table fixture records exact table/title/Header/Base/data/footnote/significance coordinates and three to five Cell Truth samples. Layer 1 is successful only when every Golden table is covered by a coarse candidate, full range or valid continuation. Layer 2 is scored after Python validation, not on raw model coordinates.

For the first release, require 100% Layer 1 coverage with zero missed tables, at least 95% Layer 2 final exact-structure accuracy, zero incorrect auto-accepts, and no more than 10% `review_required` tables. Write a status-only evaluation artifact for every run, with Layer 1 coverage/misses/status/unclassified-reason distributions, Layer 2 window/candidate-status distributions, validation outcomes, and source-family/Sheet/Header-depth/significance-layout breakdowns. Do not place business content in this report.

### 55.4 Contract tests

Validate Pydantic and generated JSON Schema compatibility.

### 55.5 Integration tests

- Database repositories.
- Object storage.
- Queue.
- AI adapter with controlled stubs.
- Browser export.

### 55.6 End-to-end tests

- Upload to Draft.
- Mapping correction.
- Publish.
- Client question.
- New Wave.
- Replace Data.
- Suspend and rollback.

---

## 56. Development Tooling

Recommended:

- `ruff` for linting and formatting policy.
- `mypy` or `pyright` for type checking.
- `pytest`.
- `hypothesis` where appropriate.
- `pre-commit`.
- Dependency vulnerability scanning.
- Coverage reporting.

### 56.1 Quality gate

CI should fail on:

- Formatting/lint failure.
- Type-check failure in enforced modules.
- Unit-test failure.
- Schema-contract failure.
- Golden regression failure for affected parsers.
- Security scan above approved severity threshold.

---

## 57. Coding Standards

### 57.1 Type hints

All public functions and application-service boundaries require type hints.

### 57.2 Exceptions

Use domain-specific exceptions with stable error codes.

### 57.3 Time

Store UTC. Localize presentation at the edge.

### 57.4 Money and exact decimal

Use `Decimal` where exact currency or decimal behavior is required.

### 57.5 Functions

Keep extraction, validation and mutation responsibilities separate.

### 57.6 No hidden mutations

Do not modify passed-in domain objects unexpectedly.

### 57.7 Comments and documentation

Document non-obvious research or parser logic, including why a heuristic is safe or review-required.

### 57.8 Logging

Use structured logs. Do not concatenate sensitive payloads into messages.

---

## 58. API and Worker Idempotency

### 58.1 Operations requiring idempotency

- Upload completion.
- Ingestion start.
- Extraction.
- Semantic interpretation.
- Dashboard Draft generation.
- Publish.
- Export.
- Replace Data.
- New-Wave update.

### 58.2 Idempotency record

Store:

- Key.
- Operation type.
- Request hash.
- Status.
- Result object ID.
- Expiry.

### 58.3 Conflict

Same key with a different request hash returns a conflict.

---

## 59. Versioning Strategy

Version independently:

- API.
- JSON Schema.
- Parser.
- Workbook Adapter.
- Semantic Classifier Prompt.
- Calculation.
- Template.
- Visual Registry.
- Export Renderer.
- Published Package.

Persist relevant versions with generated artifacts.

---

## 60. Graceful-Degradation Matrix

### AI unavailable

- Extraction proceeds.
- Semantic fields may remain Unclassified.
- Creator review remains available.

### Export unavailable

- Hosted Dashboard remains available.
- Export job can retry.

### One Sheet fails

- Other Sheets proceed.
- Failed Sheet enters Review.

### Optional visual plugin unavailable

- Other visuals load.
- Controlled unsupported state shown.

### Translation unavailable

- Creator sees missing status.
- Publication behavior follows Localization policy.

### Queue pressure

- Job remains queued with transparent status.
- API remains responsive.

---

## 61. Delivery Plan

### Phase 0 - Technical foundation

Deliver:

- Repository.
- CI/CD.
- FastAPI skeleton.
- PostgreSQL migrations.
- Object storage adapter.
- Queue/worker skeleton.
- Pydantic base contracts.
- Authentication baseline.

### Phase 1 - Workbook extraction

Deliver:

- Upload.
- Workbook scan.
- Sheet/cell extraction.
- Table detection.
- Header/Base/value parsing.
- Extraction JSON.
- Source preview.
- Golden tests.

### Phase 2 - Semantic and Review

Deliver:

- AI adapter.
- Semantic JSON.
- Confidence.
- Review Summary.
- Mapping Review.
- Quick Data Validation.
- Data Explorer.

### Phase 3 - Dashboard Draft

Deliver:

- Template Engine.
- Analysis Modules.
- Derived Calculation Engine.
- Dashboard Planner.
- Visual Registry contracts.
- Core/Suggested Pages.
- Insight candidates.

### Phase 4 - Publishing

Deliver:

- Publication Gate.
- Published Package.
- Share-link access.
- Client Dashboard API.
- Client recommended questions.
- Suspend/Rollback.

### Phase 5 - Export and bilingual hardening

Deliver:

- PDF.
- PPT Snapshot.
- English/Chinese publication.
- Localization review.
- Font and rendering validation.

### Phase 6 - Tracking operations

Deliver:

- New-Wave update.
- Replace Data.
- Mapping migration.
- Impact Reports.
- Insight revalidation.

---

## 62. Suggested MVP Team Responsibilities

### Product / Domain

- Product Manager.
- DP/Research domain lead.
- Research template owner.

### Engineering

- Python backend lead.
- Excel/parser engineer.
- Front-end engineer(s).
- AI/LLM engineer.
- QA automation engineer.
- DevOps/platform engineer.

### Design

- UX/UI designer.

### Pilot validation

- Experienced DP users.
- Researchers/Project Owners.

---

## 63. Key Technical Risks

### Non-standard Workbook layouts

Mitigation:

- Hybrid parser.
- Adapter registry.
- Quick Validation.
- Field-level confidence.
- Reusable pattern corrections.

### Header mismatch

Mitigation:

- Full path.
- Blocking rules.
- Source Lineage.
- Golden tests.

### AI non-determinism

Mitigation:

- Structured output.
- Prompt versioning.
- Confirmed-rule precedence.
- No direct mutation.

### Large Workbooks

Mitigation:

- Chunked processing.
- Async workers.
- Bounded memory.
- Performance benchmarks.

### Published-data correction

Mitigation:

- Immutable releases.
- Replace Data.
- Suspend/Rollback.

### Bilingual inconsistency

Mitigation:

- One evidence set.
- Terminology dictionary.
- Translation review.
- Claim validator.

### Visual expansion

Mitigation:

- Visual Registry.
- Stable visual envelope.
- Certification state.

---

## 64. Architecture Decision Records

Create ADRs for decisions including:

```text
ADR-001 Modular monolith versus microservices
ADR-002 FastAPI and Pydantic
ADR-003 PostgreSQL and JSONB boundary
ADR-004 Queue/worker technology
ADR-005 Original Workbook storage and retention
ADR-006 Excel parser library strategy
ADR-007 AI-provider abstraction
ADR-008 Published Package immutability
ADR-009 PDF rendering approach
ADR-010 PPT Snapshot approach
ADR-011 Client access-session approach
ADR-012 Visual Registry
ADR-013 Localization storage model
```

Each ADR contains:

- Context.
- Decision.
- Alternatives.
- Consequences.
- Status.
- Date.

---

## 65. Initial Definition of Done

A backend feature is complete when:

- Domain behavior implemented.
- Typed contracts defined.
- Authorization enforced.
- Audit behavior applied where required.
- Unit tests pass.
- Integration tests pass.
- Error and retry behavior defined.
- Observability added.
- English and Chinese implications reviewed.
- Security impact reviewed.
- Relevant Golden tests pass.
- Documentation updated.

---

## 66. Open Technical Decisions

- Final Python runtime version.
- FastAPI deployment topology.
- Celery versus Dramatiq versus managed queue integration.
- Redis requirement.
- PostgreSQL hosting model.
- Object storage provider.
- Malware scanning service.
- Workbook size and concurrency limits.
- Formula-cache strategy.
- AI provider and approved regional endpoint.
- HTML-to-PDF renderer.
- PPT Snapshot renderer.
- Client access cookie/token design.
- Cache policy and revocation latency.
- Final chart library.
- Observability platform.
- Container/orchestration platform.
- RPO/RTO.
- Data-retention periods.

---

## 67. Recommended Next Engineering Artifacts

After approval of this architecture, create:

```text
07_API_Contract_and_Endpoint_Specification.md
08_Database_Logical_Model.md
09_Excel_Parser_Detailed_Design.md
10_AI_Orchestration_and_Guardrails.md
11_Deployment_and_Operations_Runbook.md
```

The immediate priority should be:

1. Architecture Decision Records.
2. Pydantic schema package.
3. Golden Workbook fixture library.
4. Parser proof of concept.
5. Upload-to-Extraction vertical slice.
6. Quick Validation prototype.
