# AI Research Dashboard Platform
## UI / Front-end Engineering Specification

**Document ID:** `05_UI_Frontend_Engineering_Specification`  
**Version:** v1.1  
**Status:** Initial front-end implementation specification  
**Date:** 13 August 2026  
**Supported languages:** English (`en`) and Simplified Chinese (`zh-CN`)  
**Related documents:**  
- `01_AI_Research_Dashboard_PRD_MVP_v1.2.md`  
- `02_Data_and_JSON_Specification_v1.1.md` 
- `03_UX_Flow_and_Prototype_Specification_v1.1.md` 
- `04_Validation_and_Acceptance_Test_Plan.md` v1.0  
- `KANTAR AI COLLEAGUE UI 真实页面代码重构规范 v260622.docx`  

---

## 1. Purpose

This document defines the front-end architecture, design system, component contracts, interaction states, localization approach and engineering standards for the AI Research Dashboard Platform MVP.

It converts the approved product and UX requirements into implementation-ready rules for:

- Creator application shell.
- Client Hosted Dashboard shell.
- Project and upload workflows.
- Asynchronous processing states.
- Review Summary and Data Explorer.
- Mapping Review Panel.
- Dashboard Builder and responsive grid.
- Chart wrappers and data-state handling.
- Creator AI assistant drawer.
- Publishing and share-link flows.
- New-Wave and Replace Data interfaces.
- English and Chinese localization.
- Accessibility, testing and performance.

---

## 2. Front-end Scope

### 2.1 Included

- Web application architecture.
- Creator and Client application shells.
- Routing and page hierarchy.
- Component library conventions.
- Design tokens.
- Typography and iconography.
- Responsive grid.
- State-management boundaries.
- API-client conventions.
- Localization.
- Dashboard visual wrappers.
- Error, empty and loading states.
- Accessibility.
- Front-end test strategy.
- Performance budgets.
- Security-sensitive client behavior.

### 2.2 Not included

- Python service implementation.
- Physical database design.
- Excel parsing algorithms.
- AI prompt design.
- Statistical calculation implementation.
- Hosting infrastructure.
- Final choice of charting library, unless confirmed during technical architecture.

---

## 3. Recommended Technology Direction

The final stack is confirmed in `06_Python_Technical_Architecture.md`. The front-end should be compatible with the following recommended direction:

- React.
- TypeScript with strict mode.
- Vite or a framework-approved build system.
- React Router or framework-equivalent routing.
- TanStack Query for server state.
- Zustand or equivalent lightweight store for local editor state.
- React Hook Form with schema validation.
- Zod-generated or OpenAPI-generated API types.
- Tailwind CSS using approved design tokens.
- A headless accessible component foundation.
- A chart library wrapped behind platform-owned chart contracts.
- `react-i18next`, FormatJS or an equivalent locale framework.
- Playwright for end-to-end testing.
- Vitest and React Testing Library for unit/component tests.

The implementation must avoid deep coupling to one chart library's proprietary configuration shape.

---

## 4. Repository and Module Structure

Recommended structure:

```text
frontend/
  src/
    app/
      providers/
      router/
      layouts/
      error-boundaries/
    api/
      generated/
      clients/
      query-keys/
      mutations/
    components/
      primitives/
      forms/
      feedback/
      navigation/
      data-display/
    features/
      projects/
      uploads/
      processing/
      recognition/
      review-summary/
      quick-validation/
      data-explorer/
      mapping-review/
      dashboards/
      insights/
      localization/
      publishing/
      releases/
      sharing/
      new-wave/
      replace-data/
      client-dashboard/
      ai-assistant/
    charts/
      contracts/
      adapters/
      wrappers/
      formatters/
      accessibility/
    design-system/
      tokens/
      themes/
      typography/
      icons/
    i18n/
      locales/
        en/
        zh-CN/
      terminology/
      formatters/
    state/
    hooks/
    lib/
    types/
    tests/
  public/
  e2e/
  package.json
  tailwind.config.ts
  tsconfig.json
```

### 4.1 Feature ownership

Each feature owns:

- Route-level component.
- Feature-specific UI components.
- Server-query hooks.
- Mutation hooks.
- Local types not supplied by API contracts.
- Unit and integration tests.

Shared components should not contain project-specific business logic.

---

## 5. Application Shells

The product has two distinct shells.

### 5.1 Creator Shell

Used by Admin and Creator.

```text
+----------------------+--------------------------------------+-------------------+
| Global left sidebar  | Main Creator workspace               | AI assistant      |
| fixed, about 240px   | responsive                           | 380px drawer      |
+----------------------+--------------------------------------+-------------------+
```

Responsibilities:

- Product navigation.
- Project context.
- Creator editing tools.
- Internal review states.
- AI assistance.

### 5.2 Client Shell

Used through Hosted HTML share links.

Responsibilities:

- Read-only page navigation.
- Approved filters.
- Approved View Options.
- Recommended AI questions.
- Downloads.
- Language switching.

The Client Shell must not import or expose Creator-only feature modules such as Mapping Review, Extraction JSON or Internal Data Explorer.

### 5.3 Bundle separation

Where practical, Creator and Client routes should use separate route bundles. Client bundles should not contain internal-only code or data contracts that are unnecessary for published viewing.

---

## 6. Routing

### 6.1 Creator routes

```text
/projects
/projects/new
/projects/:projectId
/projects/:projectId/data
/projects/:projectId/processing/:jobId
/projects/:projectId/review
/projects/:projectId/validation
/projects/:projectId/explorer
/projects/:projectId/dashboards
/projects/:projectId/dashboards/:dashboardId/edit
/projects/:projectId/dashboards/:dashboardId/client-preview
/projects/:projectId/publish
/projects/:projectId/releases
/projects/:projectId/releases/:releaseId
/projects/:projectId/update-wave
/projects/:projectId/replace-data/:sourceDatasetId
/admin
```

### 6.2 Client routes

```text
/share/:shareToken
/share/:shareToken/access
/share/:shareToken/dashboard
/share/:shareToken/dashboard/:pageSlug
/share/:shareToken/downloads
```

### 6.3 Route guards

Creator guards validate:

- Authenticated user.
- Project membership.
- Role and action permission.

Client guards validate:

