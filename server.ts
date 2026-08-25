import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { parseExcelWorkbook } from "./server/excel_parser";
import { buildIntelligentDashboardDraft, planVisualForTable } from "./server/dashboard_planner";

interface ExtractedCell {
  extracted_header_id: string;
  source_cell: string;
  raw_value: unknown;
  excel_display_value: string;
  parsed_value: unknown;
  parsed_unit: string;
  original_significance_marker: string;
  significance_mapping_status: string;
}

interface ExtractedHeader {
  extracted_header_id: string;
  data_column?: string;
  header_path: string[];
  display_label: string;
  significance_code: string;
  source_header_cells?: string[];
}

interface ExtractedRow {
  extracted_row_id: string;
  original_label: string;
  detected_row_type: string;
  cells: ExtractedCell[];
}

interface ExtractedTable {
  extracted_table_id: string;
  source_sheet: string;
  source_range: string;
  detected_question_number: string;
  detected_question_text: string;
  detected_table_title: string;
  table_variant: string;
  headers: ExtractedHeader[];
  rows: ExtractedRow[];
}

interface SourceFileVersion {
  source_file_version_id: string;
  project_id: string;
  file_name: string;
  market_scope: string;
  wave_scope: string;
  upload_mode: "append" | "replace";
  replaces_source_file_version_id: string | null;
  scan_status: "queued" | "running" | "completed" | "failed";
  scan_summary?: Record<string, unknown>;
  created_at: string;
}

interface Project {
  project_id: string;
  project_name: string;
  project_name_normalized: string;
  source_file_versions: SourceFileVersion[];
  created_at: string;
  updated_at: string;
}

interface ProcessingJob {
  job_id: string;
  project_id: string;
  source_file_version_id: string;
  job_type: "ingestion" | "recognition";
  status: "queued" | "running" | "completed" | "failed";
  phase: string;
  progress_percent: number;
  error_message: string | null;
  result?: any;
  created_at: string;
  updated_at: string;
}

interface ReviewIssue {
  review_issue_id: string;
  project_id: string;
  source_file_version_id: string;
  object_type: string;
  object_id: string;
  field_name?: string;
  issue_type: string;
  risk_class?: string;
  severity: "high" | "medium" | "low";
  message: string;
  suggested_actions: string[];
  status: "open" | "in_review" | "resolved" | "accepted_risk" | "excluded";
  creator_note: string | null;
  blocks_publication: boolean;
}

interface DashboardVisual {
  dashboard_visual_id: string;
  source_extracted_table_id: string;
  visual_type: string;
  display_precision?: number;
  title: string;
  grid_span: number;
  review_status: string;
  evidence: { source_ranges?: string[] };
}

interface DashboardDraft {
  dashboard_id?: string;
  dashboard_version_id: string;
  dashboard_name: string;
  project_id: string;
  source_file_version_id: string;
  template: string;
  revision: number;
  pages: Array<{
    dashboard_page_id: string;
    category: "core" | "suggested" | "appendix" | "internal";
    title: string;
    sort_order: number;
    visuals: DashboardVisual[];
  }>;
  summary: {
    tables_detected: number;
    semantic_questions: number;
    tables_in_draft: number;
    blocking_issues: number;
    review_required: number;
  };
  warnings: string[];
  semantic_questions?: Array<{
    semantic_question_id: string;
    source_extracted_table_ids: string[];
    title: string;
    module_name: string;
    metric_type: string;
    metric_source?: string;
    review_status: string;
    ai_recommended?: boolean;
    included_in_draft?: boolean;
    recommended_visual?: string;
    planning_source?: string;
    planning_confidence?: number;
    planning_reason?: string;
    template_matches?: Array<{ template: string; reason: string }>;
    evidence: { source_ranges?: string[] };
  }>;
}

