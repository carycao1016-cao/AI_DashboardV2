import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  FileSpreadsheet,
  Filter,
  FolderOpen,
  Gauge,
  Globe2,
  LayoutDashboard,
  MessageSquareText,
  MoreHorizontal,
  PanelRight,
  Presentation,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { uiConfig } from "./config";
import { use as useECharts, init as initECharts } from "echarts/core";
import { BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

useECharts([BarChart, FunnelChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

type Status = "已验证" | "需 Review" | "处理中" | "已扫描";
type WorkflowView = "overview" | "versions" | "processing" | "review" | "explorer" | "dashboard" | "dashboard_preview";
type ExplorerDetail = "none" | "source" | "recognition";

type FileVersion = {
  id: string;
  fileName: string;
  market: string;
  wave: string;
  status: Status;
  relation: string;
};

type ApiSourceVersion = {
  source_file_version_id: string;
  file_name: string;
  market_scope: string;
  wave_scope: string;
  upload_mode: "append" | "replace";
  replaces_source_file_version_id: string | null;
  scan_status: string;
};

type ApiProject = {
  project_id: string;
  project_name: string;
  source_file_versions: ApiSourceVersion[];
};

type ProjectSummary = Pick<ApiProject, "project_id" | "project_name">;

type RecognitionSheet = {
  sheet_name: string;
  outline_response_count: number;
  detail_response_count: number;
  // 轻量 AI smoke 可能只返回计数和验证结果，字段缺失时不能让整个页面崩溃。
  boundary_proposals?: Array<{ source_range: string; confidence_score?: number | null; regions?: { header_rows?: number[]; base_rows?: number[]; data_rows?: number[]; footnote_rows?: number[]; significance_layout?: string } }>;
  boundary_validations?: Array<{ outcome: string }>;
};

type RecognitionResult = {
  job_id: string;
  source_file_version_id: string;
  status: string;
  phase?: string;
  progress_percent?: number;
  error_message?: string | null;
  result: { sheets?: RecognitionSheet[]; provider?: string; max_sheets?: number };
};

type ExtractedCell = {
  extracted_header_id: string;
  source_cell: string;
  raw_value: unknown;
  excel_display_value: string;
  parsed_value: unknown;
  parsed_unit: string;
  original_significance_marker: string;
  significance_mapping_status: string;
};

type ExtractedTable = {
  extracted_table_id: string;
  source_sheet: string;
  source_range: string;
  detected_question_number: string;
  detected_question_text: string;
  detected_table_title: string;
  table_variant: string;
  headers: Array<{ extracted_header_id: string; display_label: string; header_path: string[]; significance_code: string; source_header_cells?: string[] }>;
  rows: Array<{ extracted_row_id: string; original_label: string; detected_row_type: string; cells: ExtractedCell[] }>;
};

type ExtractedTableSummary = Pick<ExtractedTable, "extracted_table_id" | "source_sheet" | "source_range" | "detected_question_number" | "detected_question_text" | "detected_table_title" | "table_variant"> & {
  header_count: number;
  row_count: number;
};

type ProcessingJob = {
  job_id: string;
  source_file_version_id: string;
  status: "queued" | "running" | "completed" | "failed";
  phase: string;
  progress_percent: number;
  error_message: string | null;
};

type ReviewIssue = {
  review_issue_id: string;
  source_file_version_id: string;
  object_type: string;
  object_id: string;
  issue_type: string;
  severity: "high" | "medium" | "low";
  message: string;
  suggested_actions: string[];
  status: "open" | "in_review" | "resolved" | "accepted_risk" | "excluded";
  creator_note: string | null;
  blocks_publication: boolean;
};

type DashboardVisual = {
  dashboard_visual_id: string;
  source_extracted_table_id: string;
  visual_type: string;
  display_precision?: number;
  title: string;
  grid_span: number;
  review_status: string;
  evidence: { source_ranges?: string[] };
};

type DashboardDraft = {
  dashboard_version_id: string;
  dashboard_name: string;
  project_id: string;
  source_file_version_id: string;
  template: string;
  revision?: number;
  pages: Array<{ dashboard_page_id: string; category: "core" | "suggested" | "appendix" | "internal"; title: string; sort_order: number; visuals: DashboardVisual[] }>;
  summary: { tables_detected: number; semantic_questions: number; tables_in_draft: number; blocking_issues: number; review_required: number };
  warnings: string[];
  semantic_questions?: Array<{ semantic_question_id: string; source_extracted_table_ids: string[]; title: string; module_name: string; metric_type: string; metric_source?: string; review_status: string; ai_recommended?: boolean; included_in_draft?: boolean; recommended_visual?: string; planning_source?: string; planning_confidence?: number; planning_reason?: string; template_matches?: Array<{ template: string; reason: string }>; evidence: { source_ranges?: string[] } }>;
};

type DashboardDraftOptions = {
  template?: string;
  selectedTableIds?: string[];
  metricConfirmations?: Record<string, string>;
  visualOverrides?: Record<string, string>;
  planningMode?: "ai_refresh" | "python_only";
};

const workflow = [
  { id: "overview" as WorkflowView, label: "项目概览", icon: LayoutDashboard, state: "complete" },
  { id: "versions" as WorkflowView, label: "文件与版本", icon: FileSpreadsheet, state: "complete" },
  { id: "processing" as WorkflowView, label: "识别进度", icon: Gauge, state: "in_progress" },
  { id: "review" as WorkflowView, label: "Review Summary", icon: ShieldCheck, state: "warning" },
  { id: "explorer" as WorkflowView, label: "Data Explorer", icon: Database, state: "complete" },
  { id: "dashboard" as WorkflowView, label: "Dashboard Draft", icon: BarChart3, state: "not_started" },
  { id: "dashboard_preview" as WorkflowView, label: "Dashboard Preview", icon: Presentation, state: "not_started" },
];

function StatusBadge({ status }: { status: Status }) {
  const icon = status === "已验证" || status === "已扫描" ? <Check size={12} /> : status === "需 Review" ? <AlertTriangle size={12} /> : <Gauge size={12} />;
  return <span className={`status-badge status-${status === "已验证" || status === "已扫描" ? "success" : status === "需 Review" ? "warning" : "info"}`}>{icon}{status}</span>;
}

export function App() {
  const [selectedSheet, setSelectedSheet] = useState("Percentages_Sig1");
  const [assistantOpen, setAssistantOpen] = useState(uiConfig.assistantDefaultOpen);
  const [language, setLanguage] = useState<"中文" | "English">("中文");
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showProjectCreate, setShowProjectCreate] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectName, setProjectName] = useState("未选择项目");
  const [projectId, setProjectId] = useState("");
  const [draftProjectName, setDraftProjectName] = useState("");
  const [projectError, setProjectError] = useState("");
  const [marketScope, setMarketScope] = useState("范围未设置");
  const [waveScope, setWaveScope] = useState("波次未设置");
  const [uploadMarket, setUploadMarket] = useState("自动识别（推荐）");
  const [uploadMarketHint, setUploadMarketHint] = useState("");
  const [uploadWave, setUploadWave] = useState("自动识别（推荐）");
  const [uploadMode, setUploadMode] = useState<"append" | "replace">("append");
  const [replaceVersionId, setReplaceVersionId] = useState("sfv_002");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bootstrapStartedRef = useRef(false);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [selectedSourceVersionId, setSelectedSourceVersionId] = useState("");
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [extractionTables, setExtractionTables] = useState<ExtractedTable[]>([]);
  const [tableDirectory, setTableDirectory] = useState<ExtractedTableSummary[]>([]);
  const [tableDirectoryTotal, setTableDirectoryTotal] = useState(0);
  const [tableDirectoryPage, setTableDirectoryPage] = useState(1);
  const [loadingTableId, setLoadingTableId] = useState("");
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([]);
  const [dashboardDraft, setDashboardDraft] = useState<DashboardDraft | null>(null);
  const [dashboardGenerating, setDashboardGenerating] = useState(false);
  const [activeView, setActiveView] = useState<WorkflowView>("overview");
  const [explorerDetail, setExplorerDetail] = useState<ExplorerDetail>("none");
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVersionDetails, setSelectedVersionDetails] = useState<FileVersion | null>(null);
  const [statusFilter, setStatusFilter] = useState<"全部状态" | Status>("全部状态");

  const applyProject = (project: ApiProject) => {
    setProjectId(project.project_id);
    setProjectName(project.project_name);
    setFileVersions(project.source_file_versions.map((version) => ({
      id: version.source_file_version_id,
      fileName: version.file_name,
      market: version.market_scope,
      wave: version.wave_scope,
      status: version.scan_status === "completed" ? "已扫描" : "处理中",
      relation: version.upload_mode === "replace" ? `替换 ${version.replaces_source_file_version_id || "历史版本"}` : "新增文件",
    })));
  };

  const loadTableDirectory = async (id: string, sourceVersionId: string, page = 1) => {
    const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}/source-versions/${sourceVersionId}/extraction-tables?page=${page}&page_size=20`);
    if (!response.ok) {
      setTableDirectory([]);
      setTableDirectoryTotal(0);
      return;
    }
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.detail || "读取物理表目录失败");
    setTableDirectory(payload.data.tables as ExtractedTableSummary[]);
    setTableDirectoryTotal(payload.data.total as number);
    setTableDirectoryPage(payload.data.page as number);
  };

  const loadDashboardDraft = async (id: string, sourceVersionId: string) => {
    const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}/dashboard-drafts/latest?source_file_version_id=${encodeURIComponent(sourceVersionId)}`);
    if (response.status === 404) {
      setDashboardDraft(null);
      return;
    }
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.detail || "读取 Dashboard Draft 失败");
    setDashboardDraft(payload.data as DashboardDraft);
  };

  const loadProject = async (id: string, requestedSourceVersionId?: string) => {
    const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}`);
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.detail || "读取项目失败");
    const project = payload.data as ApiProject;
    applyProject(project);
    const selectedVersion = project.source_file_versions.find((version) => version.source_file_version_id === (requestedSourceVersionId ?? selectedSourceVersionId))
      ?? project.source_file_versions[0];
    setSelectedSourceVersionId(selectedVersion?.source_file_version_id || "");
    const reviewResponse = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}/review-issues`);
    if (reviewResponse.ok) {
      const reviewPayload = await reviewResponse.json();
      const issues = reviewPayload.success ? (reviewPayload.data.issues as ReviewIssue[]) : [];
      setReviewIssues(selectedVersion ? issues.filter((issue) => issue.source_file_version_id === selectedVersion.source_file_version_id) : []);
    } else {
      setReviewIssues([]);
    }
    if (!selectedVersion || selectedVersion.scan_status !== "completed") {
      setRecognitionResult(null);
      setExtractionTables([]);
      setTableDirectory([]);
      setTableDirectoryTotal(0);
      setDashboardDraft(null);
      return;
    }
    const recognitionResponse = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}/source-versions/${selectedVersion.source_file_version_id}/recognition-results`);
    if (!recognitionResponse.ok) {
      setRecognitionResult(null);
      return;
    }
    const recognitionPayload = await recognitionResponse.json();
    const recognition = recognitionPayload.success ? recognitionPayload.data as RecognitionResult : null;
    setRecognitionResult(recognition);
    if (recognition) {
      setProcessingJob({
        job_id: recognition.job_id,
        source_file_version_id: recognition.source_file_version_id,
        status: recognition.status as ProcessingJob["status"],
        phase: recognition.phase || "AI 识别状态未知",
        progress_percent: recognition.progress_percent ?? 0,
        error_message: recognition.error_message || null,
      });
      if (recognition.status === "failed") setProjectError(recognition.error_message || "AI 识别失败");
    }
    setExtractionTables([]);
    await loadTableDirectory(id, selectedVersion.source_file_version_id);
    await loadDashboardDraft(id, selectedVersion.source_file_version_id);
  };

  const generateDashboardDraft = async (options: DashboardDraftOptions = {}) => {
    if (!projectId || !selectedSourceVersionId) return;
    setDashboardGenerating(true);
    setProjectError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${projectId}/source-versions/${selectedSourceVersionId}/dashboard-drafts`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ metric_confirmations: options.metricConfirmations ?? {}, template: options.template, selected_table_ids: options.selectedTableIds, visual_overrides: options.visualOverrides ?? {}, planning_mode: options.planningMode ?? "ai_refresh" }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "生成 Dashboard Draft 失败");
      setDashboardDraft(payload.data as DashboardDraft);
      setActiveView("dashboard");
    } catch (error) {
      setProjectError(error instanceof DOMException && error.name === "AbortError" ? "更新 Draft 超时，已自动停止等待；原有 Draft 保持不变，请稍后重试。" : error instanceof Error ? error.message : "生成 Dashboard Draft 失败");
    } finally {
      window.clearTimeout(timeoutId);
      setDashboardGenerating(false);
    }
  };

  const openExtractedTable = async (tableId: string) => {
    if (!projectId || !selectedSourceVersionId) return;
    if (extractionTables[0]?.extracted_table_id === tableId) {
      setExtractionTables([]);
      return;
    }
    setLoadingTableId(tableId);
    try {
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${projectId}/source-versions/${selectedSourceVersionId}/extraction-tables/${encodeURIComponent(tableId)}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "读取表格明细失败");
      setExtractionTables([payload.data.table as ExtractedTable]);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "读取表格明细失败");
    } finally {
      setLoadingTableId("");
    }
  };

  const loadProjects = async () => {
    const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects`);
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.detail || "读取项目列表失败");
    setProjects(payload.data as ProjectSummary[]);
  };

  useEffect(() => {
    if (bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;
    void (async () => {
      try {
        const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects`);
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.detail || "读取项目列表失败");
        const availableProjects = payload.data as ProjectSummary[];
        setProjects(availableProjects);
        if (availableProjects[0]) await loadProject(availableProjects[0].project_id, "");
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : "无法连接本地后端");
      }
    })();
  }, []);

  const createProject = async () => {
    const nextName = draftProjectName.trim();
    if (!nextName) return;
    setProjectError("");
    try {
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: nextName }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "创建项目失败");
      applyProject({ ...(payload.data as Omit<ApiProject, "source_file_versions">), source_file_versions: [] });
      setProjects((current) => [payload.data as ProjectSummary, ...current]);
      setMarketScope("范围未设置");
      setWaveScope("波次未设置");
      setShowProjectCreate(false);
      setDraftProjectName("");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "创建项目失败");
    }
  };

  const selectProject = async (summary: ProjectSummary) => {
    setProjectMenuOpen(false);
    setProjectError("");
    try {
      await loadProject(summary.project_id, "");
      setMarketScope("范围未设置");
      setWaveScope("波次未设置");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "读取项目失败");
    }
  };

  const selectSourceVersion = async (sourceVersionId: string) => {
    setProjectError("");
    try {
      await loadProject(projectId, sourceVersionId);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "读取文件版本失败");
    }
  };

  const refreshCurrentProject = () => {
    if (!projectId) return;
    void loadProject(projectId, selectedSourceVersionId).catch((error: Error) => setProjectError(error.message));
  };

  const resolveReviewIssue = async (issue: ReviewIssue, creatorNote = "") => {
    try {
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${projectId}/review-issues/${issue.review_issue_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", creator_note: creatorNote || null }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "无法保存 Review 结论");
      setReviewIssues((current) => current.map((item) => item.review_issue_id === issue.review_issue_id ? payload.data as ReviewIssue : item));
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "无法保存 Review 结论");
    }
  };

  const openReviewIssues = reviewIssues.filter((issue) => issue.status === "open" || issue.status === "in_review");

  const pollProcessingJob = async (id: string, jobId: string) => {
    // 方舟模型单次请求可能接近超时上限；轮询持续 15 分钟，避免 60 秒后把仍在运行的任务误报为卡住。
    for (let attempt = 0; attempt < 900; attempt += 1) {
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}/jobs/${jobId}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "读取识别任务失败");
      const job = payload.data as ProcessingJob;
      setProcessingJob(job);
      if (job.status === "completed" || job.status === "failed") {
        // 任务执行中只轮询轻量状态；完成后再按需读取完整识别结果和提取数据。
        await loadProject(id, job.source_file_version_id);
        if (job.status === "failed") setProjectError(job.error_message || "Workbook 扫描失败");
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    setProjectError("识别任务仍在后台处理；刷新页面或切换回识别进度可恢复真实状态");
  };

  const startRecognition = async () => {
    if (!projectId) {
      setProjectError("请先新建或选择项目");
      return;
    }
    const version = fileVersions.find((item) => item.id === selectedSourceVersionId && item.status === "已扫描");
    if (!version) {
      setProjectError("没有可开始识别的已扫描文件版本");
      return;
    }
    setProjectError("");
    try {
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${projectId}/source-versions/${version.id}/recognition`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "启动 AI 识别失败");
      const job = payload.data as { job_id: string; source_file_version_id: string };
      setProcessingJob({ job_id: job.job_id, source_file_version_id: job.source_file_version_id, status: "queued", phase: "等待 AI 识别", progress_percent: 0, error_message: null });
      setActiveView("processing");
      void pollProcessingJob(projectId, job.job_id).catch((error: Error) => setProjectError(error.message));
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "启动 AI 识别失败");
    }
  };

  const completeUpload = async () => {
    if (!selectedFile) return;
    if (!projectId) {
      setUploadError("请先新建或选择项目");
      return;
    }
    const isReplacement = uploadMode === "replace";
    setUploadError("");
    setUploadSubmitting(true);
    const market = uploadMarket === "自动识别（推荐）" ? (uploadMarketHint.trim() || "待识别") : uploadMarket;
    const wave = uploadWave === "自动识别（推荐）" ? "待识别" : uploadWave.replace("文件级 ", "");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("market_scope", market);
      formData.append("wave_scope", wave);
      formData.append("upload_mode", uploadMode);
      if (isReplacement) formData.append("replaces_source_file_version_id", replaceVersionId);
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${projectId}/source-versions`, { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "上传或扫描失败");
      const data = payload.data as { source_file_version_id: string; file_name: string; job_id: string };
      setMarketScope(market);
      setWaveScope(wave);
      await loadProject(projectId, data.source_file_version_id);
      setProcessingJob({ job_id: data.job_id, source_file_version_id: data.source_file_version_id, status: "queued", phase: "等待 Workbook 扫描", progress_percent: 0, error_message: null });
      setSelectedFile(null);
      setSelectedFileName("");
      setShowUpload(false);
      void pollProcessingJob(projectId, data.job_id).catch((error: Error) => setProjectError(error.message));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "上传或扫描失败");
    } finally {
      setUploadSubmitting(false);
    }
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    const isSupported = /\.(xlsx|csv)$/i.test(file.name);
    if (isSupported) {
      setSelectedFile(file);
      setSelectedFileName(file.name);
      setUploadError("");
    } else {
      setUploadError("当前 PoC 只支持 XLSX 或 CSV 文件");
    }
  };

  const filteredSheets = useMemo(
    () => {
      const recognizedSheets = recognitionResult?.result.sheets?.map((sheet) => {
        const proposals = sheet.boundary_proposals ?? [];
        const validations = sheet.boundary_validations ?? [];
        const hasReview = validations.some((validation) => validation.outcome === "review_required" || validation.outcome === "rejected");
        return { name: sheet.sheet_name, family: "AI 识别", tables: proposals.length, status: (hasReview ? "需 Review" : "已验证") as Status, range: proposals[0]?.source_range || "未返回范围" };
      });
      const inventory = recognizedSheets ?? [];
      return inventory.filter((sheet) => {
        const matchesQuery = `${sheet.name} ${sheet.family}`.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = statusFilter === "全部状态" || sheet.status === statusFilter;
        return matchesQuery && matchesStatus;
      });
    },
    [query, recognitionResult, statusFilter],
  );
  const recognizedTableCount = filteredSheets.reduce((total, sheet) => total + (sheet.tables || 0), 0);
  const scannedVersionCount = fileVersions.filter((version) => version.status === "已扫描").length;
  const currentVersion = fileVersions.find((version) => version.id === selectedSourceVersionId);

  return (
    <div className={`app-shell ${assistantOpen ? "assistant-visible" : ""}`}>
      <aside className="sidebar" aria-label="Creator 主导航">
        <div className="brand-lockup">
          <div className="brand-mark">K</div>
          <div><strong>AI RESEARCH</strong><span>DASHBOARD</span></div>
        </div>
        <button className="language-switcher" onClick={() => setLanguage(language === "中文" ? "English" : "中文")} aria-label="切换语言">
          <Globe2 size={15} /><span>{language} / {language === "中文" ? "English" : "中文"}</span><ChevronDown size={14} />
        </button>
        <div className="sidebar-label">当前项目</div>
        <button className="project-switcher" onClick={() => setProjectMenuOpen((open) => !open)} aria-expanded={projectMenuOpen} aria-haspopup="listbox"><div className="project-avatar">{projectName.slice(0, 1).toUpperCase()}</div><div><strong>{projectName}</strong><span>{marketScope} · {waveScope}</span></div><ChevronDown size={15} /></button>
        {projectMenuOpen && <div className="project-menu" role="listbox" aria-label="选择项目">{projects.length === 0 && <div className="project-menu-empty">暂无已创建项目</div>}{projects.map((project) => <button key={project.project_id} className={`project-menu-item ${project.project_id === projectId ? "selected" : ""}`} onClick={() => void selectProject(project)} role="option" aria-selected={project.project_id === projectId}><span className="project-menu-avatar">{project.project_name.slice(0, 1).toUpperCase()}</span><span>{project.project_name}</span>{project.project_id === projectId && <Check size={14} />}</button>)}</div>}
        <button className="new-project-button" onClick={() => setShowProjectCreate(true)}><Plus size={15} /><span>新建项目</span></button>
        <nav className="workflow-nav">
          <div className="sidebar-label">工作流</div>
          {workflow.map(({ id, label, icon: Icon, state }) => (
            <button key={label} className={`nav-item ${activeView === id ? "active" : ""}`} onClick={() => setActiveView(id)}>
              <Icon size={17} /><span>{label}</span>{id === "review" && openReviewIssues.length > 0 && <span className="nav-count">{openReviewIssues.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item" onClick={() => setShowSettings(true)}><Settings2 size={17} /><span>项目设置</span></button>
          <div className="user-row"><div className="user-avatar">CC</div><div><strong>Cary Cao</strong><span>Creator</span></div><MoreHorizontal size={16} /></div>
          <span className="version">Parser PoC · v0.1</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>项目</span><span>/</span><strong>{projectName}</strong></div>
          <div className="topbar-actions"><span className="saved-state"><Check size={14} />已保存</span><button className="icon-button" title="帮助" onClick={() => setShowHelp(true)}><CircleHelp size={18} /></button><button className="avatar-button" title="当前用户">CC</button></div>
        </header>
        <div className="workspace-scroll">
          {!projectId ? <section className="workspace-card empty-workflow initial-workspace"><div className="empty-icon"><Plus size={23} /></div><h1>先创建一个项目</h1><p>项目用于汇总多个文件和版本；市场、Wave 与表头范围会在上传后由源文件证据识别。</p><button className="button primary" onClick={() => setShowProjectCreate(true)}><Plus size={16} />新建项目</button></section> : activeView === "overview" ? (fileVersions.length === 0 ? <section className="workspace-card empty-workflow initial-workspace"><div className="empty-icon"><Upload size={23} /></div><h1>上传第一个文件</h1><p>当前项目还没有文件版本。上传后先由 Python 扫描，再由你手动启动 AI 识别。</p><button className="button primary" onClick={() => setShowUpload(true)}><Upload size={16} />上传文件</button></section> : <>
          <section className="page-header">
            <div><div className="eyebrow">CREATOR WORKSPACE · {projectName.toUpperCase()} / {marketScope.toUpperCase()} / {waveScope.toUpperCase()}</div><h1>项目概览</h1><p>查看上传版本、表格识别状态和当前需要处理的结构问题。</p></div>
            <div className="page-actions"><button className="button secondary" onClick={() => setShowUpload(true)}><Upload size={16} />上传新版本</button><button className="button primary" onClick={startRecognition}><Sparkles size={16} />开始识别</button></div>
          </section>
          {fileVersions.length > 0 && <div className="version-context"><FileSpreadsheet size={15} /><span>当前文件版本</span><select value={selectedSourceVersionId} onChange={(event) => void selectSourceVersion(event.target.value)}>{fileVersions.map((version) => <option key={version.id} value={version.id}>{version.fileName} · {version.market} · {version.wave}</option>)}</select><span className="project-binding">所属项目：{projectName} · {projectId}</span></div>}
          {projectError && <div className="upload-error page-error"><AlertTriangle size={14} />{projectError}</div>}

          <section className="summary-grid" aria-label="项目摘要">
            <SummaryCard label="已扫描文件" value={String(scannedVersionCount)} meta={`共 ${fileVersions.length} 个文件版本`} icon={<Gauge size={18} />} tone="yellow" />
            <SummaryCard label="已验证表格" value={String(tableDirectoryTotal)} meta="仅计入 Python 回读结果" icon={<ShieldCheck size={18} />} tone="green" />
            <SummaryCard label="待处理问题" value={String(openReviewIssues.length)} meta={openReviewIssues.length ? "由 Python 校验生成" : "当前没有阻断问题"} icon={<AlertTriangle size={18} />} tone="orange" />
            <SummaryCard label="当前文件" value={currentVersion ? "已选择" : "未选择"} meta={currentVersion?.fileName || "请在文件列表选择版本"} icon={<FileSpreadsheet size={18} />} tone="neutral" />
          </section>

          <section className="notice-strip"><div className="notice-icon"><AlertTriangle size={17} /></div><div><strong>{openReviewIssues.some((issue) => issue.blocks_publication) ? "发布暂不可用" : "当前无发布阻断问题"}</strong><span>{openReviewIssues.length ? `还有 ${openReviewIssues.length} 个问题需要处理。` : "没有来自当前识别结果的待确认问题。"}</span></div><button className="text-button" onClick={() => setActiveView("review")}>打开 Review Summary <ArrowUpRight size={14} /></button></section>

          <section className="workspace-card versions-card">
            <div className="card-heading"><div><div className="section-kicker">SOURCE FILE VERSIONS</div><h2>文件与版本</h2><p>新增文件和修正版分开处理；历史版本始终保留。</p></div><div className="version-actions"><button className="button secondary" onClick={() => { setUploadMode("append"); setShowUpload(true); }}><Plus size={15} />追加文件</button><button className="button secondary" onClick={() => { setUploadMode("replace"); setShowUpload(true); }}><Upload size={15} />替换版本</button></div></div>
            <div className="version-list">{fileVersions.map((version, index) => <button type="button" className={`version-row ${version.id === selectedSourceVersionId ? "selected" : ""}`} key={version.id} onClick={() => void selectSourceVersion(version.id)}><span className="version-number">{index === 0 ? "当前" : version.id.replace("sfv_", "v")}</span><div className="version-file"><FileSpreadsheet size={15} /><strong>{version.fileName}</strong></div><span>{version.market}</span><span>{version.wave}</span><span className="version-relation">{version.relation}</span><StatusBadge status={version.status} /><span className="version-open"><ArrowUpRight size={15} /></span></button>)}</div>
          </section>

          <section className="content-grid">
            <div className="workspace-card source-card">
              <div className="card-heading"><div><div className="section-kicker">SOURCE INVENTORY</div><h2>Sheet 与物理表</h2><p>按 Sheet 保存源位置；空 Sheet 或 Index 不会被强行识别为表。</p></div><button className="icon-button" title="重置筛选" onClick={() => { setQuery(""); setStatusFilter("全部状态"); }}><Filter size={17} /></button></div>
              <div className="table-toolbar"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Sheet 或来源类型" /></label><label className="filter-button"><Filter size={14} /><select aria-label="按状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "全部状态" | Status)}><option>全部状态</option><option>已验证</option><option>需 Review</option><option>处理中</option><option>已扫描</option></select><ChevronDown size={14} /></label></div>
              <div className="sheet-table" role="table" aria-label="Sheet 列表"><div className="sheet-row sheet-head" role="row"><span>Sheet / 类型</span><span>物理表</span><span>范围</span><span>状态</span><span /></div>{filteredSheets.map((sheet) => <button key={sheet.name} className={`sheet-row ${selectedSheet === sheet.name ? "selected" : ""}`} onClick={() => setSelectedSheet(sheet.name)}><span className="sheet-name"><FileSpreadsheet size={16} /><span><strong>{sheet.name}</strong><small>{sheet.family}</small></span></span><span>{sheet.tables || "—"}</span><span className="mono-cell">{sheet.range}</span><span><StatusBadge status={sheet.status} /></span><ArrowUpRight size={15} /></button>)}</div>
              <div className="card-footer"><span>共 {filteredSheets.length} 个 Sheet · {recognizedTableCount} 张已识别物理表</span><button className="text-button" onClick={() => setActiveView("explorer")}>查看全部 <ArrowUpRight size={14} /></button></div>
            </div>

            <div className="workspace-card review-card">
              <div className="card-heading"><div><div className="section-kicker">REVIEW SUMMARY</div><h2>需要注意的结构</h2><p>风险行保留在 Review 中，不会静默丢弃。</p></div><button className="icon-button" title="打开 Review" onClick={() => setActiveView("review")}><ArrowUpRight size={17} /></button></div>
              <ReviewIssueList issues={openReviewIssues} onResolve={resolveReviewIssue} compact />
              <button className="review-cta" onClick={() => setActiveView("review")}>打开 Review Summary <ArrowUpRight size={15} /></button>
            </div>
          </section>

          <section className="workspace-card explorer-entry-card">
            <div><div className="section-kicker">DATA EXPLORER</div><h2>{tableDirectoryTotal ? `${tableDirectoryTotal} 张已验证表格` : "尚无已验证表格"}</h2><p>按物理表浏览已通过 Python 回读校验的数据。</p></div>
            <button className="button secondary" onClick={() => setActiveView("explorer")}><Database size={15} />打开 Data Explorer</button>
          </section>
          </>) : <WorkflowPanel activeView={activeView} fileVersions={fileVersions} processingJob={processingJob} recognitionResult={recognitionResult} extractionTables={extractionTables} tableDirectory={tableDirectory} tableDirectoryTotal={tableDirectoryTotal} tableDirectoryPage={tableDirectoryPage} loadingTableId={loadingTableId} onOpenTable={openExtractedTable} onChangeTablePage={(page) => void loadTableDirectory(projectId, selectedSourceVersionId, page).catch((error: Error) => setProjectError(error.message))} dashboardDraft={dashboardDraft} dashboardGenerating={dashboardGenerating} onGenerateDraft={generateDashboardDraft} reviewIssues={reviewIssues} explorerDetail={explorerDetail} setExplorerDetail={setExplorerDetail} onResolveReviewIssue={resolveReviewIssue} setShowUpload={setShowUpload} selectedSheet={selectedSheet} setSelectedSheet={setSelectedSheet} setSelectedVersionDetails={setSelectedVersionDetails} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onRefresh={refreshCurrentProject} />}
        </div>
      </main>

      <button className={`assistant-capsule ${assistantOpen ? "is-open" : ""}`} onClick={() => setAssistantOpen(true)} aria-label="打开 AI 助手"><Sparkles size={16} /><span>AI 助手</span><i /></button>
      {assistantOpen && <aside className="assistant-drawer" aria-label="AI 助手"><div className="assistant-header"><div><span className="section-kicker">CREATOR AI ASSISTANT</span><h2>解析助手</h2></div><button className="icon-button dark" onClick={() => setAssistantOpen(false)} title="关闭 AI 助手"><X size={18} /></button></div><div className="assistant-body"><div className="assistant-status"><span className="pulse" /><div><strong>当前上下文</strong><span>{projectName} · {selectedSheet}</span></div></div><div className="message assistant-message"><div className="message-label"><Sparkles size={14} />AI 助手</div><p>我可以解释当前表格的结构、来源位置和显著性映射。任何修改都会先展示预览，不会直接写回源文件。</p><div className="suggestion-list"><button>解释这个表的 Header</button><button>查看显著性来源</button><button>为什么这个 Sheet 需要 Review？</button></div></div><div className="message system-message"><span className="message-label"><ShieldCheck size={14} />解析边界</span><p>当前页面展示的是已通过 Python 回读校验的结果。模型不参与数值生成。</p></div></div><div className="assistant-composer"><label htmlFor="assistant-input">向解析助手提问</label><div className="composer-box"><input id="assistant-input" placeholder="例如：这个 C 标记对应哪个表头？" /><button className="send-button" title="发送"><ArrowUpRight size={17} /></button></div><span>仅限当前项目上下文 · 不会自动修改数据</span></div></aside>}

      {showUpload && <div className="modal-backdrop" role="presentation"><div className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">SOURCE FILE VERSION</span><h2 id="upload-title">{uploadMode === "replace" ? "替换已有版本" : "追加新文件"}</h2><p>{uploadMode === "replace" ? "用于同一市场和 Wave 的修正版；原版本会保留为历史记录。" : "用于新增市场、Wave 或补充文件；现有版本不会被覆盖。"}</p></div><button className="icon-button" onClick={() => setShowUpload(false)} title="关闭"><X size={18} /></button></div><div className={`drop-zone ${selectedFileName ? "has-file" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}><Upload size={24} /><strong>{selectedFileName || "拖入 XLSX 或 CSV 文件"}</strong><span>{selectedFileName ? "文件已选择，完成后会由 Python 扫描" : "本地 API 会保存文件并进行 Python Workbook 扫描"}</span><input ref={fileInputRef} className="file-input" type="file" accept=".xlsx,.csv" onChange={(event) => acceptFile(event.target.files?.[0])} /><button className="button secondary" onClick={() => fileInputRef.current?.click()}><FolderOpen size={15} />选择文件</button></div>{uploadError && <div className="upload-error"><AlertTriangle size={14} />{uploadError}</div>}{uploadMode === "replace" && <label className="replace-select">要替换的历史版本<select value={replaceVersionId} onChange={(event) => setReplaceVersionId(event.target.value)}>{fileVersions.map((version) => <option key={version.id} value={version.id}>{version.id} · {version.fileName}</option>)}</select></label>}<div className="form-grid upload-context-grid"><label>市场来源<select value={uploadMarket} onChange={(event) => setUploadMarket(event.target.value)}><option>自动识别（推荐）</option><option>Global（总体）</option><option>多市场</option><option>已知单一市场</option></select></label><label>Wave 来源<select value={uploadWave} onChange={(event) => setUploadWave(event.target.value)}><option>自动识别（推荐）</option><option>文件信息提供</option><option>表头中识别</option><option>文件级与表级混合</option><option>未知，上传后 Review</option></select></label></div>{uploadMarket === "自动识别（推荐）" && <label className="optional-hint">已知市场提示（可选）<input value={uploadMarketHint} onChange={(event) => setUploadMarketHint(event.target.value)} placeholder="例如 US、APAC；不需要列出全部市场" /></label>}<div className="upload-hint"><BookOpen size={14} /><span>Python 会先读取文件名、Sheet、表头和表内上下文。只有无法确认、互相冲突或按表不一致时，才进入 Review。</span></div><div className="modal-foot"><span><ShieldCheck size={14} />最终市场和 Wave 以源文件证据为准</span><button className="button primary" onClick={completeUpload} disabled={!selectedFile || uploadSubmitting}>{uploadSubmitting ? "扫描中" : "完成"}</button></div></div></div>}
      {showProjectCreate && <div className="modal-backdrop" role="presentation"><div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">PROJECT SETUP</span><h2 id="project-title">新建项目</h2><p>项目只保存研究上下文。市场范围和 Wave 可在文件版本或表头中识别。</p></div><button className="icon-button" onClick={() => setShowProjectCreate(false)} title="关闭"><X size={18} /></button></div><div className="form-grid"><label>项目名称<input value={draftProjectName} onChange={(event) => setDraftProjectName(event.target.value)} placeholder="例如：Brand Tracker" autoFocus /></label></div>{projectError && <div className="upload-error"><AlertTriangle size={14} />{projectError}</div>}<div className="modal-foot"><span><ShieldCheck size={14} />创建后可上传多个市场和多个 Wave 的文件版本</span><div className="modal-actions"><button className="button secondary" onClick={() => setShowProjectCreate(false)}>取消</button><button className="button primary" onClick={createProject} disabled={!draftProjectName.trim()}><Plus size={15} />创建项目</button></div></div></div></div>}
      {selectedVersionDetails && <div className="modal-backdrop" role="presentation"><div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="version-detail-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">SOURCE FILE VERSION</span><h2 id="version-detail-title">版本详情</h2><p>该版本的上传上下文和处理状态。</p></div><button className="icon-button" onClick={() => setSelectedVersionDetails(null)} title="关闭"><X size={18} /></button></div><div className="detail-list"><div><span>文件名</span><strong>{selectedVersionDetails.fileName}</strong></div><div><span>版本 ID</span><strong className="mono-cell">{selectedVersionDetails.id}</strong></div><div><span>所属项目</span><strong>{projectName}</strong></div><div><span>项目 ID</span><strong className="mono-cell">{projectId}</strong></div><div><span>市场范围</span><strong>{selectedVersionDetails.market}</strong></div><div><span>Wave</span><strong>{selectedVersionDetails.wave}</strong></div><div><span>关系</span><strong>{selectedVersionDetails.relation}</strong></div><div><span>状态</span><StatusBadge status={selectedVersionDetails.status} /></div></div><div className="modal-foot"><span><ShieldCheck size={14} />历史版本不会被覆盖</span><button className="button secondary" onClick={() => setSelectedVersionDetails(null)}>关闭</button></div></div></div>}
      {showHelp && <div className="modal-backdrop" role="presentation"><div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">HELP</span><h2 id="help-title">使用帮助</h2><p>按工作流完成文件识别和结果核验。</p></div><button className="icon-button" onClick={() => setShowHelp(false)} title="关闭"><X size={18} /></button></div><div className="help-list"><p><strong>1. 上传文件</strong>：追加新文件或替换同一逻辑数据集的历史版本。</p><p><strong>2. 开始识别</strong>：Python 先扫描 Workbook，AI 只提出结构边界建议。</p><p><strong>3. Data Explorer</strong>：查看真实回读值、表头路径和源单元格。</p><p><strong>4. Review</strong>：处理冲突或校验失败后，再继续后续使用。</p></div><div className="modal-foot"><span>Parser PoC · v0.1</span><button className="button secondary" onClick={() => setShowHelp(false)}>关闭</button></div></div></div>}
      {showSettings && <div className="modal-backdrop" role="presentation"><div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">PROJECT SETTINGS</span><h2 id="settings-title">项目设置</h2><p>当前项目的标识和本地解析配置。</p></div><button className="icon-button" onClick={() => setShowSettings(false)} title="关闭"><X size={18} /></button></div><div className="detail-list"><div><span>项目名称</span><strong>{projectName}</strong></div><div><span>项目 ID</span><strong className="mono-cell">{projectId}</strong></div><div><span>市场/波次</span><strong>{marketScope} · {waveScope}</strong></div><div><span>AI 识别</span><strong>显式触发 · 当前配置模型</strong></div></div><div className="modal-foot"><span><ShieldCheck size={14} />设置保存于当前本地工作区</span><button className="button secondary" onClick={() => setShowSettings(false)}>关闭</button></div></div></div>}
    </div>
  );
}

function SummaryCard({ label, value, meta, icon, tone }: { label: string; value: string; meta: string; icon: React.ReactNode; tone: string }) {
  return <div className={`summary-card tone-${tone}`}><div className="summary-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>;
}

function ExtractedTablePreview({ table }: { table: ExtractedTable }) {
  const headers = table.headers ?? [];
  return <>
    <div className="table-meta"><span className="table-title-mark" /><div><strong>{table.detected_question_number || table.detected_table_title || "已提取表格"}</strong><span>{table.source_sheet} · {table.source_range} · {table.table_variant || "unknown"}</span></div><StatusBadge status="已验证" /><span className="meta-spacer" /><span className="lineage"><Database size={14} /> Python 回读 · Source Lineage</span></div>
    <div className="data-preview" role="table" aria-label="Python 提取表格预览"><div className="data-row data-head"><span>选项</span>{headers.map((header) => <span key={header.extracted_header_id}>{header.display_label || header.header_path.join(" / ") || "未命名"}{header.significance_code && <em className="sig-marker">{header.significance_code}</em>}</span>)}<span>来源</span></div>{table.rows.map((row) => <div className="data-row" key={row.extracted_row_id}><strong>{row.original_label || row.detected_row_type}</strong>{headers.map((header) => { const cell = row.cells.find((item) => item.extracted_header_id === header.extracted_header_id); return <span key={header.extracted_header_id}>{cell?.excel_display_value ?? "-"}{cell?.original_significance_marker && <em className="sig-marker">{cell.original_significance_marker}</em>}</span>; })}<span className="mono-cell source-cell">{row.cells[0]?.source_cell || "-"}</span></div>)}</div>
    <div className="table-note"><span><ShieldCheck size={14} />真实提取结果；原始值、显示值和解析值均保留</span><span><span className="legend-dot" />`-`、0 和不可用值保持区分</span></div>
  </>;
}

function SourceEvidencePanel({ table }: { table: ExtractedTable }) {
  return <div className="workspace-card recognition-detail-card"><div className="section-kicker">SOURCE EVIDENCE · {table.source_sheet}</div><h2>原始来源</h2><p>{table.source_range}。以下内容来自 Python 对源 Workbook 的回读，不由模型生成。</p><div className="proposal-row"><strong>表头路径</strong>{table.headers.map((header) => <span key={header.extracted_header_id}>{header.header_path.join(" / ") || "未命名"} · {(header.source_header_cells ?? []).join(", ") || "—"}</span>)}</div><div className="proposal-row"><strong>数据源单元格</strong>{table.rows.flatMap((row) => row.cells).slice(0, 12).map((cell) => <span key={cell.source_cell}>{cell.source_cell} · {cell.excel_display_value} · raw: {String(cell.raw_value ?? "null")}</span>)}</div></div>;
}

function ReviewIssueList({ issues, onResolve, compact = false }: { issues: ReviewIssue[]; onResolve: (issue: ReviewIssue, creatorNote?: string) => void; compact?: boolean }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (issues.length === 0) {
    return <div className="empty-workflow"><div className="empty-icon"><ShieldCheck size={23} /></div><h2>当前没有待处理问题</h2><p>这里只展示 Python 校验或提取证据产生的风险项。</p></div>;
  }
  return <div className="issue-list">{issues.map((issue, index) => <div className="issue-row" key={issue.review_issue_id}><span className="issue-number warning">{String(index + 1).padStart(2, "0")}</span><div><strong>{issue.message}</strong><span>{issue.object_type} · {issue.object_id} · {issue.severity}</span></div><span className="issue-status warning"><AlertTriangle size={12} />{issue.status === "open" ? "需确认" : issue.status}</span>{!compact && <div className="review-action"><input value={notes[issue.review_issue_id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [issue.review_issue_id]: event.target.value }))} placeholder="处理备注（可选）" /><button className="button secondary" onClick={() => onResolve(issue, notes[issue.review_issue_id] ?? "")}>确认已处理</button></div>}</div>)}</div>;
}

function PhysicalTableExplorer({ tables, total, page, selectedTable, loadingTableId, onOpenTable, onChangePage }: { tables: ExtractedTableSummary[]; total: number; page: number; selectedTable: ExtractedTable | null; loadingTableId: string; onOpenTable: (tableId: string) => void; onChangePage: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / 20));
  return <section className="standalone-view">
    <div className="page-header"><div><div className="eyebrow">DATA EXPLORER · CREATOR WORKSPACE</div><h1>物理表目录</h1><p>每项代表源文件中可独立阅读的一张表。</p></div></div>
    <div className="workspace-card standalone-card table-directory-card">
      <div className="directory-explainer"><Database size={18} /><div><strong>这里显示什么？</strong><span>“物理表”是 Excel 中一个连续的题目、表头和数据区域，不等同于整个 Sheet。</span></div></div>
      {tables.length === 0 ? <div className="empty-workflow"><div className="empty-icon"><Database size={23} /></div><h2>当前没有可读取的物理表</h2><p>完成 AI 识别并通过 Python 边界校验后，目录会显示在这里。</p></div> : <>
        <div className="physical-table-list" role="table" aria-label="物理表目录">
          <div className="physical-table-row physical-table-head" role="row"><span>表格</span><span>来源位置</span><span>规模</span><span /></div>
          {tables.map((table) => {
            const isExpanded = selectedTable?.extracted_table_id === table.extracted_table_id;
            return <div key={table.extracted_table_id} className={isExpanded ? "physical-table-item expanded" : "physical-table-item"}>
              <button className="physical-table-row" onClick={() => onOpenTable(table.extracted_table_id)} aria-expanded={isExpanded} disabled={loadingTableId === table.extracted_table_id}>
                <span><strong>{table.detected_question_number || table.detected_table_title || "未命名表格"}</strong><small>{table.detected_question_text || table.table_variant || "已通过 Python 校验"}</small></span>
                <span className="source-location"><strong>{table.source_sheet}</strong><small>{table.source_range}</small></span>
                <span>{table.row_count} 行 · {table.header_count} 列</span>
                <span className="table-disclosure"><ChevronDown size={17} /></span>
              </button>
              {isExpanded && <div className="physical-table-detail"><div className="section-kicker">TABLE DETAIL</div><ExtractedTablePreview table={selectedTable} /></div>}
            </div>;
          })}
        </div>
        <div className="directory-pagination"><span>共 {total} 张表 · 第 {page} / {pageCount} 页</span><div><button className="icon-button" title="上一页" disabled={page <= 1} onClick={() => onChangePage(page - 1)}><ChevronDown size={16} className="page-prev" /></button><button className="icon-button" title="下一页" disabled={page >= pageCount} onClick={() => onChangePage(page + 1)}><ChevronDown size={16} className="page-next" /></button></div></div>
      </>}
    </div>
  </section>;
}

function LegacyDashboardDraftWorkspace({ draft, generating, onGenerate }: { draft: DashboardDraft | null; generating: boolean; onGenerate: (metricConfirmations?: Record<string, string>) => void }) {
  const [selectedPageId, setSelectedPageId] = useState("");
  const [metricConfirmations, setMetricConfirmations] = useState<Record<string, string>>({});
  const selectedPage = draft?.pages.find((page) => page.dashboard_page_id === selectedPageId) ?? draft?.pages[0];
  if (!draft) {
    return <section className="standalone-view"><div className="page-header"><div><div className="eyebrow">DASHBOARD DRAFT · CREATOR WORKSPACE</div><h1>生成 Dashboard Draft</h1><p>仅使用已通过 Python 校验的物理表创建内部 Draft；不会发布或修改源数据。</p></div><button className="button primary" onClick={() => onGenerate()} disabled={generating}><Sparkles size={16} />{generating ? "生成中" : "生成 Dashboard Draft"}</button></div><div className="workspace-card empty-workflow"><div className="empty-icon"><BarChart3 size={23} /></div><h2>尚未生成 Draft</h2><p>Draft 会先建立语义快照和页面计划，再由 Creator 确认指标、图表与展示范围。</p></div></section>;
  }
  const categories: Array<[DashboardDraft["pages"][number]["category"], string]> = [["core", "Core Pages"], ["suggested", "Suggested Pages"], ["appendix", "Appendix"], ["internal", "Internal"]];
  const semanticQuestions = draft.semantic_questions ?? [];
  return <section className="standalone-view dashboard-workspace"><div className="page-header"><div><div className="eyebrow">DASHBOARD DRAFT · {draft.template.toUpperCase()}</div><h1>{draft.dashboard_name}</h1><p>Draft v{draft.revision ?? 1} · {draft.summary.tables_in_draft} 张表已进入规划，{draft.summary.review_required} 项仍需确认。</p></div><button className="button secondary" onClick={() => onGenerate(metricConfirmations)} disabled={generating}><Sparkles size={15} />{generating ? "生成中" : "保存为新 Draft 版本"}</button></div><section className="summary-grid" aria-label="Dashboard Draft 摘要"><SummaryCard label="识别表格" value={String(draft.summary.tables_detected)} meta="当前文件版本" icon={<Database size={18} />} tone="neutral" /><SummaryCard label="语义问题" value={String(draft.summary.semantic_questions)} meta="严格关联后保留" icon={<ShieldCheck size={18} />} tone="green" /><SummaryCard label="Draft 内容" value={String(draft.summary.tables_in_draft)} meta="未包含发布数据" icon={<BarChart3 size={18} />} tone="yellow" /><SummaryCard label="需确认" value={String(draft.summary.review_required)} meta="指标尚未确认" icon={<AlertTriangle size={18} />} tone="orange" /></section>{draft.warnings.map((warning) => <div className="notice-strip dashboard-warning" key={warning}><div className="notice-icon"><AlertTriangle size={17} /></div><span>{warning}</span></div>)}<div className="dashboard-builder"><aside className="dashboard-page-panel">{categories.map(([category, label]) => { const pages = draft.pages.filter((page) => page.category === category); return pages.length ? <div key={category}><div className="section-kicker">{label}</div>{pages.map((page) => <button key={page.dashboard_page_id} className={`dashboard-page-item ${selectedPage?.dashboard_page_id === page.dashboard_page_id ? "selected" : ""}`} onClick={() => setSelectedPageId(page.dashboard_page_id)}><span>{page.title}</span><small>{page.visuals.length}</small></button>)}</div> : null; })}</aside><section className="dashboard-canvas"><div className="card-heading"><div><div className="section-kicker">{selectedPage?.category ?? "DRAFT"}</div><h2>{selectedPage?.title ?? "暂无页面"}</h2></div><span className="status-badge status-warning"><AlertTriangle size={12} />内部 Draft</span></div>{selectedPage?.visuals.length ? <div className="draft-visual-grid">{selectedPage.visuals.map((visual) => <article className="draft-visual" key={visual.dashboard_visual_id}><div><div className="section-kicker">{visual.visual_type === "data_table" ? "DATA TABLE" : visual.visual_type}</div><h3>{visual.title}</h3></div><span className={`status-badge ${visual.review_status === "creator_confirmed" ? "status-success" : "status-warning"}`}>{visual.review_status === "creator_confirmed" ? "已确认指标" : "待确认指标"}</span><div className="draft-visual-evidence"><Database size={14} /><span>{visual.evidence.source_ranges?.join(" · ") || visual.source_extracted_table_id}</span></div></article>)}</div> : <div className="empty-workflow"><div className="empty-icon"><BarChart3 size={23} /></div><h2>当前页面没有可展示内容</h2><p>技术表和未确认内容不会自动进入 Creator 可见页面。</p></div>}</section></div><section className="workspace-card semantic-review-card"><div className="card-heading"><div><div className="section-kicker">SEMANTIC REVIEW</div><h2>确认指标类型</h2><p>确认后会创建新 Draft 版本；源表与现有 Draft 保持不变。</p></div></div>{semanticQuestions.length ? <div className="semantic-review-list">{semanticQuestions.map((question) => { const tableId = question.source_extracted_table_ids[0]; const value = metricConfirmations[tableId] ?? question.metric_type; return <label key={question.semantic_question_id}><span><strong>{question.title}</strong><small>{question.module_name} · {question.evidence.source_ranges?.join(" · ")}</small></span><select value={value} onChange={(event) => setMetricConfirmations((current) => ({ ...current, [tableId]: event.target.value }))}><option value="unknown">待确认</option><option value="percentage">百分比</option><option value="count">样本数</option><option value="mean">均值</option><option value="net">Net</option><option value="box_score">Box Score</option></select></label>; })}</div> : <p className="empty-state-copy">此历史 Draft 不含可确认的语义快照。保存为新版本后即可继续确认。</p>}</section></section>;
}

function DashboardDraftWorkspace({ draft, generating, onGenerate, visualOverrides, onVisualChange }: { draft: DashboardDraft | null; generating: boolean; onGenerate: (options?: DashboardDraftOptions) => void; visualOverrides: Record<string, string>; onVisualChange: (tableId: string, visual: string) => void }) {
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const semanticQuestions = draft?.semantic_questions ?? [];
  useEffect(() => {
    if (!draft) return;
    const visualIds = new Set(draft.pages.flatMap((page) => page.visuals.map((visual) => visual.source_extracted_table_id)));
    setSelectedTableIds(new Set(semanticQuestions.filter((question) => question.included_in_draft ?? visualIds.has(question.source_extracted_table_ids[0])).map((question) => question.source_extracted_table_ids[0])));
  }, [draft?.dashboard_version_id]);
  if (!draft) return <section className="standalone-view"><div className="page-header"><div><div className="eyebrow">DASHBOARD DRAFT · CREATOR WORKSPACE</div><h1>AI 推荐 Dashboard Draft</h1><p>系统会选择合适模板、核心内容和图表类型，再生成可直接浏览的 Draft。</p></div><button className="button primary" onClick={() => onGenerate()} disabled={generating}><Sparkles size={16} />{generating ? "生成中" : "生成 AI 推荐 Draft"}</button></div></section>;
  const categories: Array<[DashboardDraft["pages"][number]["category"], string]> = [["core", "Core Pages"], ["suggested", "Suggested Pages"], ["appendix", "Appendix"], ["internal", "Internal"]];
  const selectedPage = draft.pages.find((page) => page.dashboard_page_id === selectedPageId) ?? draft.pages[0];
  const setRecommendedScope = () => setSelectedTableIds(new Set(semanticQuestions.filter((question) => question.ai_recommended).map((question) => question.source_extracted_table_ids[0])));
  const toggleTable = (tableId: string) => setSelectedTableIds((current) => { const next = new Set(current); if (next.has(tableId)) next.delete(tableId); else next.add(tableId); return next; });
  const saveScopeDraft = () => onGenerate({ selectedTableIds: [...selectedTableIds], visualOverrides, planningMode: "ai_refresh" });
  const saveGraphDraft = () => onGenerate({ selectedTableIds: [...selectedTableIds], visualOverrides, planningMode: "python_only" });
  const matchedTemplates = Array.from(new Set(semanticQuestions.flatMap((question) => (question.template_matches ?? []).map((match) => match.template))));
  return <><section className="standalone-view dashboard-workspace"><div className="page-header"><div><div className="eyebrow">DASHBOARD DRAFT · {draft.template.toUpperCase()}</div><h1>{draft.dashboard_name}</h1><p>Draft v{draft.revision ?? 1} · AI 已纳入 {draft.summary.tables_in_draft} 张表；当前可选择 {selectedTableIds.size} 张。</p></div><button className="button secondary" onClick={saveScopeDraft} disabled={generating}><Sparkles size={15} />{generating ? "生成中" : "更新 Draft"}</button></div><section className="summary-grid" aria-label="Dashboard Draft 摘要"><SummaryCard label="识别表格" value={String(draft.summary.tables_detected)} meta="当前文件版本" icon={<Database size={18} />} tone="neutral" /><SummaryCard label="AI 纳入" value={String(draft.summary.tables_in_draft)} meta="可直接浏览" icon={<Sparkles size={18} />} tone="green" /><SummaryCard label="当前选择" value={String(selectedTableIds.size)} meta="保存后生成新版本" icon={<Check size={18} />} tone="yellow" /><SummaryCard label="低置信提示" value={String(draft.summary.review_required)} meta="不会阻止浏览 Draft" icon={<AlertTriangle size={18} />} tone="orange" /></section><div className="dashboard-builder"><aside className="dashboard-page-panel">{categories.map(([category, label]) => { const pages = draft.pages.filter((page) => page.category === category); return pages.length ? <div key={category}><div className="section-kicker">{label}</div>{pages.map((page) => <button key={page.dashboard_page_id} className={`dashboard-page-item ${selectedPage?.dashboard_page_id === page.dashboard_page_id ? "selected" : ""}`} onClick={() => setSelectedPageId(page.dashboard_page_id)}><span>{page.title}</span><small>{page.visuals.length}</small></button>)}</div> : null; })}</aside><section className="dashboard-canvas"><div className="card-heading"><div><div className="section-kicker">{selectedPage?.category ?? "DRAFT"}</div><h2>{selectedPage?.title ?? "暂无页面"}</h2></div><span className="status-badge status-success"><Sparkles size={12} />AI 推荐</span></div>{selectedPage?.visuals.length ? <div className="draft-visual-grid">{selectedPage.visuals.map((visual) => <article className="draft-visual" key={visual.dashboard_visual_id}><div><div className="section-kicker">{visual.visual_type === "data_table" ? "DATA TABLE" : visual.visual_type}</div><h3>{visual.title}</h3></div><span className={`status-badge ${visual.review_status === "review_required" ? "status-warning" : "status-success"}`}>{visual.review_status === "review_required" ? "保守展示" : "AI 推荐图表"}</span><div className="draft-visual-evidence"><Database size={14} /><span>{visual.evidence.source_ranges?.join(" · ") || visual.source_extracted_table_id}</span></div></article>)}</div> : <div className="empty-workflow"><div className="empty-icon"><BarChart3 size={23} /></div><h2>当前范围没有纳入内容</h2><p>请在下方选择要加入 Draft 的表格。</p></div>}</section></div><section className="workspace-card draft-setup-card"><div className="card-heading"><div><div className="section-kicker">DRAFT SETUP</div><h2>1. 选择内容范围</h2><p>AI 已按题目语义匹配模板并预选核心内容。选择完成后，在本区底部保存。</p></div><button className="text-button" onClick={setRecommendedScope}>恢复 AI 推荐</button></div><div className="template-match-summary"><Sparkles size={15} /><span>AI 匹配模板：{matchedTemplates.length ? matchedTemplates.join("、") : "暂无明确模板"}</span></div><div className="content-selection-list">{semanticQuestions.map((question) => { const tableId = question.source_extracted_table_ids[0]; return <label key={question.semantic_question_id} className={selectedTableIds.has(tableId) ? "selected" : ""}><input type="checkbox" checked={selectedTableIds.has(tableId)} onChange={() => toggleTable(tableId)} /><span><strong>{question.title}</strong><small>{question.module_name} · {question.evidence.source_ranges?.join(" · ")}</small></span>{question.ai_recommended && <em>AI 推荐</em>}</label>; })}</div><div className="draft-action-bar"><span>已选择 {selectedTableIds.size} 项 · 图形修改会随新 Draft 版本保存</span><button className="button primary" onClick={saveScopeDraft} disabled={generating}><Sparkles size={15} />{generating ? "正在更新" : "2. 保存并更新 Draft"}</button></div></section></section><PlanningReviewPanel draft={draft} visualOverrides={visualOverrides} onVisualChange={onVisualChange} onSave={saveGraphDraft} generating={generating} /></>;
}

function DashboardPreviewWorkspace({ draft }: { draft: DashboardDraft | null }) {
  if (!draft) return <section className="standalone-view"><div className="page-header"><div><div className="eyebrow">DASHBOARD PREVIEW</div><h1>尚未生成 Dashboard Draft</h1><p>先在 Dashboard Draft 中完成 AI 规划和内容范围选择。</p></div></div></section>;
  return <section className="standalone-view dashboard-preview-workspace"><div className="page-header"><div><div className="eyebrow">DASHBOARD PREVIEW · DRAFT V{draft.revision ?? 1}</div><h1>{draft.dashboard_name}</h1><p>这里集中查看所有已纳入 Draft 的页面和图表；修改题目或图形请返回左侧 Dashboard Draft。</p></div><span className="status-badge status-success"><ShieldCheck size={12} />已验证数据</span></div>{draft.pages.map((page) => <section className="dashboard-preview-page" key={page.dashboard_page_id}><div className="card-heading"><div><div className="section-kicker">{page.category.toUpperCase()}</div><h2>{page.title}</h2></div><span className="status-badge status-info">{page.visuals.length} 个图表</span></div><div className="dashboard-data-grid">{page.visuals.map((visual) => <DashboardDataPreviewItem key={visual.dashboard_visual_id} draft={draft} visual={visual} />)}</div></section>)}</section>;
}

function DashboardDataPreview({ draft }: { draft: DashboardDraft | null }) {
  const corePage = draft?.pages.find((page) => page.category === "core") ?? draft?.pages[0];
  if (!draft || !corePage?.visuals.length) return null;
  return <section className="dashboard-data-preview"><div className="card-heading"><div><div className="section-kicker">VALIDATED DATA PREVIEW</div><h2>{corePage.title}</h2><p>仅读取当前 Core 页已纳入的物理表；数值与 Base 保持原始提取结果。</p></div></div><div className="dashboard-data-grid">{corePage.visuals.map((visual) => <DashboardDataPreviewItem key={visual.dashboard_visual_id} draft={draft} visual={visual} />)}</div></section>;
}

const visualChoices = [
  ["bar", "柱状图"], ["horizontal_bar", "横向条形图"], ["grouped_bar", "分组条形图"], ["line", "趋势折线图"],
  ["funnel", "漏斗图"], ["pyramid", "金字塔图"], ["heatmap", "热力图"], ["pie", "饼图"],
  ["donut", "环形图"], ["radar", "雷达图"], ["scatter", "散点图"], ["data_table", "数据表"],
] as const;

function PlanningReviewPanel({ draft, visualOverrides, onVisualChange, onSave, generating }: { draft: DashboardDraft | null; visualOverrides: Record<string, string>; onVisualChange: (tableId: string, visual: string) => void; onSave: () => void; generating: boolean }) {
  const questions = (draft?.semantic_questions ?? []).filter((question) => question.included_in_draft);
  if (!questions.length) return null;
  return <section className="workspace-card planning-review-card"><div className="card-heading"><div><div className="section-kicker">AI PLANNING REVIEW</div><h2>2. 检查题目与图形</h2><p>修改图形后，请在这里保存；保存成功后到左侧 Dashboard Preview 查看新结果。</p></div><button className="button primary" onClick={onSave} disabled={generating}><Sparkles size={15} />{generating ? "正在更新" : "保存图形并更新 Draft"}</button></div><div className="planning-review-list">{questions.map((question) => { const tableId = question.source_extracted_table_ids[0]; const selectedVisual = visualOverrides[tableId] ?? question.recommended_visual ?? "data_table"; return <article key={question.semantic_question_id}><div><strong>{question.title}</strong><small>{question.module_name} · {question.evidence.source_ranges?.join(" · ")}</small></div><div className="planning-review-meta"><span className="planning-template-list">{(question.template_matches ?? []).map((match) => <em key={match.template} title={match.reason}>{match.template}</em>)}</span><label className="planning-visual-select"><span className="sr-only">选择图形</span><select value={selectedVisual} onChange={(event) => onVisualChange(tableId, event.target.value)}>{visualChoices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span className="planning-confidence">{question.planning_source === "ai" ? `AI ${(question.planning_confidence ?? 0).toFixed(2)}` : question.planning_source === "creator_override" ? "已保存选择" : "规则回退"}</span></div>{question.planning_reason && <p>{question.planning_reason}</p>}</article>; })}</div></section>;
}

function DashboardDataPreviewItem({ draft, visual }: { draft: DashboardDraft; visual: DashboardVisual }) {
  const [table, setTable] = useState<ExtractedTable | null>(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let active = true;
    setTable(null);
    setError("");
    fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${draft.project_id}/source-versions/${draft.source_file_version_id}/extraction-tables/${encodeURIComponent(visual.source_extracted_table_id)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.detail || "读取预览失败");
        if (active) setTable(payload.data.table as ExtractedTable);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "读取预览失败"); });
    return () => { active = false; };
  }, [draft.project_id, draft.source_file_version_id, visual.source_extracted_table_id]);
  const base = table?.rows.find((row) => row.detected_row_type === "base" || row.original_label.toLowerCase().startsWith("base:"));
  const allRows = table?.rows.filter((row) => row !== base) ?? [];
  const rows = showAll ? allRows : allRows.slice(0, 5);
  useEffect(() => {
    if (!chartRef.current || !table || visual.visual_type === "data_table") return;
    const sourceTable = table;
    chartRef.current.style.height = `${Math.max(210, rows.length * 32 + 40)}px`;
    const chart = initECharts(chartRef.current);
    const precision = Math.max(0, Math.min(3, visual.display_precision ?? 1));
    const formatValue = (value: number, percentage: boolean) => `${value.toFixed(precision)}${percentage ? "%" : ""}`;
    const values = rows.map((row) => {
      const cell = row.cells[0];
      const percentage = cell?.parsed_unit === "percentage";
      const value = typeof cell?.parsed_value === "number" ? Number(cell.parsed_value) * (percentage ? 100 : 1) : 0;
      return { label: row.original_label, value, display: typeof cell?.parsed_value === "number" ? formatValue(value, percentage) : cell?.excel_display_value || "-" };
    });
    const isPercentage = rows.some((row) => row.cells[0]?.parsed_unit === "percentage");
    const visualType = visual.visual_type;
    const common = { animation: false, tooltip: { trigger: "item" } };
    const option = visualType === "heatmap"
      ? { ...common, grid: { left: 8, right: 18, top: 8, bottom: 8, containLabel: true }, xAxis: { type: "category", data: sourceTable.headers.slice(0, 12).map((header) => header.display_label || header.header_path.join(" / ")), axisLabel: { color: "#6f7684", fontSize: 9, rotate: 35 } }, yAxis: { type: "category", data: rows.map((row) => row.original_label), axisLabel: { color: "#334155", fontSize: 9 } }, visualMap: { min: 0, max: isPercentage ? 100 : 1, calculable: false, orient: "horizontal", left: "center", bottom: 0, textStyle: { fontSize: 9 } }, series: [{ type: "heatmap", data: rows.flatMap((row, rowIndex) => sourceTable.headers.slice(0, 12).map((header, columnIndex) => { const cell = row.cells.find((item) => item.extracted_header_id === header.extracted_header_id); const value = typeof cell?.parsed_value === "number" ? Number(cell.parsed_value) * (cell.parsed_unit === "percentage" ? 100 : 1) : 0; return [columnIndex, rowIndex, value]; })), label: { show: false } }] }
      : visualType === "pie" || visualType === "donut"
      ? { ...common, tooltip: { trigger: "item", formatter: (params: { name: string; value: number; percent: number }) => `${params.name}<br/>${formatValue(params.value, isPercentage)} (${params.percent.toFixed(precision)}%)` }, series: [{ type: "pie", radius: visualType === "donut" ? ["42%", "72%"] : "68%", data: values.map((item) => ({ name: item.label, value: item.value })), label: { formatter: (params: { name: string; value: number }) => `${params.name} ${formatValue(params.value, isPercentage)}` } }] }
      : visualType === "funnel" || visualType === "pyramid"
        ? { ...common, series: [{ type: "funnel", sort: "descending", left: "8%", width: "84%", min: 0, max: isPercentage ? 100 : undefined, data: values.map((item) => ({ name: item.label, value: item.value })), label: { formatter: (params: { name: string; value: number }) => `${params.name} ${formatValue(params.value, isPercentage)}` } }] }
        : visualType === "radar"
          ? { ...common, radar: { indicator: values.map((item) => ({ name: item.label, max: isPercentage ? 100 : Math.max(...values.map((value) => value.value), 1) })) }, series: [{ type: "radar", data: [{ value: values.map((item) => item.value), name: visual.title }], areaStyle: { color: "rgba(214,164,0,.18)" }, lineStyle: { color: "#c09100" } }] }
          : visualType === "scatter"
            ? { ...common, xAxis: { type: "value" }, yAxis: { type: "value" }, series: [{ type: "scatter", data: values.map((item, index) => [index, item.value]), symbolSize: 9, itemStyle: { color: "#c09100" } }] }
              : visualType === "bar"
                ? { ...common, grid: { left: 16, right: 16, top: 18, bottom: 28, containLabel: true }, xAxis: { type: "category", data: values.map((item) => item.label), axisLabel: { color: "#334155", fontSize: 9, rotate: values.length > 8 ? 35 : 0 } }, yAxis: { type: "value", max: isPercentage ? 100 : undefined, axisLabel: { color: "#6f7684", fontSize: 10, formatter: isPercentage ? "{value}%" : "{value}" } }, series: [{ type: "bar", data: values.map((item) => item.value), barMaxWidth: 24, itemStyle: { color: "#d6a400", borderRadius: [3, 3, 0, 0] }, label: { show: true, position: "top", color: "#1d1d1b", fontSize: 9, formatter: (params: { dataIndex: number }) => values[params.dataIndex]?.display || "-" } }] }
              : visualType === "line"
              ? { ...common, grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true }, xAxis: { type: "category", data: values.map((item) => item.label), axisLabel: { color: "#6f7684", fontSize: 10 } }, yAxis: { type: "value", max: isPercentage ? 100 : undefined, axisLabel: { color: "#6f7684", fontSize: 10, formatter: isPercentage ? "{value}%" : "{value}" } }, series: [{ type: "line", data: values.map((item) => item.value), smooth: true, symbolSize: 7, itemStyle: { color: "#c09100" }, lineStyle: { color: "#c09100", width: 2 } }] }
              : { ...common, grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true }, xAxis: { type: "value", max: isPercentage ? 100 : undefined, axisLabel: { color: "#6f7684", fontSize: 10, formatter: isPercentage ? "{value}%" : "{value}" }, splitLine: { lineStyle: { color: "#e5e7eb" } } }, yAxis: { type: "category", inverse: true, data: values.map((item) => item.label), axisLabel: { color: "#334155", fontSize: 10, width: 100, overflow: "truncate" }, axisLine: { show: false }, axisTick: { show: false } }, series: [{ type: "bar", data: values.map((item) => item.value), barMaxWidth: 18, itemStyle: { color: "#d6a400", borderRadius: [0, 3, 3, 0] }, label: { show: true, position: "right", color: "#1d1d1b", fontSize: 10, formatter: (params: { dataIndex: number }) => values[params.dataIndex]?.display || "-" } }] };
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); chart.dispose(); };
  }, [rows, visual.visual_type]);
  if (error) return <article className="data-preview-card"><h3>{visual.title}</h3><p>{error}</p></article>;
  if (!table) return <article className="data-preview-card"><h3>{visual.title}</h3><p>正在读取已验证数据...</p></article>;
  return <article className="data-preview-card"><div><div className="section-kicker">{visual.visual_type.toUpperCase()}</div><div className="preview-card-title"><h3>{visual.title}</h3><button className="text-button" onClick={() => setShowAll((current) => !current)}>{showAll ? "收起" : `显示全部 ${allRows.length} 项`}</button></div>{base && <small>Base: {base.cells[0]?.excel_display_value || "-"}</small>}</div>{visual.visual_type === "data_table" ? <div className="preview-bars">{rows.map((row) => <div className="preview-bar-row" key={row.extracted_row_id}><span title={row.original_label}>{row.original_label}</span><strong>{row.cells[0]?.excel_display_value || "-"}</strong></div>)}</div> : <div className="echarts-preview" ref={chartRef} aria-label={`${visual.title} ${visual.visual_type}`} />}<div className="draft-visual-evidence"><Database size={14} /><span>{table.source_range}</span></div></article>;
}