- Share token.
- Link state.
- Password session where required.
- Expiration.
- Suspended or revoked status.

The browser must not make authorization decisions solely from hidden UI controls. Backend authorization remains authoritative.

---

## 7. Design Tokens

### 7.1 Color tokens

```css
:root {
  --color-primary-bg: #1D1D1B;
  --color-workspace-bg: #F5F5F5;
  --color-surface: #FFFFFF;
  --color-ai-accent: #FCC53B;
  --color-ai-callout-bg: #FFF9EB;
  --color-text-primary: #1D1D1B;
  --color-text-secondary: #6F7684;
  --color-border: #E5E7EB;
  --color-overlay: rgba(0, 0, 0, 0.65);
}
```

### 7.2 Status tokens

The brand accent remains yellow. Semantic states may use restrained functional colors where accessibility and clarity require them, but these must not become competing product theme colors.

```css
:root {
  --color-status-info-text: #334155;
  --color-status-info-bg: #F1F5F9;
  --color-status-warning-text: #7C4A03;
  --color-status-warning-bg: #FFF9EB;
  --color-status-error-text: #8A1C1C;
  --color-status-error-bg: #FEF2F2;
  --color-status-success-text: #245C3A;
  --color-status-success-bg: #F0F7F2;
}
```

Status must always include text or icon, never color alone.

### 7.3 Spacing tokens

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

### 7.4 Radius tokens

The product uses restrained geometry.

```css
:root {
  --radius-none: 0;
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
}
```

Avoid excessive rounded cards and pill-shaped controls except for the collapsed AI capsule or compact tags.

### 7.5 Border and shadow

```css
:root {
  --border-default: 1px solid var(--color-border);
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-drawer: -8px 0 24px rgba(0, 0, 0, 0.12);
}
```

---

## 8. Typography

### 8.1 Font families

