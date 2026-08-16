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
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { uiConfig } from "./config";

type Status = "已验证" | "需 Review" | "处理中" | "已扫描";
type WorkflowView = "overview" | "versions" | "processing" | "review" | "explorer" | "dashboard";

type TableRow = {
  label: string;
  total: string;
  male: string;
  maleSig: string;
  female: string;
  femaleSig: string;
  source: string;
};

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

type ProcessingJob = {
  job_id: string;
  source_file_version_id: string;
  status: "queued" | "running" | "completed" | "failed";
  phase: string;
  progress_percent: number;
  error_message: string | null;
};

const tableRows: TableRow[] = [
  { label: "男", total: "43.9%", male: "100.0%", maleSig: "C", female: "0.0%", femaleSig: "", source: "D17" },
  { label: "女", total: "56.1%", male: "0.0%", maleSig: "", female: "100.0%", femaleSig: "B", source: "D18" },
  { label: "Base", total: "1,000", male: "439", maleSig: "", female: "561", femaleSig: "", source: "B16" },
];

const sheets = [
  { name: "Percentages_Sig1", family: "Decipher", tables: 3, status: "已验证" as Status, range: "A12:AW18" },
  { name: "ban1_%Sig", family: "Quantum", tables: 3, status: "已验证" as Status, range: "A2:AB77" },
  { name: "ban2_%Sig", family: "Quantum", tables: 3, status: "需 Review" as Status, range: "A80:AB609" },
  { name: "Index", family: "Decipher", tables: 0, status: "已验证" as Status, range: "not_a_table" },
];

const initialFileVersions: FileVersion[] = [
  { id: "sfv_002", fileName: "Market_Pulse_US_Wave1.xlsx", market: "US", wave: "Wave 1", status: "已验证", relation: "当前版本" },
  { id: "sfv_001", fileName: "Market_Pulse_US_Wave1_original.xlsx", market: "US", wave: "Wave 1", status: "已验证", relation: "历史版本" },
];