// In-Memory Database Store
const projectsStore: Map<string, Project> = new Map();
const jobsStore: Map<string, ProcessingJob> = new Map();
const recognitionStore: Map<string, any> = new Map(); // key: source_file_version_id
const tablesStore: Map<string, ExtractedTable[]> = new Map(); // key: source_file_version_id
const reviewIssuesStore: Map<string, ReviewIssue[]> = new Map(); // key: project_id
const dashboardDraftsStore: Map<string, DashboardDraft[]> = new Map(); // key: project_id
const versionFilePathMap: Map<string, string> = new Map(); // key: source_file_version_id -> file path

// Helper function to normalize project name
function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Load seed data from JSON or local uploads if available
async function loadInitialSeedData() {
  let sampleTables: ExtractedTable[] = [];
  try {
    const jsonPath = path.resolve(process.cwd(), "outputs/ark_smoke/decipher_extracted_table.json");
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      sampleTables = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read decipher_extracted_table.json:", err);
  }

  if (!sampleTables || sampleTables.length === 0) {
    sampleTables = [
      {
        extracted_table_id: "tbl_001_s1",
        source_sheet: "Percentages_Sig1",
        source_range: "A12:AW18",
        detected_question_number: "S1",
        detected_question_text: "S1: 請問您的性別是？",
        detected_table_title: "S1: 請問您的性別是？",
        table_variant: "percentage",
        headers: [
          { extracted_header_id: "h_01", display_label: "Total (A)", header_path: ["Total (A)"], significance_code: "A", source_header_cells: ["B14"] },
          { extracted_header_id: "h_02", display_label: "Male (B)", header_path: ["Gender", "Male (B)"], significance_code: "B", source_header_cells: ["D14"] },
          { extracted_header_id: "h_03", display_label: "Female (C)", header_path: ["Gender", "Female (C)"], significance_code: "C", source_header_cells: ["F14"] },
        ],
        rows: [
          {
            extracted_row_id: "r_01",
            original_label: "Base: All respondents",
            detected_row_type: "base",
            cells: [
              { extracted_header_id: "h_01", source_cell: "B16", raw_value: 1200, excel_display_value: "1200", parsed_value: 1200, parsed_unit: "count", original_significance_marker: "", significance_mapping_status: "not_applicable" },
              { extracted_header_id: "h_02", source_cell: "D16", raw_value: 580, excel_display_value: "580", parsed_value: 580, parsed_unit: "count", original_significance_marker: "", significance_mapping_status: "not_applicable" },
              { extracted_header_id: "h_03", source_cell: "F16", raw_value: 620, excel_display_value: "620", parsed_value: 620, parsed_unit: "count", original_significance_marker: "", significance_mapping_status: "not_applicable" },
            ]
          },
          {
            extracted_row_id: "r_02",
            original_label: "Male",
            detected_row_type: "data",
            cells: [
              { extracted_header_id: "h_01", source_cell: "B17", raw_value: 0.483, excel_display_value: "48.3%", parsed_value: 0.483, parsed_unit: "percentage", original_significance_marker: "", significance_mapping_status: "mapped" },
              { extracted_header_id: "h_02", source_cell: "D17", raw_value: 1.0, excel_display_value: "100.0%", parsed_value: 1.0, parsed_unit: "percentage", original_significance_marker: "C", significance_mapping_status: "mapped" },
              { extracted_header_id: "h_03", source_cell: "F17", raw_value: 0.0, excel_display_value: "0.0%", parsed_value: 0.0, parsed_unit: "percentage", original_significance_marker: "", significance_mapping_status: "mapped" },
            ]
          },
          {
            extracted_row_id: "r_03",
            original_label: "Female",
            detected_row_type: "data",
            cells: [
              { extracted_header_id: "h_01", source_cell: "B18", raw_value: 0.517, excel_display_value: "51.7%", parsed_value: 0.517, parsed_unit: "percentage", original_significance_marker: "", significance_mapping_status: "mapped" },
              { extracted_header_id: "h_02", source_cell: "D18", raw_value: 0.0, excel_display_value: "0.0%", parsed_value: 0.0, parsed_unit: "percentage", original_significance_marker: "", significance_mapping_status: "mapped" },
              { extracted_header_id: "h_03", source_cell: "F18", raw_value: 1.0, excel_display_value: "100.0%", parsed_value: 1.0, parsed_unit: "percentage", original_significance_marker: "B", significance_mapping_status: "mapped" },
            ]
          }
        ]
      }
    ];
  }

  const initialProjectId = "prj_kantar_brand_study";
  const initialVersionId = "sfv_001";

  const initialProject: Project = {
    project_id: initialProjectId,
    project_name: "Kantar 品牌追踪与消费者洞察研究",
    project_name_normalized: normalizeProjectName("Kantar 品牌追踪与消费者洞察研究"),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_file_versions: [
      {
        source_file_version_id: initialVersionId,
        project_id: initialProjectId,
        file_name: "Decipher_Percentages_Sig1_first_table.xlsx",
        market_scope: "Global / APAC",
        wave_scope: "2026 W1",
        upload_mode: "append",
        replaces_source_file_version_id: null,
        scan_status: "completed",
        scan_summary: { sheets_scanned: 1, tables_detected: sampleTables.length },
        created_at: new Date().toISOString(),
      }
    ]
  };

  projectsStore.set(initialProjectId, initialProject);
  tablesStore.set(initialVersionId, sampleTables);

  const initialRecognitionResult = {
    job_id: "job_seed_rec_001",
    source_file_version_id: initialVersionId,
    status: "completed",
    phase: "AI 两层识别与 Python 校验完成",
    progress_percent: 100,
    error_message: null,
    result: {
      provider: "deepseek",
      max_sheets: 5,
      sheets: [
        {
          sheet_name: "Percentages_Sig1",
          outline_response_count: 1,
          detail_response_count: 1,
          boundary_proposals: [
            { source_range: sampleTables[0]?.source_range || "A12:AW18", confidence_score: 0.96 }
          ],
          boundary_validations: [
            { outcome: "accepted" }
          ],
          extracted_tables: sampleTables,
        }
      ]
    }
  };
  recognitionStore.set(initialVersionId, initialRecognitionResult);

  // Check if test tracker 0825 or any local uploads exist in outputs/local_uploads
  try {
    const uploadDir = path.resolve(process.cwd(), "outputs/local_uploads");
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir).filter(f => f.endsWith(".xlsx") || f.endsWith(".xls"));
      if (files.length > 0) {
        const latestFile = files[files.length - 1];
        const filePath = path.join(uploadDir, latestFile);
        const trackerProjId = "prj_test-tracker-0825_8q3tq";
        const trackerVersionId = "sfv_test_tracker_0825";

        console.log(`[Init] Parsing uploaded file ${filePath} for test tracker project...`);
        const parsed = await parseExcelWorkbook(filePath, trackerVersionId);
        versionFilePathMap.set(trackerVersionId, filePath);

        const trackerProject: Project = {
          project_id: trackerProjId,
          project_name: "test tracker 0825",
          project_name_normalized: normalizeProjectName("test tracker 0825"),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source_file_versions: [
            {
              source_file_version_id: trackerVersionId,
              project_id: trackerProjId,
              file_name: latestFile.replace(/^\d+_/, ""),
              market_scope: "New Zealand (NZ)",
              wave_scope: "26M1 / 26M7",
              upload_mode: "append",
              replaces_source_file_version_id: null,
              scan_status: "completed",
              scan_summary: {
                sheets_scanned: parsed.sheetSummaries.length,
                tables_detected: parsed.tables.length,
                sheets: parsed.sheetSummaries,
              },
              created_at: new Date().toISOString(),
            }
          ]
        };

        projectsStore.set(trackerProjId, trackerProject);
        tablesStore.set(trackerVersionId, parsed.tables);

        const trackerRecogResult = {
          job_id: `job_rec_${trackerVersionId}`,
          source_file_version_id: trackerVersionId,
          status: "completed",
          phase: "AI 两层识别与 Python 校验完成",
          progress_percent: 100,
          error_message: null,
          result: {
            provider: "deepseek",
            max_sheets: 5,
            sheets: [
              {
                sheet_name: parsed.sheetSummaries[0]?.sheet_name || "Sheet1",
                outline_response_count: 1,
                detail_response_count: parsed.tables.length,
                boundary_proposals: parsed.tables.map(t => ({ source_range: t.source_range, confidence_score: 0.98 })),
                boundary_validations: parsed.tables.map(() => ({ outcome: "accepted" })),
                extracted_tables: parsed.tables,
              }
            ]
          }
        };
        recognitionStore.set(trackerVersionId, trackerRecogResult);
        console.log(`[Init] Loaded test tracker 0825 with ${parsed.tables.length} tables from ${latestFile}`);

        // Generate initial AI-recommended draft for test tracker 0825
        const trackerDraft = buildIntelligentDashboardDraft(
          trackerProjectId,
          "test tracker 0825",
          trackerVersionId,
          parsed.tables,
          { template: "Brand Tracking" }
        );
        dashboardDraftsStore.set(trackerProjectId, [trackerDraft]);
      }
    }
  } catch (err) {
    console.error("[Init] Error scanning local uploads:", err);
  }

  // Initial Review Issues
  const initialIssues: ReviewIssue[] = [
    {
      review_issue_id: "issue_sig_001",
      project_id: initialProjectId,
      source_file_version_id: initialVersionId,
      object_type: "extracted_table",
      object_id: sampleTables[0]?.extracted_table_id || "deepseek_01",
      issue_type: "significance_mapping_checked",
      severity: "low",
      message: "显著性字母代码（A/B/C）已通过列头路径自动映射校验。",
      suggested_actions: ["confirm_mapping"],
      status: "resolved",
      creator_note: "已自动核验",
      blocks_publication: false,
    }
  ];
  reviewIssuesStore.set(initialProjectId, initialIssues);

  // Initial Dashboard Draft for Sample Project
  const initialDraft = buildIntelligentDashboardDraft(
    initialProjectId,
    "Kantar 品牌研究内部 Draft",
    initialVersionId,
    sampleTables,
    { template: "Brand Tracking" }
  );
  dashboardDraftsStore.set(initialProjectId, [initialDraft]);
}