```css
:root {
  --font-sans: "Inter", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

Use open, commercially usable font assets and confirm deployment licensing.

### 8.2 Type scale

```css
:root {
  --text-h1: 24px;
  --text-h2: 18px;
  --text-h3: 16px;
  --text-body: 14px;
  --text-caption: 12px;
  --weight-regular: 400;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

### 8.3 Numeric typography

Use the mono font selectively for:

- Processing percentage.
- Technical IDs.
- Version number.
- Aligned source coordinates.
- Dense numeric validation comparisons.

Do not use monospace for client-facing paragraphs or chart titles.

### 8.4 Chinese line breaking

- Avoid arbitrary spaces between Chinese characters.
- Allow natural Chinese line wrapping.
- Prevent English Brand names from splitting in the middle where possible.
- Test mixed Chinese/English labels in buttons, legends and filters.

---

## 9. Iconography

### 9.1 Principles

- Use one consistent icon set.
- Prefer outlined icons with a consistent stroke.
- Icons supplement, not replace, important business labels.
- Avoid decorative emoji in production UI, except where the approved language switcher explicitly requires a globe icon and the final icon asset is not yet available.

### 9.2 Required icons

- Project.
- Upload.
- Processing.
- Review.
- Dashboard.
- Preview.
- Publish.
- Warning.
- Conflict.
- Source/evidence.
- Undo/Redo.
- Replace.
- Suspend.
- Rollback.
- Download.
- Language.
- AI assistant.

---

## 10. Global Left Sidebar

### 10.1 Dimensions

- Width: approximately 240px.
- Fixed from top to bottom.
- Background: `#1D1D1B`.
- Horizontal padding: 16px.

### 10.2 Structure

```text
Logo
Language Switcher
Primary Navigation
Project Status Summary, when project-scoped
Flexible Spacer
User Name
Application Version
```

### 10.3 Navigation item states

#### Default

- Transparent background.
- Light grey text.

#### Hover

- Subtle lighter dark background.
- Cursor pointer.

#### Active

- Yellow background `#FCC53B`.
- Black text.
- Selected icon or checkbox treatment.

#### Disabled

- Lower contrast.
- Explain reason with tooltip where required.

### 10.4 Project workflow item

```ts
interface WorkflowNavItem {
  id: string;
  stepNumber?: number;
  labelKey: string;
  icon: React.ComponentType;
  route: string;
  state: "not_started" | "in_progress" | "complete" | "warning" | "blocked";
  isActive: boolean;
  isDisabled: boolean;
  disabledReasonKey?: string;
}
```

---

## 11. Language Switcher

### 11.1 Layout

- Width fits within sidebar margins.
- Height: approximately 36px.
- Background: `#2A2A28`.
- Border: none or subtle dark border.
- Radius: 2px.

### 11.2 Content

```text
[globe icon] 中文 / ENGLISH
```

### 11.3 Behavior

- Updates UI locale without route reset.
- Preserves Project, Dashboard page and filters.
- Persists preference in authenticated user settings or local storage for share-link users.
- Does not modify source data or Published Release.

### 11.4 Accessibility

Accessible name example:

```text
Switch language to English
切换语言至中文
```

`lang` attribute on the document root updates with locale.

---

## 12. Main Workspace

### 12.1 Background and width

- Background: `#F5F5F5`.
- Main workspace occupies remaining viewport width.
- Apply reasonable max-width only to forms and review content; Dashboard Canvas may use available width.

### 12.2 Page header

Contains:

- Breadcrumb, where useful.
- H1.
- Supporting description.
- Primary action area.
- Status and version metadata.

Do not duplicate workflow step navigation in a top header when it is already represented in the left sidebar.

### 12.3 Content card

- White surface.
- Subtle border.
- Minimal shadow.
- Yellow vertical title accent.
- Internal padding: 20-24px desktop.

```ts
interface WorkspaceCardProps {
  title: string;
  description?: string;
  status?: CardStatus;
  actions?: React.ReactNode;
  children: React.ReactNode;
  isCollapsible?: boolean;
}
```

---

## 13. Buttons

### 13.1 Primary

- Yellow background.
- Black text.
- Semi-bold 14px.
- Rectangular, restrained radius.

### 13.2 Secondary

- White background.
- Grey border.
- Primary text color.

### 13.3 Tertiary

- Text or low-emphasis button.
- Used for non-destructive secondary actions.

### 13.4 Destructive

Use a functional destructive style, not the product yellow.

Require confirmation for:

- Suspend.
- Revoke.
- Rollback.
- Permanent delete.

### 13.5 Disabled

- Grey background or muted border.
- Explicit reason near the action for important workflow buttons.

Example:

```text
Resolve publication blockers before continuing
```

### 13.6 Loading

- Maintain button width.
- Show spinner and action-specific loading label.
- Prevent duplicate mutations.

---

## 14. Forms and Inputs

### 14.1 Input dimensions

- Minimum height: approximately 40px.
- White background.
- 1px border.
- 14px text.

### 14.2 States

- Default.
- Hover.
- Focus.
- Error.
- Disabled.
- Read-only.
- Loading, for async-select fields.

### 14.3 Labels

- Visible labels required.
- Optional indicator localized.
- Help text uses Caption style.

### 14.4 Validation

- Field-level message beneath input.
- Summary message for complex forms.
- Focus moves to the first invalid field on submission.

### 14.5 Search and command input

Data Explorer and AI input may use an arrow/send action on the right, but keyboard submission and accessible naming are required.

---

## 15. Status Components

### 15.1 Status badge

```ts
interface StatusBadgeProps {
  status:
    | "high_confidence"
    | "medium_confidence"
    | "low_confidence"
    | "review_required"
    | "conflict"
    | "verified"
    | "published"
    | "suspended";
  label?: string;
  showIcon?: boolean;
}
```

### 15.2 Submitted tag

Approved Kantar-style state:

```text
✓ SUBMITTED
```

Use yellow background and black text only for the relevant submitted/confirmed context.

### 15.3 Risk panel

Risk panels include:

- Severity icon.
- Risk-class label.
- Headline.
- Impact.
- Primary next action.

---

## 16. AI Processing Modal

### 16.1 Layout

- Full-screen overlay: `rgba(0, 0, 0, 0.65)`.
- White rectangular dialog.
- Thin yellow top border.
- KANTAR caption.
- AI ENGINE heading.
- Current processing stage.
- Large percentage.
- Yellow progress bar.

### 16.2 State contract

```ts
interface ProcessingState {
  jobId: string;
  stage:
    | "file_validation"
    | "workbook_scan"
    | "table_detection"
    | "data_extraction"
    | "semantic_interpretation"
    | "draft_generation"
    | "review_summary";
  progressPercentage: number | null;
  completedUnits?: number;
  totalUnits?: number;
  canNavigateAway: boolean;
  messageKey: string;
}
```

### 16.3 Long-running transition

After initial confirmation of upload, transition from blocking modal to non-blocking Processing Page when the job exceeds the short-interaction threshold.

Do not fake precise percentages when the backend cannot provide them. Use indeterminate progress with accurate stage text.

---

## 17. AI Assistant Drawer

### 17.1 Collapsed component

- Floating avatar.
- Dark capsule.
- Yellow status dot.
- Localized label.

### 17.2 Expanded drawer

- Width: approximately 380px desktop.
- Full viewport height.
- Dark header.
- Scrollable conversation.
- Fixed composer.
- Clear close control.

### 17.3 Conversation message types

```ts
interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  kind:
    | "text"
    | "change_preview"
    | "scope_selection"
    | "mapping_review_required"
    | "warning"
    | "error";
  content: unknown;
  createdAt: string;
}
```

### 17.4 Change Preview card

Must display:

- Interpretation.
- Proposed changes.
- Affected scope.
- Warning.
- Apply / Modify / Cancel.

### 17.5 Mapping boundary

A message classified as `mapping_review_required` provides:

```text
Open Review Panel
```

It does not include an Apply Mapping action within the chat bubble.

### 17.6 Focus behavior

- Focus moves to drawer on open.
- Focus remains trapped only for modal drawer behavior; if implemented as non-modal desktop panel, preserve logical tab order.
- Focus returns to trigger on close.

---

## 18. File Upload Component

### 18.1 Contract

```ts
interface UploadItem {
  localId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  progress: number;
  status: "queued" | "uploading" | "uploaded" | "failed" | "duplicate";
  errorCode?: string;
}
```

### 18.2 Features

- Drag and drop.
- File picker.
- Multiple files.
- Progress.
- Retry.
- Remove before processing.
- Duplicate-file response.

### 18.3 Security

- Do not inspect file content solely in the browser beyond basic validation.
- Server validates MIME, extension and workbook structure.
- Do not expose storage URIs.

### 18.4 Market and Wave scope

Project creation must not require a single Market or Wave. These values belong to an uploaded file version or to an individual extracted table. The upload flow must support:

- `Global` as an already-aggregated overall file.
- `multi_market` when one file contains several markets.
- A single market when the file is explicitly scoped.
- Wave source options `file_level`, `table_header`, `mixed` and `unknown`.

When `table_header`, `mixed` or `unknown` is selected, the UI must explain that Python will inspect table Headers and unresolved tables remain visible in Review. The UI must not imply that a file-level Wave is inherited by every table.

---

## 19. Review Summary Components

### 19.1 Summary cards

```ts
interface ReviewSummaryCount {
  riskClass: "data_blocking" | "analysis_blocking" | "publishing_warning" | "optional_review";
  count: number;
  openCount: number;
}
```

### 19.2 Issue table

Required columns:

- Issue.
- Data object.
- Risk class.
- Dashboard use.
- Affected pages.
- Status.
- Action.

### 19.3 Table behavior

- Server-side pagination where issue count is large.
- Sort and filter encoded in URL search parameters.
- Row selection only for valid shared-pattern actions.
- Sticky header.

### 19.4 Publication blocker strip

Persistent within relevant Creator routes:

```text
Publication blocked by 3 unresolved issues
```

Links to a filtered Review Summary.

---

## 20. Quick Data Validation Component

### 20.1 Comparison layout

Desktop:

```text
Original Excel | Structured Result | Dashboard Result
```

Narrow widths:

- Stack the three states vertically.
- Keep explicit labels visible.

### 20.2 Sample card contract

```ts
interface ValidationSampleViewModel {
  id: string;
  sampleType: string;
  sourcePreview: ValidationValueBlock;
  structuredPreview: ValidationValueBlock;
  dashboardPreview: ValidationValueBlock;
  status: "pending" | "passed" | "failed";
  relatedPatternCount?: number;
}
```

### 20.3 Actions

- Confirm.
- Flag mismatch.
- Open source context.
- Open Review Panel.
- Add comment.

### 20.4 Source preview

Use rendered spreadsheet context or a safe table reconstruction. Do not imply that an approximation is the original workbook when it is not.

---

## 21. Data Explorer

### 21.1 Layout

Desktop:

```text
Catalog panel | Main preview | Optional detail drawer
```

### 21.2 Catalog virtualization

Use virtualized rendering for hundreds of tables.

### 21.3 Query state

Filters should be URL-addressable:

```text
?wave=wave_2&module=brand_imagery&review=review_required
```

### 21.4 Preview tabs

- Standardized View.
- Original Source.
- Usage & Dependencies.
- Recognition Detail.

### 21.5 Source context

The original-source view must show:

- Boundary highlight.
- Header region.
- Base region.
- Data region.
- Footnote region.

Use semantic overlays with an accessible legend.

### 21.6 Dependency graph

MVP may implement this as a structured list rather than a free-form graph:

```text
Source Table
Semantic Metrics
Analysis Modules
Dashboard Visuals
Insights
```

---

## 22. Mapping Review Panel

### 22.1 Component form

Use a large modal or right-side full-height panel depending on source-preview needs.

### 22.2 Split layout

- Evidence pane.
- Mapping form.
- Impact summary.

### 22.3 Safe mutation

All mapping mutations require:

- Current server revision.
- Proposed new value.
- Apply scope.
- Creator explanation when required.

### 22.4 Optimistic concurrency

If the object changed since the panel opened:

```text
This mapping was updated by another action.
Reload the latest version before applying your change.
```

Do not silently overwrite.

---

## 23. Dashboard Builder Architecture

### 23.1 Main layout

```text
Secondary page list | 12-column canvas | Properties panel / AI drawer
```

### 23.2 Editor state

Separate:

- Server-confirmed Dashboard Version.
- Unsaved local presentation changes.
- Active visual selection.
- Undo/Redo history.
- Temporary AI Change Preview.

### 23.3 Recommended store boundaries

```ts
interface DashboardEditorState {
  dashboardVersionId: string;
  revision: number;
  selectedPageId: string | null;
  selectedVisualId: string | null;
  pendingChanges: EditorChange[];
  undoStack: EditorChangeBatch[];
  redoStack: EditorChangeBatch[];
  isClientPreview: boolean;
}
```

Server state such as pages, metrics and results remains in query cache. Avoid copying all API data into a global state store.

### 23.4 Autosave

- Presentation changes may autosave after a short debounce.
- Mapping changes never autosave from an unconfirmed Review Panel.
- Show `Saving`, `Saved`, or `Save failed` state.
- Retain local recovery data for unsaved presentation changes when safe.

### 23.5 Revision conflict

On HTTP conflict:

- Stop autosave.
- Show conflict banner.
- Offer reload or compare.
- Do not discard user changes without consent.

---

## 24. Dashboard Grid

### 24.1 Grid model

- 12 columns.
- Row height determined by content and configured visual height class.
- Supported column spans: 4, 6, 8, 12.
- Optional 3-column KPI cards use span 4.

### 24.2 Breakpoints

Illustrative; final values require prototype testing.

```text
Desktop wide: 12-column
Desktop:      12-column
Tablet:       6-column adaptation
Mobile:       single-column client view
```

Creator editing is desktop-first.

### 24.3 Drag and drop

- Keyboard-accessible reorder alternative required.
- Show insertion placeholder.
- Prevent overlapping.
- Validate incompatible placements.

### 24.4 Height presets

```ts
 type VisualHeight = "compact" | "standard" | "tall" | "auto";
```

Do not use uncontrolled arbitrary pixel heights in persisted Dashboard JSON.

---

## 25. Dashboard Visual Component Contract

### 25.1 Platform wrapper

Every chart is rendered through a platform-owned wrapper.

```ts
interface DashboardVisualProps {
  visual: DashboardVisualDefinition;
  data: DashboardVisualData;
  mode: "creator" | "client" | "export";
  locale: "en" | "zh-CN";
  theme: DashboardTheme;
  filterState: FilterState;
  permissions: VisualPermissions;
  onViewSource?: () => void;
  onOpenInsight?: () => void;
  onViewOptionChange?: (change: ClientViewChange) => void;
}
```

### 25.2 Wrapper responsibilities

- Title and subtitle.
- Base display.
- Significance display.
- Loading state.
- Empty or unavailable state.
- Data labels.
- Client View Options.
- Evidence action in Creator mode.
- Accessibility summary.
- Export-safe rendering.

### 25.3 Chart adapter responsibilities

- Convert platform data to library configuration.
- Emit accessible labels.
- Support localized formatting.
- Avoid mutating source data.
- Map interactions back to stable IDs.

---

## 26. Dashboard Visual Data Contract

```ts
interface DashboardVisualData {
  visualId: string;
  status: "ready" | "loading" | "unavailable" | "error";
  reasonCode?:
    | "filter_combination_not_available"
    | "metric_not_available"
    | "not_asked"
    | "suppressed"
    | "review_required";
  series: VisualSeries[];
  categories: VisualCategory[];
  base: BaseDisplayData | BaseDisplayData[] | null;
  significance: SignificanceDisplayData[];
  footnotes: LocalizedText[];
  lineageAvailable: boolean;
}
```

### 26.1 No-data behavior

Do not pass a fake zero data point to the chart library for unavailable values.

The wrapper renders a standardized unavailable state.

### 26.2 Partial availability

If a chart supports partial values:

- Render available points.
- Render `-` or neutral missing marker for unavailable categories.
- Do not connect a Line Chart through a not-asked point unless the visual rule explicitly allows a gap connection.

---

## 27. Supported Visual Wrappers

### 27.1 KPI Card

Supports:

- Primary value.
- Comparison value.
- Difference.
- Official significance indicator.
- Base.

### 27.2 Horizontal Bar

Suitable for ranking and long labels.

### 27.3 Vertical or Grouped Bar

Suitable for concise comparisons.

### 27.4 Line Chart

- X-axis typically Wave/time.
- Y-axis Percentage, Mean or Index.
- Each line Brand, Market or Metric.
- Gaps for missing Waves.

### 27.5 Slope Chart

Suitable for two-Wave comparison.

### 27.6 Dot Plot

Suitable for precise comparison with compact space.

### 27.7 Heatmap

- Neutral fill for unavailable values.
- Do not use low-value color for missing.
- Accessible value labels or table alternative.

### 27.8 Profile Chart

Use with limited Brands and readable attribute count.

### 27.9 Funnel

- Stages retain semantic order.
- Conversion may be displayed separately.
- Funnel visual does not imply conversion validity by itself.

### 27.10 Data Table

- Sticky headers.
- Repeated hierarchy.
- Horizontal scroll only where necessary.
- Accessible table semantics.

---

## 28. Extensible Visual Registry and Advanced Visuals

### 28.1 Product decision

The MVP does not need to implement every future visual type, but the front-end architecture must support adding new visuals without rewriting Dashboard Builder, Dashboard JSON or Published Package contracts.

Future visuals include, but are not limited to:

- Word Cloud.
- Combination Chart, such as Column + Line.
- Dual-Axis Chart.
- Waterfall Chart.
- Bubble / Scatter Chart.
- Treemap.
- Sankey or Journey Flow.
- Correspondence Map.
- Small Multiples.
- Radar Chart, where readability is acceptable.
- Custom client-specific visual plugins.

### 28.2 Visual Registry

All visual types should be registered through a platform-owned Visual Registry.

```ts
interface VisualPluginDefinition {
  visualType: string;
  displayNameKey: string;
  component: React.LazyExoticComponent<React.ComponentType<DashboardVisualProps>>;
  supportedMetricTypes: string[];
  supportedUnits: string[];
  supportedDataShapes: VisualDataShape[];
  supportedModes: Array<"creator" | "client" | "export">;
  supportsSignificance: boolean;
  supportsBase: boolean;
  supportsClientViewOptions: boolean;
  supportsAccessibilityTable: boolean;
  validationRules: VisualValidationRule[];
  exportCapabilities: {
    html: boolean;
    pdf: boolean;
    pptSnapshot: boolean;
  };
}
```

Dashboard Builder, Client View and export services reference `visual_type` and capabilities from this registry rather than using hard-coded condition chains.

### 28.3 Stable visual configuration envelope

Every visual uses a common configuration envelope plus visual-specific options.

```ts
interface DashboardVisualDefinition {
  visualId: string;
  visualType: string;
  title: LocalizedTextSet;
  subtitle?: LocalizedTextSet;
  metricBindings: VisualMetricBinding[];
  dimensionBindings: VisualDimensionBinding[];
  layout: VisualLayoutDefinition;
  commonOptions: CommonVisualOptions;
  visualOptions: Record<string, unknown>;
  configSchemaVersion: string;
}
```

New visual-specific settings belong in `visualOptions`. Existing common properties such as Base, Significance, locale, availability and Source Evidence remain in the shared envelope.

### 28.4 Combination Chart

A Combination Chart may combine, for example:

- Column Percentage + Line Mean.
- Column current result + Line benchmark.
- Column volume + Line conversion rate.
- Column Brand result + Line category average.

It is available only when the system validates:

- Shared category axis.
- Compatible Market, Wave and Banner scope.
- Explicit unit for every series.
- Primary and secondary axis assignment.
- No misleading scale configuration.
- Base compatibility where the series are interpreted together.

```ts
interface ComboChartOptions {
  primarySeriesVisual: "column" | "bar";
  secondarySeriesVisual: "line";
  primaryAxisUnit: string;
  secondaryAxisUnit: string;
  showSecondaryAxis: boolean;
  synchronizeZeroBaseline: boolean;
}
```

Dual-axis use should trigger a Creator warning because different scales can create misleading visual comparisons. The Creator must see both axis units in Chart Preview and Client Preview.

### 28.5 Word Cloud

Word Cloud is treated as an optional visual plugin, not a default analytical recommendation.

It may be used when the published data contains an approved term-frequency or coded-theme-frequency dataset, for example:

- Open-end coding frequencies.
- Official coded themes from the Tab Book.
- Approved word or phrase counts.

MVP and later Tab-first versions must not create a Word Cloud directly from raw respondent text unless the relevant text-processing and privacy workflow is explicitly implemented and approved.

Word Cloud requirements:

- Frequency or weight is explicit.
- Stop-word and normalization rules are versioned.
- English and Chinese tokenization are handled separately.
- Terms with the same meaning may use approved Canonical Mapping.
- Minimum frequency and Top N are configurable.
- Client can access an alternative ranked data table.
- Word Cloud is not used to imply sentiment unless sentiment is an approved metric.
- Export rendering is deterministic enough for PDF/PPT regression tests.

### 28.6 Visual compatibility validation

Before a visual is offered, the Visual Registry validates:

- Data shape.
- Number of metrics.
- Number of dimensions.
- Metric unit.
- Maximum practical categories or series.
- Availability of required official or verified derived data.
- Client and export support.

If the selected visual is unsuitable, show an explanation and recommended alternatives rather than rendering an unreadable chart.

### 28.7 Plugin loading and bundle size

- Advanced visuals should be lazy-loaded.
- Client bundles load only visuals used in the Published Release.
- A missing optional visual plugin must not prevent other Dashboard pages from loading.
- The wrapper displays a controlled unsupported-visual state if a plugin is unavailable.

### 28.8 Export support

A visual is not production-certified until it supports:

- Hosted HTML.
- PDF rendering.
- PPT Snapshot rendering.
- English and Chinese labels.
- No-data states.
- Accessibility alternative.
- Visual regression tests.

A visual may be marked `Creator Preview Only` until export and client-readiness requirements pass.

### 28.9 Visual certification state

```ts
type VisualCertificationStatus =
  | "certified"
  | "beta"
  | "creator_preview_only"
  | "disabled";
```

Certified visuals may be published to clients. Beta visuals require a visible Creator warning. Creator Preview Only visuals cannot enter a Published Release.

---

## 29. Sorting and Entity Color

### 28.1 Sort rules

Supported:

- Original Tab order.
- Current-value descending.
- Current-value ascending.
- Target first.
- Alphabetical.
- Hybrid pinned order.

### 28.2 Stable entity colors

Resolve color by stable entity ID, not displayed label.

```ts
function resolveEntityColor(
  entityId: string,
  theme: DashboardTheme,
  fallbackIndex: number
): string;
```

### 28.3 Other and None

- Default neutral grey.
- Pinned to end where configured.
- Excluded from Insight ranking by default unless explicitly enabled.

---

## 30. Base Display Component

### 29.1 Modes

```ts
 type BaseDisplayMode = "hidden" | "compact" | "standard" | "detailed";
```

### 29.2 Compact

```text
n=602
```

### 29.3 Standard

```text
Base: All respondents, n=602
```

### 29.4 Detailed

```text
Base: All qualified respondents
Unweighted n=602; Weighted n=600
```

### 29.5 Multiple Bases

Render a Base table or per-series Base. Never show one misleading shared Base.

---

## 31. Significance Display Component

### 30.1 Modes

```ts
 type SignificanceDisplayMode =
  | "hidden"
  | "visual_marker_only"
  | "visual_marker_with_tooltip"
  | "full_statistical_detail";
```

### 30.2 Creator evidence

Creator may view:

- Original marker.
- Comparison target.
- Confidence level.
- Source cell.
- Review status.

### 30.3 Client display

Client sees only approved presentation. Internal details are not included in the client DTO.

### 30.4 Accessibility

Markers require an accessible label such as:

```text
Significantly higher than Female at the stated confidence level
```

---

## 32. Filters

### 31.1 Contract

```ts
interface DashboardFilterDefinition {
  id: string;
  dimensionId: string;
  label: LocalizedText;
  class: "primary" | "secondary" | "analysis_only" | "hidden_technical";
  scope: "global" | "page";
  allowedCategoryIds: string[];
  defaultCategoryIds: string[];
  isClientVisible: boolean;
}
```

### 31.2 Combination validation

Before committing a selection:

- Query or evaluate Available Combination Matrix.
- Disable invalid next options.
- Preserve the previous valid selection if a proposed combination is invalid.
- Explain why unavailable.

### 31.3 Partial page support

When a valid global combination is not supported by some visuals:

- Apply the filter globally.
- Supported visuals update.
- Unsupported visuals show standardized unavailable state.

### 31.4 URL state

Client filter state may be represented in a safe URL query when sharing current view is allowed. Do not expose internal IDs if this creates security or usability risk; use signed or mapped values where necessary.

---

## 33. Client View Options

### 32.1 Component

A compact `View` menu per visual.

Available controls depend on published permissions:

- Chart type.
- Metric.
- Top N.
- Entity scope.
- Sort.
- Significance toggle.

### 32.2 State

Client View Option changes:

- Are local to the session.
- Do not create mutations.
- Do not modify the Published Release.
- Reset on new session unless a local preference is explicitly allowed.

---

## 34. Insight Components

### 33.1 Page Takeaway Panel

- 2-4 approved items by default.
- Compact evidence context where useful.
- No internal score in Client mode.

### 33.2 Chart Insight Drawer or Expander

- Statement.
- Supporting values.
- Scope.
- Statistical or availability note.
- View source chart, Client mode.
- View evidence, Creator mode.

### 33.3 Creator editing

- Edit text.
- Approve.
- Reject.
- Regenerate wording.
- Set visibility.

### 33.4 Translated insight

English and Chinese edit fields reference one evidence object. The UI warns when the two versions imply different statistical strength.

---

## 35. Localization Architecture

### 34.1 Resource separation

System UI resources:

```text
i18n/locales/en/common.json
i18n/locales/en/creator.json
i18n/locales/en/client.json
i18n/locales/zh-CN/common.json
i18n/locales/zh-CN/creator.json
i18n/locales/zh-CN/client.json
```

Research content is fetched from localized semantic and published data contracts, not stored in static UI resource files.

### 34.2 No hard-coded user strings

All front-end user-facing system text must use translation keys.

Incorrect:

```tsx
<Button>Publish</Button>
```

Correct:

```tsx
<Button>{t("publishing.actions.publish")}</Button>
```

### 34.3 Localized text type

```ts
interface LocalizedText {
  textId?: string;
  locale: "en" | "zh-CN";
  text: string;
  translationStatus?:
    | "source_provided"
    | "ai_translated"
    | "creator_reviewed"
    | "creator_confirmed"
    | "translation_not_available";
}
```

### 34.4 Formatter layer

Use locale-aware formatters for:

- Dates.
- Numbers.
- Currency.
- Counts.

Research-display rules such as Percentage decimal places remain governed by Dashboard Number Format Rules, not browser defaults.

### 34.5 Fallback

Fallback behavior comes from Project localization settings. The front-end displays internal fallback warnings only in Creator mode.

### 34.6 Translation Review

Implement a side-by-side editor with:

- English source/display.
- Chinese translation.
- Status.
- Apply terminology.
- Bulk approve valid matches.

### 34.7 Language-specific visual QA

Front-end test stories must cover:

- Long English titles.
- Chinese titles.
- Mixed Brand names.
- Chinese Base.
- Chinese Client AI answer.

---

## 36. Client Hosted Dashboard

### 35.1 Read-only contract

The Client application loads only Published Package DTOs.

Do not request:

- Extraction Snapshot.
- Review issues.
- Mapping decisions.
- Source files.
- Internal-only pages.

### 35.2 Access screen

- Project branding.
- Password form, if needed.
- Localized error states.
- No token-validity disclosure before access validation.

### 35.3 Client navigation

- Page navigation.
- Language switcher.
- Approved filters.
- Download.
- Recommended questions.

### 35.4 Suspended state

Render a dedicated localized state and unload Dashboard data.

### 35.5 Expired or revoked state

Do not retain cached published sensitive data after access becomes invalid beyond normal unavoidable browser caching. Use suitable cache headers for protected content.

---

## 37. Client Recommended Questions

### 36.1 UI pattern

- Floating or inline `Ask about this Dashboard` entry.
- 3-5 buttons per page.
- No unrestricted input in MVP.

### 36.2 Answer panel

- Direct answer.
- Evidence bullets.
- Scope.
- Statistical note.
- Source visual link.

### 36.3 Answer states

- Loading.
- Ready.
- Unavailable.
- Error.

### 36.4 Guardrail presentation

If unavailable:

```text
This combination is not available in the published Tab Book.
```

Do not display speculative alternatives as if they answered the question.

---

## 38. Theme Editor

### 37.1 Presets

- Kantar AI Colleague.
- Corporate Light.
- Executive Dark.
- Research Report.
- Minimal Brand.

### 37.2 Editable tokens

- Logo.
- Primary color.
- Secondary color.
- Accent color.
- Brand colors.
- Font selection from approved set.
- Footer.
- Confidentiality text.

### 37.3 Preview

Show:

- KPI card.
- Bar chart.
- Line Chart.
- Heatmap.
- Status badge.
- English and Chinese title examples.

### 37.4 Accessibility

Run contrast validation before applying or publishing.

---

## 39. Publishing UI

### 38.1 Publication Gate component

Grouped checks with:

- Passed.
- Warning.
- Failed.
- Direct action.

### 38.2 View as Client

Use the actual Client Shell and Published-package preview contract, not an approximate static mock.

### 38.3 Publish dialog

Fields:

- Release version.
- Release note.
- Language mode.
- Page inclusion.
- Insight visibility.
- Significance display.
- Detailed table visibility.
- Password.
- Expiry.
- Download permissions.

### 38.4 Plain password

Display only during creation and copy flow. Do not fetch it later from the server.

---

## 40. New Wave UI

### 39.1 Change summary groups

- Safe Updates.
- Review Required.
- New Content.
- Removed Content.
- Conflict.
- Not Comparable.

### 39.2 Existing-design retention

Visually communicate inherited settings.

```text
Inherited from the previous Dashboard version
```

### 39.3 New option

Show:

- First available Wave.
- Earlier display as `-`.
- No difference or ranking-change state.

### 39.4 New module

Show a Suggested Page or Module Proposal, not an automatic irreversible page insertion.

---

## 41. Replace Data UI

### 40.1 Data-version timeline

Show old and new versions clearly.

### 40.2 Replacement report

Sections:

- Mapping migration.
- Numeric changes.
- Base changes.
- Significance changes.
- Visual impact.
- Insight impact.
- Blocking issues.

### 40.3 Published data safety

If current release remains visible, show a persistent internal banner:

```text
A corrected data version is being reviewed. Clients still see Release 2.0.
```

If suspended:

```text
Client access is suspended until a corrected release is published.
```

---

## 42. Export UI

### 41.1 Export task

Export configuration is a form followed by asynchronous job status.

### 41.2 Language

- Current language.
- English.
- Chinese.
- Both, where supported.

Separate English and Chinese exports are the recommended MVP default.

### 41.3 Preview

- Thumbnail pages/slides.
- Overflow warnings.
- Limited layout actions.

### 41.4 Download security

Use time-limited authorized download URLs. Client permissions are rechecked before export generation and download.

---

## 43. Server State and Caching

### 42.1 Query keys

Use hierarchical stable query keys.

```ts
const queryKeys = {
  project: (projectId: string) => ["project", projectId] as const,
  reviewIssues: (projectId: string, filters: ReviewFilters) =>
    ["project", projectId, "review-issues", filters] as const,
  dashboardVersion: (dashboardVersionId: string) =>
    ["dashboard-version", dashboardVersionId] as const,
  publishedPackage: (shareToken: string, releaseId: string) =>
    ["published-package", shareToken, releaseId] as const,
};
```

### 42.2 Mutation invalidation

Mapping mutation invalidates:

- Affected table.
- Semantic metric.
- Review Summary.
- Dependent modules.
- Dependent Dashboard visuals.
- Publication Gate.

Avoid broad invalidation of the entire Project when targeted invalidation is sufficient.

### 42.3 Client cache

Protected Published Package responses should use cache rules appropriate to share-link security. Revocation behavior must be included in architecture testing.

---

## 44. Error Boundaries and Error Handling

### 43.1 App-level boundary

Provides:

- Localized generic message.
- Retry.
- Support reference ID.

### 43.2 Feature-level boundary

A chart failure should not crash the page. A page failure should not crash the entire Project shell.

### 43.3 API error model

```ts
interface ApiError {
  errorCode: string;
  category: string;
  severity: "info" | "warning" | "error";
  userMessage: string;
  retryable: boolean;
  suggestedAction?: string;
  correlationId: string;
}
```

### 43.4 Validation errors

Map backend field errors to form fields. Preserve business error codes for specialized UI behavior.

---

## 45. Loading, Empty and Unavailable States

### 44.1 Skeletons

Use skeletons for known page shapes, not generic spinners for every route.

### 44.2 Empty

Explain what is absent and provide a next step.

### 44.3 Unavailable data

Standard visual state:

```text
Data unavailable
This breakdown is not available for the selected filters.
```

### 44.4 Recognition pending

Creator only:

```text
This content requires recognition review before it can be published.
```

---

## 46. Notifications

### 45.1 Toast

Use for short successful actions.

### 45.2 Persistent banner

Use for:

- Publication blocked.
- Data replacement in progress.
- Partial processing failure.
- Client access suspended.

### 45.3 Activity center

May include:

- Processing completed.
- Export ready.
- New Wave Draft ready.
- Replacement Draft ready.
- Insight refresh needed.

---

## 47. Accessibility Engineering

### 46.1 Required baseline

Target WCAG 2.1 AA or current organizational standard.

### 46.2 Semantic HTML

- Real buttons.
- Real form labels.
- Table semantics for tabular data.
- Heading hierarchy.
- Landmarks.

### 46.3 Keyboard

- Complete route and dialog operation.
- Reorder alternative for drag-and-drop.
- Visible focus.
- Escape closes eligible overlays.

### 46.4 Charts

Provide:

- Accessible title.
- Description.
- Current filter scope.
- Data-table alternative or summary.

### 46.5 Motion

Respect reduced-motion preference. Avoid unnecessary chart animation in client reporting.

### 46.6 Language

Set `lang="en"` or `lang="zh-CN"`. Mark mixed-language spans where practical for screen readers.

---

## 48. Responsive Design

### 47.1 Creator

Desktop-first.

- Sidebar fixed on wide screens.
- Secondary panels collapsible.
- AI drawer overlays at narrower widths.
- Dashboard editing below minimum width may show a message recommending desktop.

### 47.2 Client

- Navigation collapses on smaller screens.
- Filters use a drawer.
- Grid stacks vertically.
- Visual labels adapt.
- Tables scroll or use responsive column prioritization.

### 47.3 Export

Export uses a dedicated fixed-layout rendering mode, not a screenshot of the responsive mobile DOM.

---

## 49. Front-end Performance Budgets

Initial budgets, subject to benchmarking:

- Avoid loading charting code on non-Dashboard routes.
- Lazy-load Data Explorer source preview.
- Virtualize hundreds of catalog rows.
- Lazy-load non-Core Dashboard pages.
- Memoize expensive chart transformations by stable input IDs.
- Avoid passing entire Project objects to every visual.
- Keep Client bundle substantially smaller than Creator bundle.

Track:

- Initial JS size.
- Largest contentful paint.
- Time to interactive.
- Page-navigation latency.
- Visual-render latency.
- Memory use on large Dashboards.

---

## 50. Security Engineering for the Browser

- Never store share passwords.
- Store access session using secure server-issued cookie or approved token mechanism.
- Do not expose object-storage URIs.
- Sanitize Markdown or rich text before rendering.
- Escape all source Workbook text.
- Apply Content Security Policy.
- Prevent clickjacking where required.
- Do not expose internal API errors.
- Do not include Draft payloads in Client page HTML.
- Avoid sensitive data in analytics events.

---

## 51. Front-end Testing Strategy

### 50.1 Unit tests

- Formatters.
- Availability mapping.
- Sort rules.
- Filter-combination state.
- Localization fallback.
- Permission checks.

### 50.2 Component tests

- Workspace Card.
- Status Badge.
- Processing Modal.
- Validation Sample.
- Mapping Review Panel.
- Dashboard Visual Wrapper.
- Base Display.
- Significance Display.
- Language Switcher.

### 50.3 Integration tests

- Review issue resolution updates Publication Gate.
- Dashboard change updates preview.
- Locale switching preserves filter state.
- Client View Option remains session-only.

### 50.4 End-to-end tests

- Upload to Draft.
- Resolve mapping.
- Publish.
- Client access.
- New Wave.
- Replace Data.
- Suspend and rollback.
- English / Chinese flow.

### 50.5 Visual regression

Capture Creator and Client snapshots for:

- Main shells.
- Dashboard visual types.
- No-data states.
- English.
- Chinese.
- AI drawer.
- Export preview.

---

## 52. Storybook or Component Documentation

Maintain interactive component documentation for:

- Design tokens.
- Buttons.
- Inputs.
- Status states.
- Cards.
- Dialogs.
- Drawers.
- Data tables.
- Chart wrappers.
- English and Chinese variants.
- Error and empty states.

Each component story should include:

- Default.
- Loading.
- Error.
- Disabled.
- Long English label.
- Chinese label.
- Keyboard and accessibility notes.

---

## 53. Code Standards

### 52.1 TypeScript

- Strict mode.
- No implicit `any`.
- Prefer discriminated unions for state.
- Avoid broad type assertions.
- Generate API types where possible.

### 52.2 Components

- Functional components.
- Small, composable units.
- Business logic in hooks/services, not visual primitives.
- Explicit props.
- Avoid components with unrelated multi-feature responsibilities.

### 52.3 Styling

- Use design tokens.
- Avoid arbitrary colors.
- Avoid unreviewed gradients.
- Avoid inline styles except dynamic values that cannot be represented safely through utilities or variables.
- Do not duplicate tokens across feature modules.

### 52.4 Internationalization

- No hard-coded user-facing strings.
- No concatenating translated fragments into sentences.
- Use parameterized translation messages.
- Test plural and number formatting.

### 52.5 Comments

Comments explain non-obvious intent, not obvious syntax.

### 52.6 Error handling

Every async action must define:

- Pending behavior.
- Success behavior.
- Error behavior.
- Retry or rollback behavior.

---

## 54. Pull Request Checklist

- [ ] Uses approved design tokens.
- [ ] Supports English and Chinese.
- [ ] No hard-coded user-facing strings.
- [ ] Keyboard interaction tested.
- [ ] Loading, empty and error states implemented.
- [ ] Creator-only data not exposed to Client route.
- [ ] API errors handled.
- [ ] Unit/component tests added.
- [ ] Visual story or snapshot updated where required.
- [ ] No unsupported color or gradient introduced.
- [ ] Responsive behavior checked.
- [ ] Analytics event reviewed for sensitive content.
- [ ] Accessibility labels added.

---

## 55. Front-end Acceptance Criteria

### Shell

- Creator shell matches approved three-region structure.
- Client shell contains no Creator editing affordances.
- AI drawer works without corrupting canvas layout.

### Recognition and Review

- All risk states are distinguishable with text/icon.
- Original evidence is reachable.
- Mapping cannot be changed from chat alone.

### Dashboard

- Grid prevents overlap.
- Creator changes persist by stable ID.
- Unavailable data is never rendered as zero.
- Unsupported filters do not silently fall back.
- Base and significance obey approved modes.

### Bilingual

- Interface switches without losing state.
- Chinese glyphs render correctly.
- Localized research labels come from semantic data.
- Missing required translation is visible to Creator.

### Client

- Hosted Dashboard is read-only.
- Approved View Options are session-only.
- Recommended questions use Published Data Package only.
- Suspended, expired and revoked states work.

### Publishing

- View as Client uses the actual Client Shell.
- Release settings match live behavior.
- PDF/PPT export preview identifies overflow.

---

## 56. Open Front-end Decisions

- React framework and build tool.
- Headless component library.
- Charting library.
- Drag-and-drop and grid library.
- Rich-text or Markdown editor for Insight.
- Spreadsheet source-preview implementation.
- Client access-session mechanism.
- Export rendering strategy.
- Browser support matrix.
- Minimum Creator editing width.
- Exact responsive breakpoints.
- Whether the AI drawer is modal or non-modal on wide screens.
- Whether Storybook or an alternative component workbench is used.

---

## 57. Recommended Next Document

The next document should be:

```text
06_Python_Technical_Architecture.md
```

It should define:

- Python framework and service layout.
- Excel parsing pipeline.
- Async processing architecture.
- Pydantic contracts.
- Database and object storage.
- AI-provider boundary.
- Dashboard-data APIs.
- Hosted publication architecture.
- PDF/PPT generation.
- Security and deployment.
- Observability.
- Development milestones.