const workflow = [
  { id: "overview" as WorkflowView, label: "项目概览", icon: LayoutDashboard, state: "complete" },
  { id: "versions" as WorkflowView, label: "文件与版本", icon: FileSpreadsheet, state: "complete" },
  { id: "processing" as WorkflowView, label: "识别进度", icon: Gauge, state: "in_progress" },
  { id: "review" as WorkflowView, label: "Review Summary", icon: ShieldCheck, state: "warning" },
  { id: "explorer" as WorkflowView, label: "Data Explorer", icon: Database, state: "complete" },
  { id: "dashboard" as WorkflowView, label: "Dashboard Draft", icon: BarChart3, state: "not_started" },
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
  const [projectName, setProjectName] = useState("Market Pulse");
  const [projectId, setProjectId] = useState("prj_market-pulse");
  const [draftProjectName, setDraftProjectName] = useState("");
  const [projectError, setProjectError] = useState("");
  const [marketScope, setMarketScope] = useState("US");
  const [waveScope, setWaveScope] = useState("Wave 1");
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
  const [fileVersions, setFileVersions] = useState<FileVersion[]>(initialFileVersions);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [activeView, setActiveView] = useState<WorkflowView>("overview");

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

  const loadProject = async (id: string) => {
    const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}`);
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.detail || "读取项目失败");
    applyProject(payload.data as ApiProject);
  };

  useEffect(() => {
    if (bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;
    void loadProject("prj_market-pulse").catch(async (error: Error) => {
      if (!error.message.includes("项目不存在")) return;
      try {
        const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_name: "Market Pulse" }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.detail || "创建默认项目失败");
        applyProject({ ...(payload.data as Omit<ApiProject, "source_file_versions">), source_file_versions: [] });
      } catch (createError) {
        setProjectError(createError instanceof Error ? createError.message : "无法连接本地后端");
      }
    });
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
      setMarketScope("范围未设置");
      setWaveScope("波次未设置");
      setShowProjectCreate(false);
      setDraftProjectName("");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "创建项目失败");
    }
  };

  const pollProcessingJob = async (id: string, jobId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await fetch(`${uiConfig.parserApiBaseUrl}/api/projects/${id}/jobs/${jobId}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.detail || "读取识别任务失败");
      const job = payload.data as ProcessingJob;
      setProcessingJob(job);
      await loadProject(id);
      if (job.status === "completed" || job.status === "failed") {
        if (job.status === "failed") setProjectError(job.error_message || "Workbook 扫描失败");
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    setProjectError("识别任务仍在后台处理，请稍后查看识别进度");
  };

  const completeUpload = async () => {
    if (!selectedFile) return;
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
      await loadProject(projectId);
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
    () => sheets.filter((sheet) => `${sheet.name} ${sheet.family}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

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
        <div className="project-switcher"><div className="project-avatar">{projectName.slice(0, 1).toUpperCase()}</div><div><strong>{projectName}</strong><span>{marketScope} · {waveScope}</span></div><ChevronDown size={15} /></div>
        <button className="new-project-button" onClick={() => setShowProjectCreate(true)}><Plus size={15} /><span>新建项目</span></button>
        <nav className="workflow-nav">
          <div className="sidebar-label">工作流</div>
          {workflow.map(({ id, label, icon: Icon, state }) => (
            <button key={label} className={`nav-item ${activeView === id ? "active" : ""}`} onClick={() => setActiveView(id)}>
              <Icon size={17} /><span>{label}</span>{state === "warning" && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item"><Settings2 size={17} /><span>项目设置</span></button>
          <div className="user-row"><div className="user-avatar">CC</div><div><strong>Cary Cao</strong><span>Creator</span></div><MoreHorizontal size={16} /></div>
          <span className="version">Parser PoC · v0.1</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>项目</span><span>/</span><strong>{projectName}</strong></div>
          <div className="topbar-actions"><span className="saved-state"><Check size={14} />已保存</span><button className="icon-button" title="帮助"><CircleHelp size={18} /></button><button className="avatar-button">CC</button></div>
        </header>
        <div className="workspace-scroll">
          {activeView === "overview" ? <>
          <section className="page-header">
            <div><div className="eyebrow">CREATOR WORKSPACE · {projectName.toUpperCase()} / {marketScope.toUpperCase()} / {waveScope.toUpperCase()}</div><h1>项目概览</h1><p>查看上传版本、表格识别状态和当前需要处理的结构问题。</p></div>
            <div className="page-actions"><button className="button secondary" onClick={() => setShowUpload(true)}><Upload size={16} />上传新版本</button><button className="button primary"><Sparkles size={16} />开始识别</button></div>
          </section>

          <section className="summary-grid" aria-label="项目摘要">
            <SummaryCard label="识别进度" value="86%" meta="23 / 27 张物理表" icon={<Gauge size={18} />} tone="yellow" />
            <SummaryCard label="已验证表格" value="24" meta="较上次 +6" icon={<ShieldCheck size={18} />} tone="green" />
            <SummaryCard label="待处理问题" value="3" meta="2 个结构 · 1 个映射" icon={<AlertTriangle size={18} />} tone="orange" />
            <SummaryCard label="数据版本" value="Wave 1" meta="最后更新 16:42" icon={<FileSpreadsheet size={18} />} tone="neutral" />
          </section>

          <section className="notice-strip"><div className="notice-icon"><AlertTriangle size={17} /></div><div><strong>发布暂不可用</strong><span>还有 3 个问题需要处理。可以继续浏览已验证的表格。</span></div><button className="text-button">打开 Review Summary <ArrowUpRight size={14} /></button></section>

          <section className="workspace-card versions-card">
            <div className="card-heading"><div><div className="section-kicker">SOURCE FILE VERSIONS</div><h2>文件与版本</h2><p>新增文件和修正版分开处理；历史版本始终保留。</p></div><div className="version-actions"><button className="button secondary" onClick={() => { setUploadMode("append"); setShowUpload(true); }}><Plus size={15} />追加文件</button><button className="button secondary" onClick={() => { setUploadMode("replace"); setShowUpload(true); }}><Upload size={15} />替换版本</button></div></div>
            <div className="version-list">{fileVersions.map((version, index) => <div className="version-row" key={version.id}><span className="version-number">{index === 0 ? "当前" : version.id.replace("sfv_", "v")}</span><div className="version-file"><FileSpreadsheet size={15} /><strong>{version.fileName}</strong></div><span>{version.market}</span><span>{version.wave}</span><span className="version-relation">{version.relation}</span><StatusBadge status={version.status} /><button className="icon-button" title="版本详情"><ArrowUpRight size={15} /></button></div>)}</div>
          </section>

          <section className="content-grid">
            <div className="workspace-card source-card">
              <div className="card-heading"><div><div className="section-kicker">SOURCE INVENTORY</div><h2>Sheet 与物理表</h2><p>按 Sheet 保存源位置；空 Sheet 或 Index 不会被强行识别为表。</p></div><button className="icon-button" title="更多筛选"><Filter size={17} /></button></div>
              <div className="table-toolbar"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Sheet 或来源类型" /></label><button className="filter-button">全部状态 <ChevronDown size={14} /></button></div>
              <div className="sheet-table" role="table" aria-label="Sheet 列表"><div className="sheet-row sheet-head" role="row"><span>Sheet / 类型</span><span>物理表</span><span>范围</span><span>状态</span><span /></div>{filteredSheets.map((sheet) => <button key={sheet.name} className={`sheet-row ${selectedSheet === sheet.name ? "selected" : ""}`} onClick={() => setSelectedSheet(sheet.name)}><span className="sheet-name"><FileSpreadsheet size={16} /><span><strong>{sheet.name}</strong><small>{sheet.family}</small></span></span><span>{sheet.tables || "—"}</span><span className="mono-cell">{sheet.range}</span><span><StatusBadge status={sheet.status} /></span><ArrowUpRight size={15} /></button>)}</div>
              <div className="card-footer"><span>共 4 个 Sheet · 9 张物理表已载入演示数据</span><button className="text-button">查看全部 <ArrowUpRight size={14} /></button></div>
            </div>

            <div className="workspace-card review-card">
              <div className="card-heading"><div><div className="section-kicker">REVIEW SUMMARY</div><h2>需要注意的结构</h2><p>风险行保留在 Review 中，不会静默丢弃。</p></div><button className="icon-button" title="打开 Review"><ArrowUpRight size={17} /></button></div>
              <div className="issue-list"><IssueRow number="01" title="Sigma 行被重新归类" detail="ban1_%Sig · A77 · 脚注" status="已自动修正" /><IssueRow number="02" title="缺少明确 Base" detail="ban2_%Sig · A80:AB609" status="需确认" warning /><IssueRow number="03" title="CSV 编码置信度较低" detail="tracking.csv · GB18030" status="需确认" warning /></div>
              <button className="review-cta">打开 Review Summary <ArrowUpRight size={15} /></button>
            </div>
          </section>

          <section className="workspace-card explorer-card">
            <div className="card-heading"><div><div className="section-kicker">DATA EXPLORER · {selectedSheet.toUpperCase()}</div><h2>已验证表格预览</h2><p>展示值来自 Excel display value；解析值保留原始精度和 Source Lineage。</p></div><div className="preview-actions"><button className="button secondary"><BookOpen size={15} />原始来源</button><button className="button secondary"><PanelRight size={15} />识别详情</button></div></div>
            <div className="table-meta"><span className="table-title-mark" /><div><strong>S1：请问您的性别是？</strong><span>Percentages_Sig1 · A12:AW18 · percentage</span></div><StatusBadge status="已验证" /><span className="meta-spacer" /><span className="lineage"><Database size={14} /> 来源坐标已保留</span></div>
            <div className="data-preview" role="table" aria-label="表格预览"><div className="data-row data-head"><span>选项</span><span>Total (A)</span><span>Male (B)</span><span>Female (C)</span><span>来源</span></div>{tableRows.map((row) => <div className="data-row" key={row.label}><strong>{row.label}</strong><span>{row.total}</span><span>{row.male} {row.maleSig && <em className="sig-marker">{row.maleSig}</em>}</span><span>{row.female} {row.femaleSig && <em className="sig-marker">{row.femaleSig}</em>}</span><span className="mono-cell source-cell">{row.source}</span></div>)}</div>
            <div className="table-note"><span><ShieldCheck size={14} />Python 已从源文件回读；AI 只提供结构建议</span><span><span className="legend-dot" />`-`、0 和不可用值保持区分</span></div>
          </section>
          </> : <WorkflowPanel activeView={activeView} fileVersions={fileVersions} processingJob={processingJob} setShowUpload={setShowUpload} selectedSheet={selectedSheet} setSelectedSheet={setSelectedSheet} />}
        </div>
      </main>

      <button className={`assistant-capsule ${assistantOpen ? "is-open" : ""}`} onClick={() => setAssistantOpen(true)} aria-label="打开 AI 助手"><Sparkles size={16} /><span>AI 助手</span><i /></button>
      {assistantOpen && <aside className="assistant-drawer" aria-label="AI 助手"><div className="assistant-header"><div><span className="section-kicker">CREATOR AI ASSISTANT</span><h2>解析助手</h2></div><button className="icon-button dark" onClick={() => setAssistantOpen(false)} title="关闭 AI 助手"><X size={18} /></button></div><div className="assistant-body"><div className="assistant-status"><span className="pulse" /><div><strong>当前上下文</strong><span>{projectName} · {selectedSheet}</span></div></div><div className="message assistant-message"><div className="message-label"><Sparkles size={14} />AI 助手</div><p>我可以解释当前表格的结构、来源位置和显著性映射。任何修改都会先展示预览，不会直接写回源文件。</p><div className="suggestion-list"><button>解释这个表的 Header</button><button>查看显著性来源</button><button>为什么这个 Sheet 需要 Review？</button></div></div><div className="message system-message"><span className="message-label"><ShieldCheck size={14} />解析边界</span><p>当前页面展示的是已通过 Python 回读校验的结果。模型不参与数值生成。</p></div></div><div className="assistant-composer"><label htmlFor="assistant-input">向解析助手提问</label><div className="composer-box"><input id="assistant-input" placeholder="例如：这个 C 标记对应哪个表头？" /><button className="send-button" title="发送"><ArrowUpRight size={17} /></button></div><span>仅限当前项目上下文 · 不会自动修改数据</span></div></aside>}

      {showUpload && <div className="modal-backdrop" role="presentation"><div className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">SOURCE FILE VERSION</span><h2 id="upload-title">{uploadMode === "replace" ? "替换已有版本" : "追加新文件"}</h2><p>{uploadMode === "replace" ? "用于同一市场和 Wave 的修正版；原版本会保留为历史记录。" : "用于新增市场、Wave 或补充文件；现有版本不会被覆盖。"}</p></div><button className="icon-button" onClick={() => setShowUpload(false)} title="关闭"><X size={18} /></button></div><div className={`drop-zone ${selectedFileName ? "has-file" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}><Upload size={24} /><strong>{selectedFileName || "拖入 XLSX 或 CSV 文件"}</strong><span>{selectedFileName ? "文件已选择，完成后会由 Python 扫描" : "本地 API 会保存文件并进行 Python Workbook 扫描"}</span><input ref={fileInputRef} className="file-input" type="file" accept=".xlsx,.csv" onChange={(event) => acceptFile(event.target.files?.[0])} /><button className="button secondary" onClick={() => fileInputRef.current?.click()}><FolderOpen size={15} />选择文件</button></div>{uploadError && <div className="upload-error"><AlertTriangle size={14} />{uploadError}</div>}{uploadMode === "replace" && <label className="replace-select">要替换的历史版本<select value={replaceVersionId} onChange={(event) => setReplaceVersionId(event.target.value)}>{fileVersions.map((version) => <option key={version.id} value={version.id}>{version.id} · {version.fileName}</option>)}</select></label>}<div className="form-grid upload-context-grid"><label>市场来源<select value={uploadMarket} onChange={(event) => setUploadMarket(event.target.value)}><option>自动识别（推荐）</option><option>Global（总体）</option><option>多市场</option><option>已知单一市场</option></select></label><label>Wave 来源<select value={uploadWave} onChange={(event) => setUploadWave(event.target.value)}><option>自动识别（推荐）</option><option>文件信息提供</option><option>表头中识别</option><option>文件级与表级混合</option><option>未知，上传后 Review</option></select></label></div>{uploadMarket === "自动识别（推荐）" && <label className="optional-hint">已知市场提示（可选）<input value={uploadMarketHint} onChange={(event) => setUploadMarketHint(event.target.value)} placeholder="例如 US、APAC；不需要列出全部市场" /></label>}<div className="upload-hint"><BookOpen size={14} /><span>Python 会先读取文件名、Sheet、表头和表内上下文。只有无法确认、互相冲突或按表不一致时，才进入 Review。</span></div><div className="modal-foot"><span><ShieldCheck size={14} />最终市场和 Wave 以源文件证据为准</span><button className="button primary" onClick={completeUpload} disabled={!selectedFile || uploadSubmitting}>{uploadSubmitting ? "扫描中" : "完成"}</button></div></div></div>}
      {showProjectCreate && <div className="modal-backdrop" role="presentation"><div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">PROJECT SETUP</span><h2 id="project-title">新建项目</h2><p>项目只保存研究上下文。市场范围和 Wave 可在文件版本或表头中识别。</p></div><button className="icon-button" onClick={() => setShowProjectCreate(false)} title="关闭"><X size={18} /></button></div><div className="form-grid"><label>项目名称<input value={draftProjectName} onChange={(event) => setDraftProjectName(event.target.value)} placeholder="例如：Brand Tracker" autoFocus /></label></div>{projectError && <div className="upload-error"><AlertTriangle size={14} />{projectError}</div>}<div className="modal-foot"><span><ShieldCheck size={14} />创建后可上传多个市场和多个 Wave 的文件版本</span><div className="modal-actions"><button className="button secondary" onClick={() => setShowProjectCreate(false)}>取消</button><button className="button primary" onClick={createProject} disabled={!draftProjectName.trim()}><Plus size={15} />创建项目</button></div></div></div></div>}
    </div>
  );
}

