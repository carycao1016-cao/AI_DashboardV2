import { isPureDataRow, isSummaryOrStatisticRow } from "./statistic_filter";
import {
  clusterTablesIntoBatteryGroups,
  BatteryGroup,
  BatteryBrandMetric,
} from "./battery_grouper";

export interface ExtractedCell {
  extracted_header_id: string;
  source_cell: string;
  raw_value: unknown;
  excel_display_value: string;
  parsed_value: unknown;
  parsed_unit: string;
  original_significance_marker: string;
  significance_mapping_status: string;
}

export interface ExtractedHeader {
  extracted_header_id: string;
  data_column?: string;
  header_path: string[];
  display_label: string;
  significance_code: string;
  source_header_cells?: string[];
}

export interface ExtractedRow {
  extracted_row_id: string;
  original_label: string;
  detected_row_type: "base" | "data" | "subtotal" | "header";
  cells: ExtractedCell[];
}

export interface ExtractedTable {
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

export interface DashboardVisual {
  dashboard_visual_id: string;
  source_extracted_table_id: string;
  visual_type: string;
  display_precision?: number;
  title: string;
  grid_span: number;
  review_status: string;
  evidence: { source_ranges?: string[] };
  is_battery_group?: boolean;
  battery_group_id?: string;
  battery_stem?: string;
  battery_entities?: string[];
  recommended_metric?: string;
  recommended_metric_label?: string;
  available_metrics?: Array<{ key: string; label: string }>;
  aggregated_data?: Array<{
    entity: string;
    table_id: string;
    source_range: string;
    metric_key: string;
    metric_name: string;
    value: number;
    display: string;
    is_percentage: boolean;
  }>;
  radar_dimensions?: string[];
  radar_series?: Array<{ name: string; value: number[] }>;
}

export interface SemanticQuestion {
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
  is_battery_group?: boolean;
  battery_group_id?: string;
  battery_stem?: string;
  battery_entities?: string[];
  recommended_metric?: string;
  recommended_metric_label?: string;
  available_metrics?: Array<{ key: string; label: string }>;
  aggregated_data?: Array<{
    entity: string;
    table_id: string;
    source_range: string;
    metric_key: string;
    metric_name: string;
    value: number;
    display: string;
    is_percentage: boolean;
  }>;
}

export interface DashboardDraft {
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
  semantic_questions?: SemanticQuestion[];
}

export type VisualType =
  | "bar"
  | "horizontal_bar"
  | "grouped_bar"
  | "line"
  | "funnel"
  | "pyramid"
  | "heatmap"
  | "pie"
  | "donut"
  | "radar"
  | "scatter"
  | "data_table";

export interface PlanDecision {
  recommended_visual: VisualType;
  planning_confidence: number;
  planning_reason: string;
  module_name: string;
  module_id: string;
  template_matches: Array<{ template: string; reason: string }>;
  ai_recommended: boolean;
}

/**
 * 智能题目语义分类与可视化图表规划引擎
 * 基于市场调研（Market Research / Kantar Crosstab）数据结构与统计语义学：
 * 1. 单选构成与人口学互斥维度 (Gender, Country, Income, Typology) -> 环形图 / 饼图 (Donut / Pie)
 * 2. 品牌转化模型与层级流失 (Awareness -> Consideration -> Purchase -> Loyalty, Funnel, 阶段) -> 漏斗图 / 金字塔图 (Funnel / Pyramid)
 * 3. 品牌多维感知与属性画像 (Imagery, Attributes, Profile, Matrix, 评价) -> 雷达图 (Radar, <=10维) 或 热力图 (Heatmap, 矩阵)
 * 4. 多波次追踪与时序演进 (Wave, 26M1, 26M7, Trend, Month, Year, 波次) -> 趋势折线图 (Line)
 * 5. 跨人群/跨组别细分对比 (Headers 包含细分维度或多列对比) -> 分组条形图 (Grouped Bar)
 * 6. 多选项/多品牌长文本列表排名 (>5项品牌、自发提及、提示提及) -> 横向条形图 (Horizontal Bar)
 * 7. 离散量表与层级指标 (2-5项满意度、NPS评价) -> 垂直柱状图 (Bar)
 * 8. 高维密集交叉表与显著性大表 -> 数据表 (Data Table)
 */
export function planVisualForTable(table: ExtractedTable): PlanDecision {
  const qNum = (table.detected_question_number || "").trim().toLowerCase();
  const qText = (table.detected_question_text || "").trim().toLowerCase();
  const qTitle = (table.detected_table_title || "").trim().toLowerCase();
  const fullText = `${qNum} ${qText} ${qTitle}`;

  // 提取纯净分类选项行（自动过滤 Base, Sigma, Total, Net, Mean, Median, Std Dev, Std Err, Variance, Top/Bottom Box 等统计汇总行）
  const dataRows = (table.rows || []).filter((r) =>
    isPureDataRow(r.original_label, r.detected_row_type)
  );
  const optionCount = dataRows.length;
  const rowLabels = dataRows.map((r) => r.original_label.toLowerCase());
  const allRowLabelsJoined = rowLabels.join(" ");

  const headers = table.headers || [];
  const headerLabels = headers.map((h) => (h.display_label || h.header_path.join(" ")).toLowerCase());
  const allHeadersJoined = headerLabels.join(" ");

  // 计算第一列的百分比加和（检测是否为 100% 单选构成）
  let firstColSum = 0;
  let hasPercentage = false;
  for (const row of dataRows) {
    const firstCell = row.cells?.[0];
    if (firstCell && typeof firstCell.parsed_value === "number") {
      if (firstCell.parsed_unit === "percentage" || table.table_variant === "percentage") {
        hasPercentage = true;
        firstColSum += Number(firstCell.parsed_value);
      }
    }
  }

  // 检查是否包含波次/时间序列
  const hasWaveInHeaders =
    allHeadersJoined.includes("26m") ||
    allHeadersJoined.includes("wave") ||
    allHeadersJoined.includes("w1") ||
    allHeadersJoined.includes("w2") ||
    allHeadersJoined.includes("2024") ||
    allHeadersJoined.includes("2025") ||
    allHeadersJoined.includes("2026") ||
    allHeadersJoined.includes("trend") ||
    allHeadersJoined.includes("month") ||
    allHeadersJoined.includes("quarter");

  const hasWaveInTitle =
    fullText.includes("wave") ||
    fullText.includes("trend") ||
    fullText.includes("波次") ||
    fullText.includes("趋势") ||
    fullText.includes("tracking");

  // 1. 漏斗图 / 金字塔图 (Funnel / Pyramid)
  const isFunnelKeyword =
    fullText.includes("funnel") ||
    fullText.includes("漏斗") ||
    fullText.includes("conversion") ||
    fullText.includes("转化") ||
    fullText.includes("stage") ||
    fullText.includes("阶段") ||
    allRowLabelsJoined.includes("awareness") && (allRowLabelsJoined.includes("consider") || allRowLabelsJoined.includes("purchase") || allRowLabelsJoined.includes("regular"));

  if (isFunnelKeyword) {
    return {
      recommended_visual: "funnel",
      planning_confidence: 0.98,
      planning_reason: "识别为品牌转化漏斗模型，推荐漏斗图直观展现层级衰减与转化率",
      module_name: "Brand Funnel",
      module_id: "brand_funnel",
      template_matches: [{ template: "Brand Tracking", reason: "品牌漏斗与购买阶段核心模型" }],
      ai_recommended: true,
    };
  }

  // 2. 环形图 / 饼图 (Donut / Pie) - 单选互斥受众构成与单一维度份额
  const isDemographicComposition =
    fullText.includes("gender") ||
    fullText.includes("性别") ||
    fullText.includes("country") ||
    fullText.includes("国家") ||
    fullText.includes("region") ||
    fullText.includes("city") ||
    fullText.includes("城市") ||
    fullText.includes("income") ||
    fullText.includes("收入") ||
    fullText.includes("typology") ||
    fullText.includes("segment") ||
    fullText.includes("share") ||
    fullText.includes("占比") ||
    fullText.includes("构成") ||
    fullText.includes("份额") ||
    fullText.includes("distribution");

  const isCompositionSum = firstColSum >= 0.85 && firstColSum <= 1.15;

  if (isDemographicComposition && optionCount >= 2 && optionCount <= 8) {
    return {
      recommended_visual: "donut",
      planning_confidence: 0.96,
      planning_reason: "互斥人口学/受众结构单选分布，推荐环形图清晰展示占比份额",
      module_name: "Demographics & Audience",
      module_id: "demographics",
      template_matches: [
        { template: "Brand Tracking", reason: "样本人群与受众画像特征" },
        { template: "U&A / Category Study", reason: "品类与受众细分分布" },
      ],
      ai_recommended: true,
    };
  }

  if (isCompositionSum && optionCount >= 2 && optionCount <= 6) {
    return {
      recommended_visual: "pie",
      planning_confidence: 0.94,
      planning_reason: "数据求和为 100% 互斥单选项，推荐饼图呈现结构构成",
      module_name: "Detailed Results",
      module_id: "detailed_results",
      template_matches: [{ template: "Brand Tracking", reason: "样本单选构成" }],
      ai_recommended: true,
    };
  }

  // 3. 雷达图 (Radar) - 品牌多维感知/属性形象
  const isImageryOrAttribute =
    fullText.includes("imagery") ||
    fullText.includes("image") ||
    fullText.includes("attribute") ||
    fullText.includes("profile") ||
    fullText.includes("personality") ||
    fullText.includes("perception") ||
    fullText.includes("形象") ||
    fullText.includes("属性") ||
    fullText.includes("感知") ||
    fullText.includes("特征") ||
    fullText.includes("评价") ||
    fullText.includes("typology");

  if (isImageryOrAttribute && optionCount >= 3 && optionCount <= 10) {
    return {
      recommended_visual: "radar",
      planning_confidence: 0.95,
      planning_reason: "多维品牌形象感知与属性打分，推荐雷达图直观呈现综合画像与优劣势",
      module_name: "Brand Imagery",
      module_id: "brand_imagery",
      template_matches: [{ template: "Brand Tracking", reason: "品牌形象与属性感知模型" }],
      ai_recommended: true,
    };
  }

  // 4. 热力图 (Heatmap) - 多品牌跨属性大矩阵
  if ((isImageryOrAttribute || fullText.includes("matrix")) && headers.length >= 4 && optionCount >= 4) {
    return {
      recommended_visual: "heatmap",
      planning_confidence: 0.93,
      planning_reason: "跨多品牌/多人群的属性打分矩阵，推荐热力图呈现强度对比与热点聚类",
      module_name: "Brand Imagery Matrix",
      module_id: "brand_imagery",
      template_matches: [{ template: "Brand Tracking", reason: "品牌形象矩阵评估" }],
      ai_recommended: true,
    };
  }

  // 5. 趋势折线图 (Line) - 多波次/时序追踪
  if ((hasWaveInHeaders || hasWaveInTitle) && (headers.length >= 2 || optionCount >= 3)) {
    return {
      recommended_visual: "line",
      planning_confidence: 0.95,
      planning_reason: "包含多波次（Wave）时序对比，推荐趋势折线图展现连续演变与趋势",
      module_name: "Wave Tracking",
      module_id: "wave_tracking",
      template_matches: [{ template: "Brand Tracking", reason: "多波次品牌追踪模型" }],
      ai_recommended: true,
    };
  }

  // 6. 分组条形图 (Grouped Bar) - 跨细分人群/列间对比
  const isSegmentComparison =
    (headers.length >= 2 && headers.length <= 6) &&
    (allHeadersJoined.includes("male") ||
      allHeadersJoined.includes("age") ||
      allHeadersJoined.includes("segment") ||
      allHeadersJoined.includes("total")) &&
    optionCount <= 6;

  if (isSegmentComparison) {
    return {
      recommended_visual: "grouped_bar",
      planning_confidence: 0.92,
      planning_reason: "跨细分受众/子群体的对比数据，推荐分组对比条形图展现群间差异",
      module_name: "Segment Breakdown",
      module_id: "segment_breakdown",
      template_matches: [{ template: "Brand Tracking", reason: "细分人群对比分析" }],
      ai_recommended: true,
    };
  }

  // 7. 垂直柱状图 (Bar) - 离散量表、短选项评价 (2-6 项)
  const isDiscreteRating =
    optionCount >= 2 &&
    optionCount <= 6 &&
    (fullText.includes("satisfaction") ||
      fullText.includes("nps") ||
      fullText.includes("rating") ||
      fullText.includes("scale") ||
      fullText.includes("满意") ||
      fullText.includes("评分") ||
      fullText.includes("age") ||
      fullText.includes("年龄"));

  if (isDiscreteRating) {
    return {
      recommended_visual: "bar",
      planning_confidence: 0.94,
      planning_reason: "离散分级评价与量表指标，推荐垂直柱状图进行清晰的离散柱状对比",
      module_name: "Brand Performance",
      module_id: "brand_performance",
      template_matches: [
        { template: "Customer Satisfaction / NPS", reason: "满意度与评价量表" },
        { template: "Brand Tracking", reason: "品牌表现与受众分层" },
      ],
      ai_recommended: true,
    };
  }

  // 8. 数据表 (Data Table) - 极端多行或极端多列
  if (optionCount > 16 || headers.length > 15) {
    return {
      recommended_visual: "data_table",
      planning_confidence: 0.91,
      planning_reason: "高密度多维交叉表，推荐数据表保留完整多列与显著性标记",
      module_name: "Detailed Crosstab",
      module_id: "detailed_results",
      template_matches: [{ template: "Brand Tracking", reason: "交叉分析大表" }],
      ai_recommended: false,
    };
  }

  // 9. 横向条形图 (Horizontal Bar) - 默认适合多品牌提及率、认知度、产品特性排名
  const isBrandAwareness =
    fullText.includes("awareness") ||
    fullText.includes("brand") ||
    fullText.includes("recall") ||
    fullText.includes("cognition") ||
    fullText.includes("认知") ||
    fullText.includes("品牌") ||
    fullText.includes("提及") ||
    fullText.includes("排名");

  return {
    recommended_visual: "horizontal_bar",
    planning_confidence: 0.95,
    planning_reason: isBrandAwareness
      ? "多品牌提示/无提示认知度与提及率排名，横向条形图可容纳长标签并清晰对比"
      : "多选项分布对比，横向条形图适合清晰阅读标签与排名",
    module_name: isBrandAwareness ? "Brand Awareness & Ranking" : "Detailed Results",
    module_id: isBrandAwareness ? "brand_awareness" : "detailed_results",
    template_matches: [{ template: "Brand Tracking", reason: "品牌认知度与市场份额排名" }],
    ai_recommended: true,
  };
}

/**
 * 为一组已抽取表格规划完整的 Dashboard Draft 架构
 */
export function buildIntelligentDashboardDraft(
  projectId: string,
  projectName: string,
  sourceFileVersionId: string,
  tables: ExtractedTable[],
  options?: {
    template?: string;
    selectedTableIds?: string[];
    metricConfirmations?: Record<string, string>;
    visualOverrides?: Record<string, string>;
  }
): DashboardDraft {
  const chosenTemplate = options?.template || "Brand Tracking";
  const selectedIds = options?.selectedTableIds ? new Set(options.selectedTableIds) : null;
  const confirmations = options?.metricConfirmations || {};
  const overrides = options?.visualOverrides || {};

  const decisionsMap = new Map<string, PlanDecision>();
  const semanticQuestions: SemanticQuestion[] = [];

  // 1. 执行题组聚类（Battery Grouping）
  const { batteryGroups, standaloneTables } = clusterTablesIntoBatteryGroups(tables);

  // 2. 为每个题组生成跨品牌对比语义题目 (Battery Comparison Visual)
  const batteryVisuals: DashboardVisual[] = [];
  for (const bg of batteryGroups) {
    const primaryTableId = bg.tables[0].extracted_table_id;
    const chosenVisual = (overrides[primaryTableId] as VisualType) || bg.recommended_visual;
    const sqId = `sq_${bg.battery_group_id}`;
    const allTableIds = bg.tables.map((t) => t.extracted_table_id);
    const isIncluded = selectedIds ? allTableIds.some((id) => selectedIds.has(id)) : true;

    const batterySq: SemanticQuestion = {
      semantic_question_id: sqId,
      source_extracted_table_ids: allTableIds,
      title: `${bg.stem_title} - 跨品牌对比 (${bg.recommended_metric_label})`,
      module_name: "Brand Comparison & Ranking",
      metric_type: "percentage",
      metric_source: `Battery Group (${bg.recommended_metric_label})`,
      review_status: "creator_confirmed",
      ai_recommended: true,
      included_in_draft: isIncluded,
      recommended_visual: chosenVisual,
      planning_source: overrides[primaryTableId] ? "creator_override" : "ai",
      planning_confidence: 0.98,
      planning_reason: overrides[primaryTableId]
        ? "Creator 手动自定义图表类型"
        : bg.planning_reason,
      template_matches: [
        { template: "Brand Tracking", reason: "跨品牌打分与表现梯队对比" },
      ],
      evidence: { source_ranges: bg.tables.map((t) => t.source_range) },
      is_battery_group: true,
      battery_group_id: bg.battery_group_id,
      battery_stem: bg.stem_title,
      battery_entities: bg.entities,
      recommended_metric: bg.recommended_metric,
      recommended_metric_label: bg.recommended_metric_label,
      available_metrics: bg.available_metrics,
      aggregated_data: bg.metrics_by_brand,
    };
    semanticQuestions.push(batterySq);

    if (isIncluded) {
      batteryVisuals.push({
        dashboard_visual_id: `vis_${bg.battery_group_id}`,
        source_extracted_table_id: primaryTableId,
        visual_type: chosenVisual,
        display_precision: 1,
        title: `${bg.stem_title} - 跨品牌表现对比`,
        grid_span: 1,
        review_status: "creator_confirmed",
        evidence: { source_ranges: bg.tables.map((t) => t.source_range) },
        is_battery_group: true,
        battery_group_id: bg.battery_group_id,
        battery_stem: bg.stem_title,
        battery_entities: bg.entities,
        recommended_metric: bg.recommended_metric,
        recommended_metric_label: bg.recommended_metric_label,
        available_metrics: bg.available_metrics,
        aggregated_data: bg.metrics_by_brand,
      });
    }
  }

  // 3. 如果识别出 >= 2 个题组，自动规划多维品牌形象雷达图 (Multi-Attribute Radar Chart)
  if (batteryGroups.length >= 2) {
    const radarDimensions = batteryGroups.map((bg) => bg.stem_title.replace(/^Q\d+[\._\s]*/i, ""));
    // 提取所有唯一品牌
    const allBrands = Array.from(new Set(batteryGroups.flatMap((bg) => bg.entities)));
    const radarSeries = allBrands.slice(0, 6).map((brand) => {
      const vals = batteryGroups.map((bg) => {
        const item = bg.metrics_by_brand.find((m) => m.entity.toLowerCase() === brand.toLowerCase());
        return item ? item.value : 0;
      });
      return { name: brand, value: vals };
    });

    const radarVisualId = `vis_radar_${batteryGroups[0].battery_group_id}`;
    batteryVisuals.unshift({
      dashboard_visual_id: radarVisualId,
      source_extracted_table_id: batteryGroups[0].tables[0].extracted_table_id,
      visual_type: "radar",
      display_precision: 1,
      title: "品牌多维属性感知与竞争力雷达图 (Brand Attributes Radar)",
      grid_span: 2,
      review_status: "creator_confirmed",
      evidence: { source_ranges: batteryGroups.flatMap((bg) => bg.tables.map((t) => t.source_range)).slice(0, 8) },
      is_battery_group: true,
      battery_stem: "品牌多维属性总览",
      radar_dimensions: radarDimensions,
      radar_series: radarSeries,
    });
  }

  // 4. 对独立表（以及题组底层物理表）进行 AI 语义规划
  tables.forEach((table) => {
    const decision = planVisualForTable(table);
    decisionsMap.set(table.extracted_table_id, decision);

    // 如果属于题组，则默认在 Core 汇总，底层表默认保留在 Suggested 详细分析页
    const isPartOfBattery = batteryGroups.some((bg) =>
      bg.tables.some((t) => t.extracted_table_id === table.extracted_table_id)
    );

    const isSelected = selectedIds
      ? selectedIds.has(table.extracted_table_id)
      : isPartOfBattery
        ? false // 题组子表在概览页通过题组卡片汇总展现
        : decision.ai_recommended;

    const chosenVisual = (overrides[table.extracted_table_id] as VisualType) || decision.recommended_visual;
    const metricType =
      confirmations[table.extracted_table_id] ||
      (table.table_variant === "percentage" ? "percentage" : "count");

    semanticQuestions.push({
      semantic_question_id: `sq_${table.extracted_table_id}`,
      source_extracted_table_ids: [table.extracted_table_id],
      title: table.detected_question_text || table.detected_table_title || "分析指标",
      module_name: isPartOfBattery ? "Brand Detailed Distribution" : decision.module_name,
      metric_type: metricType,
      metric_source: "Python Table Extractor",
      review_status: "creator_confirmed",
      ai_recommended: isPartOfBattery ? false : decision.ai_recommended,
      included_in_draft: isSelected,
      recommended_visual: chosenVisual,
      planning_source: overrides[table.extracted_table_id] ? "creator_override" : "ai",
      planning_confidence: decision.planning_confidence,
      planning_reason: overrides[table.extracted_table_id]
        ? "Creator 手动自定义图表类型"
        : isPartOfBattery
          ? "已由题组跨品牌对比卡片聚合汇总呈现，原始表归入底层详细分析"
          : decision.planning_reason,
      template_matches: decision.template_matches,
      evidence: { source_ranges: [table.source_range] },
    });
  });

  // 按语义模块分流
  const includedQuestions = semanticQuestions.filter((q) => q.included_in_draft && !q.is_battery_group);

  const coreQuestions: SemanticQuestion[] = [];
  const funnelQuestions: SemanticQuestion[] = [];
  const imageryQuestions: SemanticQuestion[] = [];
  const waveQuestions: SemanticQuestion[] = [];
  const demographicQuestions: SemanticQuestion[] = [];
  const detailedQuestions: SemanticQuestion[] = [];

  for (const q of includedQuestions) {
    const tableId = q.source_extracted_table_ids[0];
    const decision = decisionsMap.get(tableId);
    const mod = decision?.module_id || "detailed_results";

    if (mod === "brand_funnel") funnelQuestions.push(q);
    else if (mod === "brand_imagery") imageryQuestions.push(q);
    else if (mod === "wave_tracking") waveQuestions.push(q);
    else if (mod === "demographics") demographicQuestions.push(q);
    else detailedQuestions.push(q);
  }

  // 概览页：加入漏斗、人口学等独立分析
  if (demographicQuestions.length > 0) coreQuestions.push(...demographicQuestions.slice(0, 2));
  if (funnelQuestions.length > 0) coreQuestions.push(...funnelQuestions.slice(0, 1));
  if (waveQuestions.length > 0) coreQuestions.push(...waveQuestions.slice(0, 1));
  if (detailedQuestions.length > 0 && coreQuestions.length < 4) {
    coreQuestions.push(...detailedQuestions.slice(0, 4 - coreQuestions.length));
  }

  const coreIds = new Set(coreQuestions.map((q) => q.source_extracted_table_ids[0]));
  const remainingQuestions = includedQuestions.filter((q) => !coreIds.has(q.source_extracted_table_ids[0]));

  const toVisual = (q: SemanticQuestion): DashboardVisual => {
    const tableId = q.source_extracted_table_ids[0];
    const tbl = tables.find((t) => t.extracted_table_id === tableId);
    return {
      dashboard_visual_id: `vis_${tableId}`,
      source_extracted_table_id: tableId,
      visual_type: q.recommended_visual || "horizontal_bar",
      display_precision: 1,
      title: q.title,
      grid_span: 1,
      review_status: "creator_confirmed",
      evidence: { source_ranges: tbl ? [tbl.source_range] : [] },
    };
  };

  // 组合 Core 页面视觉卡片：题组品牌对比卡片置顶 + 核心受众/漏斗图
  const coreVisuals: DashboardVisual[] = [...batteryVisuals, ...coreQuestions.map(toVisual)];

  const pages = [
    {
      dashboard_page_id: "page_core",
      category: "core" as const,
      title: "Core Brand & Audience (核心概览与品牌对比)",
      sort_order: 1,
      visuals: coreVisuals,
    },
  ];

  // 如果有题组子表或剩余表，生成详细分析页
  const suggestedVisuals = [
    ...remainingQuestions.map(toVisual),
    ...tables
      .filter((t) => batteryGroups.some((bg) => bg.tables.some((bgt) => bgt.extracted_table_id === t.extracted_table_id)))
      .map((tbl) => ({
        dashboard_visual_id: `vis_detail_${tbl.extracted_table_id}`,
        source_extracted_table_id: tbl.extracted_table_id,
        visual_type: "horizontal_bar",
        display_precision: 1,
        title: tbl.detected_question_text || tbl.detected_table_title,
        grid_span: 1,
        review_status: "creator_confirmed",
        evidence: { source_ranges: [tbl.source_range] },
      })),
  ];

  if (suggestedVisuals.length > 0) {
    pages.push({
      dashboard_page_id: "page_suggested",
      category: "suggested" as const,
      title: "Detailed Results & Crosstabs (详细分布分析)",
      sort_order: 2,
      visuals: suggestedVisuals.slice(0, 16),
    });
  }

  const totalVisuals = pages.reduce((sum, p) => sum + p.visuals.length, 0);

  return {
    dashboard_id: `dash_${projectId}`,
    dashboard_version_id: `dv_${Date.now()}`,
    dashboard_name: `${projectName} - ${chosenTemplate}`,
    project_id: projectId,
    source_file_version_id: sourceFileVersionId,
    template: chosenTemplate,
    revision: 1,
    pages,
    summary: {
      tables_detected: tables.length,
      semantic_questions: semanticQuestions.length,
      tables_in_draft: totalVisuals,
      blocking_issues: 0,
      review_required: 0,
    },
    warnings: [],
    semantic_questions: semanticQuestions,
  };
}