function WorkflowPanel({ activeView, fileVersions, processingJob, recognitionResult, extractionTables, tableDirectory, tableDirectoryTotal, tableDirectoryPage, loadingTableId, onOpenTable, onChangeTablePage, dashboardDraft, dashboardGenerating, onGenerateDraft, reviewIssues, explorerDetail, setExplorerDetail, onResolveReviewIssue, setShowUpload, selectedSheet, setSelectedSheet, setSelectedVersionDetails, query, setQuery, statusFilter, setStatusFilter, onRefresh }: { activeView: Exclude<WorkflowView, "overview">; fileVersions: FileVersion[]; processingJob: ProcessingJob | null; recognitionResult: RecognitionResult | null; extractionTables: ExtractedTable[]; tableDirectory: ExtractedTableSummary[]; tableDirectoryTotal: number; tableDirectoryPage: number; loadingTableId: string; onOpenTable: (tableId: string) => void; onChangeTablePage: (page: number) => void; dashboardDraft: DashboardDraft | null; dashboardGenerating: boolean; onGenerateDraft: (options?: DashboardDraftOptions) => void; reviewIssues: ReviewIssue[]; explorerDetail: ExplorerDetail; setExplorerDetail: (detail: ExplorerDetail) => void; onResolveReviewIssue: (issue: ReviewIssue, creatorNote?: string) => void; setShowUpload: (open: boolean) => void; selectedSheet: string; setSelectedSheet: (sheet: string) => void; setSelectedVersionDetails: (version: FileVersion) => void; query: string; setQuery: (value: string) => void; statusFilter: "全部状态" | Status; setStatusFilter: (value: "全部状态" | Status) => void; onRefresh: () => void }) {
  const [visualOverrides, setVisualOverrides] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!dashboardDraft) return;
    setVisualOverrides(Object.fromEntries((dashboardDraft.semantic_questions ?? []).filter((question) => question.planning_source === "creator_override").map((question) => [question.source_extracted_table_ids[0], question.recommended_visual ?? "data_table"])));
  }, [dashboardDraft?.dashboard_version_id]);
  const panelCopy: Record<Exclude<WorkflowView, "overview">, { kicker: string; title: string; description: string }> = {
    versions: { kicker: "SOURCE FILE VERSIONS", title: "文件与版本", description: "管理追加文件和同一逻辑数据集的修正版，历史来源不会被覆盖。" },
    processing: { kicker: "PROCESSING STATUS", title: "识别进度", description: "当前没有正在运行的识别任务；启动真实任务后，这里显示阶段和后台处理状态。" },
    review: { kicker: "REVIEW SUMMARY", title: "Review Summary", description: "问题按风险分级展示；未确认的范围、Wave 或结构分类不会静默发布。" },
    explorer: { kicker: "DATA EXPLORER", title: "Data Explorer", description: "按 Sheet、物理表和来源坐标浏览已通过 Python 回读的结果。" },
    dashboard: { kicker: "DASHBOARD DRAFT", title: "Dashboard Draft", description: "Dashboard Builder 将在语义模型和发布门禁接入后启用。" },
    dashboard_preview: { kicker: "DASHBOARD PREVIEW", title: "Dashboard Preview", description: "查看当前 Draft 已纳入题目的完整图表预览；预览只读取已验证的源表。" },
  };
  const copy = panelCopy[activeView];
  const recognizedSheets = recognitionResult?.result.sheets?.map((sheet) => {
    const proposals = sheet.boundary_proposals ?? [];
    const validations = sheet.boundary_validations ?? [];
    const hasReview = validations.some((validation) => validation.outcome === "review_required" || validation.outcome === "rejected");
    return { name: sheet.sheet_name, family: "AI 识别", tables: proposals.length, status: (hasReview ? "需 Review" : "已验证") as Status, range: proposals[0]?.source_range || "未返回范围" };
  });
  const explorerSheets = (recognizedSheets ?? []).filter((sheet) => {
    const matchesQuery = `${sheet.name} ${sheet.family}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "全部状态" || sheet.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const selectedRecognitionSheet = recognitionResult?.result.sheets?.find((sheet) => sheet.sheet_name === selectedSheet);
  const proposalsForSelectedSheet = selectedRecognitionSheet?.boundary_proposals ?? [];
  const selectedExtractedTable = extractionTables.find((table) => table.source_sheet === selectedSheet);
  const openIssues = reviewIssues.filter((issue) => issue.status === "open" || issue.status === "in_review");
  const processingDescription = processingJob?.status === "failed"
    ? "任务已停止。请根据下方错误信息调整配置后，再手动重试。"
    : processingJob?.status === "completed"
      ? "已完成 Python 校验和结果保存。"
      : "AI 正在处理轻量结构摘要。大 Sheet 可能需要数分钟；可刷新页面，任务状态会从本地后端恢复。";
  if ((activeView as WorkflowView) === "explorer") {
    return <PhysicalTableExplorer tables={tableDirectory} total={tableDirectoryTotal} page={tableDirectoryPage} selectedTable={extractionTables[0] ?? null} loadingTableId={loadingTableId} onOpenTable={onOpenTable} onChangePage={onChangeTablePage} />;
  }
  if ((activeView as WorkflowView) === "dashboard") {
    return <DashboardDraftWorkspace draft={dashboardDraft} generating={dashboardGenerating} onGenerate={onGenerateDraft} visualOverrides={visualOverrides} onVisualChange={(tableId, visual) => setVisualOverrides((current) => ({ ...current, [tableId]: visual }))} />;
  }
  if ((activeView as WorkflowView) === "dashboard_preview") {
    return <DashboardPreviewWorkspace draft={dashboardDraft} />;
  }
  return <section className="standalone-view"><div className="page-header"><div><div className="eyebrow">{copy.kicker} · CREATOR WORKSPACE</div><h1>{copy.title}</h1><p>{copy.description}</p></div>{activeView === "versions" && <button className="button primary" onClick={() => setShowUpload(true)}><Plus size={16} />追加文件</button>}</div>{activeView === "versions" && <div className="workspace-card standalone-card"><div className="version-list">{fileVersions.map((version, index) => <div className="version-row" key={version.id}><span className="version-number">{index === 0 ? "当前" : version.id.replace("sfv_", "v")}</span><div className="version-file"><FileSpreadsheet size={15} /><strong>{version.fileName}</strong></div><span>{version.market}</span><span>{version.wave}</span><span className="version-relation">{version.relation}</span><StatusBadge status={version.status} /><button className="icon-button" title="版本详情" onClick={() => setSelectedVersionDetails(version)}><ArrowUpRight size={15} /></button></div>)}</div></div>}{activeView === "processing" && processingJob && <div className="workspace-card processing-card"><div className="section-kicker">BACKGROUND JOB · {processingJob.job_id}</div><h2>{processingJob.status === "completed" ? "识别任务已完成" : processingJob.status === "failed" ? "识别任务失败" : "识别任务处理中"}</h2><p>{processingJob.phase}。</p><p className="processing-guidance">{processingDescription}</p><div className="processing-progress"><div style={{ width: `${processingJob.progress_percent}%` }} /></div><div className="processing-meta"><span>{processingJob.progress_percent}%</span><span>{processingJob.source_file_version_id}</span><button className="text-button" onClick={onRefresh}>刷新状态</button></div>{processingJob.error_message && <div className="upload-error"><AlertTriangle size={14} />{processingJob.error_message}</div>}</div>}{activeView === "review" && <div className="review-detail-grid"><div className="workspace-card standalone-card"><div className="card-heading"><div><div className="section-kicker">OPEN ISSUES</div><h2>待处理问题</h2></div><span className="status-badge status-warning"><AlertTriangle size={12} />{openIssues.length} 个待确认</span></div><ReviewIssueList issues={openIssues} onResolve={onResolveReviewIssue} /></div><div className="workspace-card risk-explanation"><div className="section-kicker">PUBLICATION GATE</div><h2>{openIssues.some((issue) => issue.blocks_publication) ? "发布暂不可用" : "当前无发布阻断问题"}</h2><p>{openIssues.length ? "风险项未完成确认，源坐标和审计记录会被保留。" : "当前识别结果没有待处理的发布风险。"}</p></div></div>}{activeView === "explorer" && <div className="workspace-card standalone-card"><div className="table-toolbar"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Sheet 或来源类型" /></label><label className="filter-button"><Filter size={14} /><select aria-label="按状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "全部状态" | Status)}><option>全部状态</option><option>已验证</option><option>需 Review</option><option>处理中</option><option>已扫描</option></select><ChevronDown size={14} /></label></div><div className="sheet-table" role="table" aria-label="Data Explorer Sheet 列表">{explorerSheets.map((sheet) => <button key={sheet.name} className={`sheet-row ${selectedSheet === sheet.name ? "selected" : ""}`} onClick={() => { setSelectedSheet(sheet.name); setExplorerDetail("none"); }}><span className="sheet-name"><FileSpreadsheet size={16} /><span><strong>{sheet.name}</strong><small>{sheet.family}</small></span></span><span>{sheet.tables || "—"}</span><span className="mono-cell">{sheet.range}</span><span><StatusBadge status={sheet.status} /></span><ArrowUpRight size={15} /></button>)}</div><div className="table-note"><span><Database size={14} />选择 Sheet 后在下方查看真实提取结果</span><span>Source Lineage 已保留</span></div></div>}{activeView === "explorer" && explorerDetail !== "source" && selectedRecognitionSheet && <div className="workspace-card recognition-detail-card"><div className="section-kicker">VALIDATED STRUCTURE · {selectedRecognitionSheet.sheet_name}</div><h2>物理表结构提案</h2>{proposalsForSelectedSheet.length === 0 ? <p>当前 Sheet 没有返回物理表提案。</p> : proposalsForSelectedSheet.map((proposal, index) => <div className="proposal-row" key={`${proposal.source_range}-${index}`}><strong>{proposal.source_range}</strong><span>Header: {proposal.regions?.header_rows?.join(", ") || "—"}</span><span>Base: {proposal.regions?.base_rows?.join(", ") || "—"}</span><span>Data: {proposal.regions?.data_rows?.join(", ") || "—"}</span><span>Footnote: {proposal.regions?.footnote_rows?.join(", ") || "—"}</span><span>Sig: {proposal.regions?.significance_layout || "none"}</span></div>)}</div>}{activeView === "explorer" && explorerDetail === "source" && selectedExtractedTable && <SourceEvidencePanel table={selectedExtractedTable} />}{activeView === "explorer" && explorerDetail !== "source" && (selectedExtractedTable ? <div className="workspace-card explorer-card"><ExtractedTablePreview table={selectedExtractedTable} /></div> : <div className="workspace-card empty-workflow"><div className="empty-icon"><Database size={23} /></div><h2>当前 Sheet 尚无可展示的提取数据</h2><p>完成边界校验后，Python 回读的真实表格会显示在这里。</p></div>)}{activeView === "dashboard" && (extractionTables.length ? <div className="dashboard-draft"><section className="summary-grid" aria-label="Dashboard 数据摘要"><SummaryCard label="已校验表格" value={String(extractionTables.length)} meta="当前文件版本" icon={<ShieldCheck size={18} />} tone="green" /><SummaryCard label="数据行" value={String(extractionTables.reduce((total, table) => total + table.rows.length, 0))} meta="不含模型生成数值" icon={<Database size={18} />} tone="neutral" /><SummaryCard label="待处理问题" value={String(openIssues.length)} meta={openIssues.length ? "发布仍受阻断" : "当前版本无阻断"} icon={<AlertTriangle size={18} />} tone="orange" /></section><div className="workspace-card explorer-card"><div className="card-heading"><div><div className="section-kicker">VALIDATED DATASET</div><h2>{extractionTables[0].detected_question_number || extractionTables[0].detected_table_title}</h2><p>Dashboard Draft 仅引用当前版本已通过 Python 校验的提取数据。</p></div></div><ExtractedTablePreview table={extractionTables[0]} /></div></div> : <div className="workspace-card empty-workflow"><div className="empty-icon"><CircleHelp size={23} /></div><h2>当前版本尚无可用 Dashboard 数据</h2><p>完成识别、Python 提取并通过 Review 后，才能创建可发布的 Dashboard Draft。</p></div>)}{activeView === "processing" && !processingJob && <div className="workspace-card empty-workflow"><div className="empty-icon"><CircleHelp size={23} /></div><h2>等待识别任务</h2><p>上传文件后，后台任务会在这里显示 Workbook 扫描和后续识别阶段。</p><button className="button secondary" onClick={() => setShowUpload(true)}><Upload size={15} />返回上传文件</button></div>}</section>;
}

function IssueRow({ number, title, detail, status, warning = false }: { number: string; title: string; detail: string; status: string; warning?: boolean }) {
  return <div className="issue-row"><span className={`issue-number ${warning ? "warning" : ""}`}>{number}</span><div><strong>{title}</strong><span>{detail}</span></div><span className={`issue-status ${warning ? "warning" : "success"}`}>{warning ? <AlertTriangle size={12} /> : <Check size={12} />}{status}</span></div>;
}