function SummaryCard({ label, value, meta, icon, tone }: { label: string; value: string; meta: string; icon: React.ReactNode; tone: string }) {
  return <div className={`summary-card tone-${tone}`}><div className="summary-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>;
}

function WorkflowPanel({ activeView, fileVersions, processingJob, setShowUpload, selectedSheet, setSelectedSheet }: { activeView: Exclude<WorkflowView, "overview">; fileVersions: FileVersion[]; processingJob: ProcessingJob | null; setShowUpload: (open: boolean) => void; selectedSheet: string; setSelectedSheet: (sheet: string) => void }) {
  const panelCopy: Record<Exclude<WorkflowView, "overview">, { kicker: string; title: string; description: string }> = {
    versions: { kicker: "SOURCE FILE VERSIONS", title: "文件与版本", description: "管理追加文件和同一逻辑数据集的修正版，历史来源不会被覆盖。" },
    processing: { kicker: "PROCESSING STATUS", title: "识别进度", description: "当前没有正在运行的识别任务；启动真实任务后，这里显示阶段和后台处理状态。" },
    review: { kicker: "REVIEW SUMMARY", title: "Review Summary", description: "问题按风险分级展示；未确认的范围、Wave 或结构分类不会静默发布。" },
    explorer: { kicker: "DATA EXPLORER", title: "Data Explorer", description: "按 Sheet、物理表和来源坐标浏览已通过 Python 回读的结果。" },
    dashboard: { kicker: "DASHBOARD DRAFT", title: "Dashboard Draft", description: "Dashboard Builder 将在语义模型和发布门禁接入后启用。" },
  };
  const copy = panelCopy[activeView];
  return <section className="standalone-view"><div className="page-header"><div><div className="eyebrow">{copy.kicker} · CREATOR WORKSPACE</div><h1>{copy.title}</h1><p>{copy.description}</p></div>{activeView === "versions" && <button className="button primary" onClick={() => setShowUpload(true)}><Plus size={16} />追加文件</button>}</div>{activeView === "versions" && <div className="workspace-card standalone-card"><div className="version-list">{fileVersions.map((version, index) => <div className="version-row" key={version.id}><span className="version-number">{index === 0 ? "当前" : version.id.replace("sfv_", "v")}</span><div className="version-file"><FileSpreadsheet size={15} /><strong>{version.fileName}</strong></div><span>{version.market}</span><span>{version.wave}</span><span className="version-relation">{version.relation}</span><StatusBadge status={version.status} /><button className="icon-button" title="版本详情"><ArrowUpRight size={15} /></button></div>)}</div></div>}{activeView === "processing" && processingJob && <div className="workspace-card processing-card"><div className="section-kicker">BACKGROUND JOB · {processingJob.job_id}</div><h2>{processingJob.status === "completed" ? "识别任务已完成" : processingJob.status === "failed" ? "识别任务失败" : "识别任务处理中"}</h2><p>{processingJob.phase}。前端轮询不会把后台任务提前标记为失败。</p><div className="processing-progress"><div style={{ width: `${processingJob.progress_percent}%` }} /></div><div className="processing-meta"><span>{processingJob.progress_percent}%</span><span>{processingJob.source_file_version_id}</span></div>{processingJob.error_message && <div className="upload-error"><AlertTriangle size={14} />{processingJob.error_message}</div>}</div>}{activeView === "review" && <div className="review-detail-grid"><div className="workspace-card standalone-card"><div className="card-heading"><div><div className="section-kicker">OPEN ISSUES</div><h2>待处理问题</h2></div><span className="status-badge status-warning"><AlertTriangle size={12} />3 个待确认</span></div><div className="issue-list"><IssueRow number="01" title="Sigma 行被重新归类" detail="ban1_%Sig · A77 · 脚注" status="已自动修正" /><IssueRow number="02" title="缺少明确 Base" detail="ban2_%Sig · A80:AB609" status="需确认" warning /><IssueRow number="03" title="CSV 编码置信度较低" detail="tracking.csv · GB18030" status="需确认" warning /></div></div><div className="workspace-card risk-explanation"><div className="section-kicker">PUBLICATION GATE</div><h2>发布暂不可用</h2><p>有 3 个风险项未完成确认。修正会保留源坐标和审计记录。</p><button className="button secondary">查看发布门禁 <ArrowUpRight size={15} /></button></div></div>}{activeView === "explorer" && <div className="workspace-card standalone-card"><div className="table-toolbar"><label className="search-box"><Search size={16} /><input placeholder="搜索 Sheet 或来源类型" /></label><button className="filter-button">全部状态 <ChevronDown size={14} /></button></div><div className="sheet-table" role="table" aria-label="Data Explorer Sheet 列表">{sheets.map((sheet) => <button key={sheet.name} className={`sheet-row ${selectedSheet === sheet.name ? "selected" : ""}`} onClick={() => setSelectedSheet(sheet.name)}><span className="sheet-name"><FileSpreadsheet size={16} /><span><strong>{sheet.name}</strong><small>{sheet.family}</small></span></span><span>{sheet.tables || "—"}</span><span className="mono-cell">{sheet.range}</span><span><StatusBadge status={sheet.status} /></span><ArrowUpRight size={15} /></button>)}</div><div className="table-note"><span><Database size={14} />选中 {selectedSheet} 后可进入表格预览</span><span>Source Lineage 已保留</span></div></div>}{activeView === "dashboard" && <div className="workspace-card empty-workflow"><div className="empty-icon"><CircleHelp size={23} /></div><h2>Dashboard Draft 尚未启用</h2><p>完成表格识别、Review 和语义绑定后，才能安全创建可发布的 Dashboard Draft。</p></div>}{activeView === "processing" && !processingJob && <div className="workspace-card empty-workflow"><div className="empty-icon"><CircleHelp size={23} /></div><h2>等待识别任务</h2><p>上传文件后，后台任务会在这里显示 Workbook 扫描和后续识别阶段。</p><button className="button secondary" onClick={() => setShowUpload(true)}><Upload size={15} />返回上传文件</button></div>}</section>;
}

function IssueRow({ number, title, detail, status, warning = false }: { number: string; title: string; detail: string; status: string; warning?: boolean }) {
  return <div className="issue-row"><span className={`issue-number ${warning ? "warning" : ""}`}>{number}</span><div><strong>{title}</strong><span>{detail}</span></div><span className={`issue-status ${warning ? "warning" : "success"}`}>{warning ? <AlertTriangle size={12} /> : <Check size={12} />}{status}</span></div>;
}
