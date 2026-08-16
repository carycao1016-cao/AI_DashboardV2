import { useMemo, useState } from "react";
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

type Status = "已验证" | "需 Review" | "处理中";

type TableRow = {
  label: string;
  total: string;
  male: string;
  maleSig: string;
  female: string;
  femaleSig: string;
  source: string;
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

const workflow = [
  { label: "项目概览", icon: LayoutDashboard, state: "complete" },
  { label: "文件与版本", icon: FileSpreadsheet, state: "complete" },
  { label: "识别进度", icon: Gauge, state: "in_progress" },
  { label: "Review Summary", icon: ShieldCheck, state: "warning" },
  { label: "Data Explorer", icon: Database, state: "complete" },
  { label: "Dashboard Draft", icon: BarChart3, state: "not_started" },
];

function StatusBadge({ status }: { status: Status }) {
  const icon = status === "已验证" ? <Check size={12} /> : status === "需 Review" ? <AlertTriangle size={12} /> : <Gauge size={12} />;
  return <span className={`status-badge status-${status === "已验证" ? "success" : status === "需 Review" ? "warning" : "info"}`}>{icon}{status}</span>;
}

export function App() {
  const [selectedSheet, setSelectedSheet] = useState("Percentages_Sig1");
  const [assistantOpen, setAssistantOpen] = useState(uiConfig.assistantDefaultOpen);
  const [language, setLanguage] = useState<"中文" | "English">("中文");
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showProjectCreate, setShowProjectCreate] = useState(false);
  const [projectName, setProjectName] = useState("Market Pulse");
  const [draftProjectName, setDraftProjectName] = useState("");
  const [draftMarket, setDraftMarket] = useState("US");
  const [draftWave, setDraftWave] = useState("Wave 1");

  const createProject = () => {
    const nextName = draftProjectName.trim();
    if (!nextName) return;
    setProjectName(nextName);
    setShowProjectCreate(false);
    setDraftProjectName("");
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
        <div className="project-switcher"><div className="project-avatar">{projectName.slice(0, 1).toUpperCase()}</div><div><strong>{projectName}</strong><span>{draftMarket} · {draftWave}</span></div><ChevronDown size={15} /></div>
        <button className="new-project-button" onClick={() => setShowProjectCreate(true)}><Plus size={15} /><span>新建项目</span></button>
        <nav className="workflow-nav">
          <div className="sidebar-label">工作流</div>
          {workflow.map(({ label, icon: Icon, state }) => (
            <button key={label} className={`nav-item ${label === "项目概览" ? "active" : ""}`}>
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
          <section className="page-header">
            <div><div className="eyebrow">CREATOR WORKSPACE · {projectName.toUpperCase()} / {draftMarket} / {draftWave.toUpperCase()}</div><h1>项目概览</h1><p>查看上传版本、表格识别状态和当前需要处理的结构问题。</p></div>
            <div className="page-actions"><button className="button secondary" onClick={() => setShowUpload(true)}><Upload size={16} />上传新版本</button><button className="button primary"><Sparkles size={16} />开始识别</button></div>
          </section>

          <section className="summary-grid" aria-label="项目摘要">
            <SummaryCard label="识别进度" value="86%" meta="23 / 27 张物理表" icon={<Gauge size={18} />} tone="yellow" />
            <SummaryCard label="已验证表格" value="24" meta="较上次 +6" icon={<ShieldCheck size={18} />} tone="green" />
            <SummaryCard label="待处理问题" value="3" meta="2 个结构 · 1 个映射" icon={<AlertTriangle size={18} />} tone="orange" />
            <SummaryCard label="数据版本" value="Wave 1" meta="最后更新 16:42" icon={<FileSpreadsheet size={18} />} tone="neutral" />
          </section>

          <section className="notice-strip"><div className="notice-icon"><AlertTriangle size={17} /></div><div><strong>发布暂不可用</strong><span>还有 3 个问题需要处理。可以继续浏览已验证的表格。</span></div><button className="text-button">打开 Review Summary <ArrowUpRight size={14} /></button></section>

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
        </div>
      </main>

      <button className={`assistant-capsule ${assistantOpen ? "is-open" : ""}`} onClick={() => setAssistantOpen(true)} aria-label="打开 AI 助手"><Sparkles size={16} /><span>AI 助手</span><i /></button>
      {assistantOpen && <aside className="assistant-drawer" aria-label="AI 助手"><div className="assistant-header"><div><span className="section-kicker">CREATOR AI ASSISTANT</span><h2>解析助手</h2></div><button className="icon-button dark" onClick={() => setAssistantOpen(false)} title="关闭 AI 助手"><X size={18} /></button></div><div className="assistant-body"><div className="assistant-status"><span className="pulse" /><div><strong>当前上下文</strong><span>{projectName} · {selectedSheet}</span></div></div><div className="message assistant-message"><div className="message-label"><Sparkles size={14} />AI 助手</div><p>我可以解释当前表格的结构、来源位置和显著性映射。任何修改都会先展示预览，不会直接写回源文件。</p><div className="suggestion-list"><button>解释这个表的 Header</button><button>查看显著性来源</button><button>为什么这个 Sheet 需要 Review？</button></div></div><div className="message system-message"><span className="message-label"><ShieldCheck size={14} />解析边界</span><p>当前页面展示的是已通过 Python 回读校验的结果。模型不参与数值生成。</p></div></div><div className="assistant-composer"><label htmlFor="assistant-input">向解析助手提问</label><div className="composer-box"><input id="assistant-input" placeholder="例如：这个 C 标记对应哪个表头？" /><button className="send-button" title="发送"><ArrowUpRight size={17} /></button></div><span>仅限当前项目上下文 · 不会自动修改数据</span></div></aside>}

      {showUpload && <div className="modal-backdrop" role="presentation"><div className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">SOURCE FILE VERSION</span><h2 id="upload-title">上传新版本</h2></div><button className="icon-button" onClick={() => setShowUpload(false)} title="关闭"><X size={18} /></button></div><div className="drop-zone"><Upload size={24} /><strong>拖入 Excel 或 CSV 文件</strong><span>本地演示模式：文件不会上传到服务器</span><button className="button secondary"><FolderOpen size={15} />选择文件</button></div><div className="modal-foot"><span><ShieldCheck size={14} />服务端将负责 MIME、扩展名和工作簿结构校验</span><button className="button primary" onClick={() => setShowUpload(false)}>完成</button></div></div></div>}
      {showProjectCreate && <div className="modal-backdrop" role="presentation"><div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title"><div className="modal-topline" /><div className="modal-heading"><div><span className="section-kicker">PROJECT SETUP</span><h2 id="project-title">新建项目</h2><p>先建立项目上下文，再上传一个或多个源文件版本。</p></div><button className="icon-button" onClick={() => setShowProjectCreate(false)} title="关闭"><X size={18} /></button></div><div className="form-grid"><label>项目名称<input value={draftProjectName} onChange={(event) => setDraftProjectName(event.target.value)} placeholder="例如：Brand Tracker" autoFocus /></label><label>市场<select value={draftMarket} onChange={(event) => setDraftMarket(event.target.value)}><option>US</option><option>CN</option><option>UK</option><option>Global</option></select></label><label>数据波次<select value={draftWave} onChange={(event) => setDraftWave(event.target.value)}><option>Wave 1</option><option>Wave 2</option><option>Tracking</option></select></label></div><div className="modal-foot"><span><ShieldCheck size={14} />项目创建后仍可在设置中调整上下文</span><div className="modal-actions"><button className="button secondary" onClick={() => setShowProjectCreate(false)}>取消</button><button className="button primary" onClick={createProject} disabled={!draftProjectName.trim()}><Plus size={15} />创建项目</button></div></div></div></div>}
    </div>
  );
}

function SummaryCard({ label, value, meta, icon, tone }: { label: string; value: string; meta: string; icon: React.ReactNode; tone: string }) {
  return <div className={`summary-card tone-${tone}`}><div className="summary-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>;
}

function IssueRow({ number, title, detail, status, warning = false }: { number: string; title: string; detail: string; status: string; warning?: boolean }) {
  return <div className="issue-row"><span className={`issue-number ${warning ? "warning" : ""}`}>{number}</span><div><strong>{title}</strong><span>{detail}</span></div><span className={`issue-status ${warning ? "warning" : "success"}`}>{warning ? <AlertTriangle size={12} /> : <Check size={12} />}{status}</span></div>;
}