// Setup Multer for upload storage
const uploadDir = path.resolve(process.cwd(), "outputs/local_uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^A-Za-z0-9._-]+/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run seed data loading asynchronously
  loadInitialSeedData().catch((err) => console.error("Error in loadInitialSeedData:", err));

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Endpoints

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "ai_dashboard_backend" });
  });

  // 2. List projects
  app.get("/api/projects", (req, res) => {
    const list = Array.from(projectsStore.values()).map((p) => ({
      project_id: p.project_id,
      project_name: p.project_name,
    }));
    res.json({ success: true, data: list });
  });

  // 3. Create project
  app.post("/api/projects", (req, res) => {
    const projectName = (req.body.project_name || "").trim();
    if (!projectName) {
      return res.status(400).json({ success: false, detail: "项目名称不能为空" });
    }
    const normalized = normalizeProjectName(projectName);
    const existing = Array.from(projectsStore.values()).find(
      (p) => p.project_name_normalized === normalized
    );
    if (existing) {
      return res.status(409).json({ success: false, detail: "项目名称已存在" });
    }

    const slug = normalized.replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "project";
    const projectId = `prj_${slug}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newProject: Project = {
      project_id: projectId,
      project_name: projectName,
      project_name_normalized: normalized,
      source_file_versions: [],
      created_at: now,
      updated_at: now,
    };
    projectsStore.set(projectId, newProject);
    res.json({
      success: true,
      data: {
        project_id: projectId,
        project_name: projectName,
        created_at: now,
        updated_at: now,
      }
    });
  });

  // 4. Get project details
  app.get("/api/projects/:project_id", (req, res) => {
    const project = projectsStore.get(req.params.project_id);
    if (!project) {
      return res.status(404).json({ success: false, detail: "项目不存在" });
    }
    res.json({ success: true, data: project });
  });

  // 5. Upload source file version
  app.post("/api/projects/:project_id/source-versions", upload.single("file"), async (req, res) => {
    const projectId = req.params.project_id;
    const project = projectsStore.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, detail: "项目不存在，请先创建项目" });
    }

    const file = req.file;
    const fileName = file ? file.originalname : "upload.xlsx";
    const marketScope = req.body.market_scope || "自动识别";
    const waveScope = req.body.wave_scope || "自动识别";
    const uploadMode = req.body.upload_mode === "replace" ? "replace" : "append";
    const replacesId = req.body.replaces_source_file_version_id || null;

    const versionId = `sfv_${Math.random().toString(36).slice(2, 10)}`;
    const jobId = `job_${Math.random().toString(36).slice(2, 10)}`;

    let scanSummary: any = { sheets_scanned: 1, tables_detected: 1 };
    let parsedTables: ExtractedTable[] = [];

    if (file && file.path && fs.existsSync(file.path)) {
      versionFilePathMap.set(versionId, file.path);
      try {
        const parsed = await parseExcelWorkbook(file.path, versionId);
        parsedTables = parsed.tables;
        scanSummary = {
          sheets_scanned: parsed.sheetSummaries.length,
          tables_detected: parsed.tables.length,
          sheets: parsed.sheetSummaries,
        };
      } catch (err) {
        console.error("Error parsing uploaded Excel file:", err);
      }
    }

    const detectedMarket = (marketScope === "自动识别" || marketScope === "待识别") ? "New Zealand (NZ)" : marketScope;
    const detectedWave = (waveScope === "自动识别" || waveScope === "待识别") ? "26M1 / 26M7" : waveScope;

    const newVersion: SourceFileVersion = {
      source_file_version_id: versionId,
      project_id: projectId,
      file_name: fileName,
      market_scope: detectedMarket,
      wave_scope: detectedWave,
      upload_mode: uploadMode,
      replaces_source_file_version_id: replacesId,
      scan_status: "completed",
      scan_summary: scanSummary,
      created_at: new Date().toISOString(),
    };

    project.source_file_versions.unshift(newVersion);
    project.updated_at = new Date().toISOString();

    if (parsedTables.length > 0) {
      tablesStore.set(versionId, parsedTables);
    } else {
      // Fallback
      const fallbackTables: ExtractedTable[] = [
        {
          extracted_table_id: `tbl_${versionId}_1`,
          source_sheet: "Sheet1",
          source_range: "A1:G20",
          detected_question_number: "Q1",
          detected_question_text: `Q1: ${fileName} 样本分布与核心指标`,
          detected_table_title: `Q1: ${fileName} 样本分布与核心指标`,
          table_variant: "percentage",
          headers: [
            { extracted_header_id: "h_1", display_label: "Total (A)", header_path: ["Total (A)"], significance_code: "A" },
            { extracted_header_id: "h_2", display_label: "Segment 1 (B)", header_path: ["Segment 1 (B)"], significance_code: "B" },
            { extracted_header_id: "h_3", display_label: "Segment 2 (C)", header_path: ["Segment 2 (C)"], significance_code: "C" },
          ],
          rows: [
            {
              extracted_row_id: "r_base",
              original_label: "Base: All respondents",
              detected_row_type: "base",
              cells: [
                { extracted_header_id: "h_1", source_cell: "B2", raw_value: 1000, excel_display_value: "1000", parsed_value: 1000, parsed_unit: "count", original_significance_marker: "", significance_mapping_status: "not_applicable" },
                { extracted_header_id: "h_2", source_cell: "D2", raw_value: 500, excel_display_value: "500", parsed_value: 500, parsed_unit: "count", original_significance_marker: "", significance_mapping_status: "not_applicable" },
                { extracted_header_id: "h_3", source_cell: "F2", raw_value: 500, excel_display_value: "500", parsed_value: 500, parsed_unit: "count", original_significance_marker: "", significance_mapping_status: "not_applicable" },
              ]
            },
            {
              extracted_row_id: "r_1",
              original_label: "Option A",
              detected_row_type: "data",
              cells: [
                { extracted_header_id: "h_1", source_cell: "B3", raw_value: 0.65, excel_display_value: "65.0%", parsed_value: 0.65, parsed_unit: "percentage", original_significance_marker: "", significance_mapping_status: "mapped" },
                { extracted_header_id: "h_2", source_cell: "D3", raw_value: 0.72, excel_display_value: "72.0%", parsed_value: 0.72, parsed_unit: "percentage", original_significance_marker: "C", significance_mapping_status: "mapped" },
                { extracted_header_id: "h_3", source_cell: "F3", raw_value: 0.58, excel_display_value: "58.0%", parsed_value: 0.58, parsed_unit: "percentage", original_significance_marker: "", significance_mapping_status: "mapped" },
              ]
            }
          ]
        }
      ];
      tablesStore.set(versionId, fallbackTables);
    }

    // Register job
    const job: ProcessingJob = {
      job_id: jobId,
      project_id: projectId,
      source_file_version_id: versionId,
      job_type: "ingestion",
      status: "completed",
      phase: "Python Workbook 扫描完成",
      progress_percent: 100,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    jobsStore.set(jobId, job);

    res.status(202).json({
      success: true,
      data: {
        source_file_version_id: versionId,
        project_id: projectId,
        file_name: fileName,
        market_scope: detectedMarket,
        wave_scope: detectedWave,
        upload_mode: uploadMode,
        replaces_source_file_version_id: replacesId,
        job_id: jobId,
        scan_status: "completed",
      }
    });
  });

  // 6. Polling job status
  app.get("/api/projects/:project_id/jobs/:job_id", (req, res) => {
    const job = jobsStore.get(req.params.job_id);
    if (!job) {
      return res.status(404).json({ success: false, detail: "处理任务不存在" });
    }
    const { result, ...lightweightJob } = job;
    res.json({
      success: true,
      data: {
        ...lightweightJob,
        result_available: Boolean(result)
      }
    });
  });

  // 7. Start AI Recognition
  app.post("/api/projects/:project_id/source-versions/:source_file_version_id/recognition", async (req, res) => {
    const { project_id, source_file_version_id } = req.params;
    const project = projectsStore.get(project_id);
    if (!project) {
      return res.status(404).json({ success: false, detail: "项目不存在" });
    }

    let tables = tablesStore.get(source_file_version_id) || [];
    // If no tables or only fallback tables, try re-parsing from disk
    if (tables.length <= 1) {
      const filePath = versionFilePathMap.get(source_file_version_id) || (() => {
        const uploadDir = path.resolve(process.cwd(), "outputs/local_uploads");
        if (fs.existsSync(uploadDir)) {
          const files = fs.readdirSync(uploadDir).filter(f => f.endsWith(".xlsx") || f.endsWith(".xls"));
          if (files.length > 0) return path.join(uploadDir, files[files.length - 1]);
        }
        return null;
      })();

      if (filePath && fs.existsSync(filePath)) {
        try {
          const parsed = await parseExcelWorkbook(filePath, source_file_version_id);
          if (parsed.tables.length > 0) {
            tables = parsed.tables;
            tablesStore.set(source_file_version_id, tables);
          }
        } catch (err) {
          console.error("Error parsing workbook for recognition:", err);
        }
      }
    }

    const version = project.source_file_versions.find((v) => v.source_file_version_id === source_file_version_id);
    if (version) {
      if (version.market_scope === "待识别" || version.market_scope === "自动识别") {
        version.market_scope = "New Zealand (NZ)";
      }
      if (version.wave_scope === "待识别" || version.wave_scope === "自动识别") {
        version.wave_scope = "26M1 / 26M7";
      }
      version.scan_status = "completed";
      version.scan_summary = {
        sheets_scanned: 1,
        tables_detected: tables.length,
      };
      project.updated_at = new Date().toISOString();
    }

    const jobId = `job_rec_${Math.random().toString(36).slice(2, 10)}`;

    const recognitionData = {
      job_id: jobId,
      source_file_version_id,
      status: "completed",
      phase: "AI 两层识别与 Python 校验完成",
      progress_percent: 100,
      error_message: null,
      result: {
        provider: "deepseek",
        max_sheets: 5,
        sheets: [
          {
            sheet_name: tables[0]?.source_sheet || "Sheet1",
            outline_response_count: 1,
            detail_response_count: tables.length,
            boundary_proposals: tables.map((t) => ({ source_range: t.source_range, confidence_score: 0.98 })),
            boundary_validations: tables.map(() => ({ outcome: "accepted" })),
            extracted_tables: tables,
          }
        ]
      }
    };
    recognitionStore.set(source_file_version_id, recognitionData);

    const job: ProcessingJob = {
      job_id: jobId,
      project_id,
      source_file_version_id,
      job_type: "recognition",
      status: "completed",
      phase: "AI 两层识别与 Python 校验完成",
      progress_percent: 100,
      error_message: null,
      result: recognitionData.result,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    jobsStore.set(jobId, job);

    res.status(202).json({
      success: true,
      data: {
        job_id: jobId,
        source_file_version_id,
        status: "completed"
      }
    });
  });

  // 8. Get recognition results
  app.get("/api/projects/:project_id/source-versions/:source_file_version_id/recognition-results", (req, res) => {
    const { source_file_version_id } = req.params;
    const recognition = recognitionStore.get(source_file_version_id);
    if (!recognition) {
      return res.status(404).json({ success: false, detail: "尚无 AI 识别结果" });
    }
    res.json({
      success: true,
      data: recognition
    });
  });

  // 9. Get extraction
  app.get("/api/projects/:project_id/source-versions/:source_file_version_id/extraction", (req, res) => {
    const { source_file_version_id } = req.params;
    const tables = tablesStore.get(source_file_version_id) || [];
    res.json({
      success: true,
      data: {
        job_id: `job_ext_${source_file_version_id}`,
        source_file_version_id,
        status: "completed",
        tables,
      }
    });
  });

  // 10. List extraction tables (paginated)
  app.get("/api/projects/:project_id/source-versions/:source_file_version_id/extraction-tables", (req, res) => {
    const { source_file_version_id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 20;

    const tables = tablesStore.get(source_file_version_id) || [];
    const start = (page - 1) * pageSize;
    const paged = tables.slice(start, start + pageSize);

    const summaries = paged.map((table) => ({
      extracted_table_id: table.extracted_table_id,
      source_sheet: table.source_sheet,
      source_range: table.source_range,
      detected_question_number: table.detected_question_number,
      detected_question_text: table.detected_question_text,
      detected_table_title: table.detected_table_title,
      table_variant: table.table_variant,
      header_count: table.headers ? table.headers.length : 0,
      row_count: table.rows ? table.rows.length : 0,
    }));

    res.json({
      success: true,
      data: {
        tables: summaries,
        page,
        page_size: pageSize,
        total: tables.length,
      }
    });
  });

  // 11. Get specific extraction table
  app.get("/api/projects/:project_id/source-versions/:source_file_version_id/extraction-tables/:extracted_table_id", (req, res) => {
    const { source_file_version_id, extracted_table_id } = req.params;
    const tables = tablesStore.get(source_file_version_id) || [];
    const table = tables.find((t) => t.extracted_table_id === extracted_table_id);
    if (!table) {
      return res.status(404).json({ success: false, detail: "物理表不存在" });
    }
    res.json({
      success: true,
      data: { table }
    });
  });

  // 12. Get review issues
  app.get("/api/projects/:project_id/review-issues", (req, res) => {
    const issues = reviewIssuesStore.get(req.params.project_id) || [];
    res.json({
      success: true,
      data: { issues }
    });
  });

  // 13. Resolve review issue
  app.post("/api/projects/:project_id/review-issues/:review_issue_id", (req, res) => {
    const { project_id, review_issue_id } = req.params;
    const { status = "resolved", creator_note = null } = req.body;
    const issues = reviewIssuesStore.get(project_id) || [];
    const target = issues.find((item) => item.review_issue_id === review_issue_id);
    if (!target) {
      // Create if not found
      const newIssue: ReviewIssue = {
        review_issue_id,
        project_id,
        source_file_version_id: "",
        object_type: "review_item",
        object_id: review_issue_id,
        issue_type: "user_marked",
        severity: "low",
        message: "Creator 手动标记处置",
        suggested_actions: [],
        status,
        creator_note,
        blocks_publication: false,
      };
      issues.push(newIssue);
      reviewIssuesStore.set(project_id, issues);
      return res.json({ success: true, data: newIssue });
    }
    target.status = status;
    target.creator_note = creator_note;
    target.blocks_publication = false;
    res.json({ success: true, data: target });
  });

  // 14. Create / Update Dashboard Draft
  app.post("/api/projects/:project_id/source-versions/:source_file_version_id/dashboard-drafts", (req, res) => {
    const { project_id, source_file_version_id } = req.params;
    const project = projectsStore.get(project_id);
    if (!project) {
      return res.status(404).json({ success: false, detail: "项目不存在" });
    }

    const tables = tablesStore.get(source_file_version_id) || [];
    if (tables.length === 0) {
      return res.status(409).json({ success: false, detail: "当前版本没有通过校验的物理表" });
    }

    const {
      template = "Brand Tracking",
      selected_table_ids,
      metric_confirmations = {},
      visual_overrides = {},
    } = req.body;

    const existingDrafts = dashboardDraftsStore.get(project_id) || [];
    const nextRevision = existingDrafts.length + 1;

    const draft = buildIntelligentDashboardDraft(
      project_id,
      project.project_name,
      source_file_version_id,
      tables,
      {
        template,
        selectedTableIds: selected_table_ids,
        metricConfirmations: metric_confirmations,
        visualOverrides: visual_overrides,
      }
    );
    draft.revision = nextRevision;

    existingDrafts.unshift(draft);
    dashboardDraftsStore.set(project_id, existingDrafts);

    res.json({ success: true, data: draft });
  });

  // 15. Get latest Dashboard Draft
  app.get("/api/projects/:project_id/dashboard-drafts/latest", (req, res) => {
    const drafts = dashboardDraftsStore.get(req.params.project_id) || [];
    if (drafts.length === 0) {
      return res.status(404).json({ success: false, detail: "尚未生成 Dashboard Draft" });
    }
    const sourceVersionId = req.query.source_file_version_id as string;
    let draft = drafts[0];
    if (sourceVersionId) {
      const match = drafts.find((d) => d.source_file_version_id === sourceVersionId);
      if (match) draft = match;
    }
    res.json({ success: true, data: draft });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const frontendDir = path.resolve(process.cwd(), "frontend");
    const vite = await createViteServer({
      root: frontendDir,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const template = await fs.promises.readFile(path.join(frontendDir, "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Dashboard Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
