/**
 * 市场研究（Market Research）题组自动聚类与跨品牌对比分析引擎
 * 
 * 核心能力：
 * 1. 逻辑规则与语义模式识别（Battery Clustering）：
 *    识别具有相同题干/题号但不同品牌的题组，如 "Q017. Meets_needs - Bosch", "Q017. Meets_needs - LG"
 * 2. 打分题对比指标智能优选（Rating Metric Priority）：
 *    优先提取 Top 2 Box (T2B)，其次 Top 1 Box (T1B)，再次 Top 3 Box (T3B)，再次 Mean (均值)
 * 3. 聚合对比数据集构造与图表推荐：
 *    自动将分散的单品牌表格转换为高价值的跨品牌对比图表（横向对比条形图、多维雷达图、分组条形图）
 */

import { ExtractedTable } from "./dashboard_planner";
import { classifyRatingMetricType, isSummaryOrStatisticRow } from "./statistic_filter";

export interface BatteryBrandMetric {
  entity: string; // 品牌/实体名，例如 "Bosch", "LG"
  table_id: string; // 来源物理表 ID
  source_range: string;
  metric_key: "top_2_box" | "top_1_box" | "top_3_box" | "mean" | "top_positive" | "other";
  metric_name: string; // 例如 "Top 2 Box (T2B)"
  value: number; // 数值，例如 78.5
  display: string; // 显示文本，例如 "78.5%" 或 "4.2"
  is_percentage: boolean;
}

export interface BatteryGroup {
  battery_group_id: string;
  stem_title: string; // 规范化后的公共题干，例如 "Q017. Meets_needs"
  question_number?: string;
  tables: ExtractedTable[];
  entities: string[]; // 品牌列表，例如 ["Bosch", "LG", "Siemens"]
  recommended_metric: "top_2_box" | "top_1_box" | "top_3_box" | "mean" | "top_positive";
  recommended_metric_label: string;
  available_metrics: Array<{ key: string; label: string }>;
  metrics_by_brand: BatteryBrandMetric[];
  all_metrics_by_brand?: BatteryBrandMetric[];
  recommended_visual: "horizontal_bar" | "bar" | "radar" | "grouped_bar";
  planning_reason: string;
}

/**
 * 校验实体名称是否为合法的品牌/调研实体
 * 严禁将 Sigma, Total, Net, Base, Sum, Mean 等统计汇总行或系统标识作为品牌！
 */
export function isInvalidBrandEntity(entity: string | null | undefined): boolean {
  if (!entity) return true;
  const n = entity.trim().toLowerCase();
  return (
    isSummaryOrStatisticRow(n) ||
    n === "sigma" ||
    n.startsWith("sigma ") ||
    n.startsWith("sigma:") ||
    n.startsWith("sigma(") ||
    n.includes("sigma") ||
    n.includes("σ") ||
    n === "total" ||
    n.startsWith("total ") ||
    n.startsWith("total:") ||
    n.startsWith("total(") ||
    n === "base" ||
    n.startsWith("base:") ||
    n.startsWith("base ") ||
    n === "net" ||
    n.startsWith("net ") ||
    n === "all" ||
    n === "all respondents" ||
    n === "sum" ||
    n === "mean" ||
    n === "median" ||
    n === "average" ||
    n === "总计" ||
    n === "合计" ||
    n === "均值" ||
    n === "样本量" ||
    n === "全体受访者" ||
    n === "未知品牌"
  );
}

/**
 * 分隔符与模式匹配提取题干主干 (Stem) 与对比实体 (Entity / Brand)
 */
export function extractStemAndEntity(
  title: string,
  questionNumber?: string
): { stem: string; entity: string | null } {
  if (!title) return { stem: "", entity: null };

  const raw = title.trim();

  // 1. 常见模式：Stem - Entity (如 "Q017. Meets_needs - Bosch", "Q14 - Brand A")
  const dashMatch = raw.match(/^(.*?)\s*[-–—]\s*([^–—-]{2,40})$/);
  if (dashMatch) {
    const stem = dashMatch[1].trim();
    const entity = dashMatch[2].trim();
    if (stem && entity && !stem.toLowerCase().startsWith("base") && !isInvalidBrandEntity(entity)) {
      return { stem, entity };
    }
  }

  // 2. 冒号模式：Stem : Entity (如 "Q017: Bosch", "Meets needs: LG")
  const colonMatch = raw.match(/^(.*?)\s*[:：]\s*([^:：]{2,40})$/);
  if (colonMatch) {
    const stem = colonMatch[1].trim();
    const entity = colonMatch[2].trim();
    if (stem && entity && !isInvalidBrandEntity(entity)) {
      return { stem, entity };
    }
  }

  // 3. 括号模式：Stem (Entity) 或 Stem [Entity] (如 "Meets_needs (Bosch)", "Q17 [LG]")
  const bracketMatch = raw.match(/^(.*?)\s*[(\[（【]([^)\]）】]{2,40})[)\]）】]$/);
  if (bracketMatch) {
    const stem = bracketMatch[1].trim();
    const entity = bracketMatch[2].trim();
    if (stem && entity && !isInvalidBrandEntity(entity)) {
      return { stem, entity };
    }
  }

  // 4. 下划线品牌后缀模式：如 "Q017_Meets_needs_Bosch"
  const underMatch = raw.match(/^(.*?)[_]([A-Za-z0-9\u4e00-\u9fa5]{2,30})$/);
  if (underMatch) {
    const stem = underMatch[1].replace(/_/g, " ").trim();
    const entity = underMatch[2].trim();
    if (stem && entity && !isInvalidBrandEntity(entity)) {
      return { stem, entity };
    }
  }

  return { stem: raw, entity: null };
}

/**
 * 从单张表中提取指定优先级对比指标（Top 2 Box -> Top 1 Box -> Top 3 Box -> Mean -> 积极选项）
 */
export function extractBestMetricFromTable(table: ExtractedTable): {
  availableMetrics: Array<{ key: string; label: string; rowLabel: string; value: number; display: string; isPercentage: boolean }>;
  bestMetric: BatteryBrandMetric | null;
  entityName: string;
} {
  const title = table.detected_question_text || table.detected_table_title || "";
  const { entity } = extractStemAndEntity(title, table.detected_question_number);
  const entityName = entity || table.detected_table_title || "未知品牌";

  const rows = table.rows || [];
  const availableMetrics: Array<{
    key: string;
    label: string;
    rowLabel: string;
    value: number;
    display: string;
    isPercentage: boolean;
  }> = [];

  for (const row of rows) {
    const label = row.original_label || "";
    // 跳过 Base、Sigma、Total 等纯汇总行
    if (label.toLowerCase().startsWith("base:") || label.toLowerCase().startsWith("sigma") || label.toLowerCase().startsWith("total") || label.toLowerCase().startsWith("net")) {
      continue;
    }

    const classification = classifyRatingMetricType(label);
    if (classification.metricKey !== "other") {
      const cell = row.cells?.[0];
      if (cell && typeof cell.parsed_value === "number") {
        const isPct = cell.parsed_unit === "percentage" || table.table_variant === "percentage";
        const val = Number(cell.parsed_value) * (isPct && Number(cell.parsed_value) <= 1 ? 100 : 1);
        const disp = cell.excel_display_value || (isPct ? `${val.toFixed(1)}%` : val.toFixed(2));
        availableMetrics.push({
          key: classification.metricKey,
          label: classification.displayName,
          rowLabel: label,
          value: val,
          display: disp,
          isPercentage: isPct,
        });
      }
    }
  }

  // 若无明确的 Top Box 或 Mean 行，寻找积极打分行（如 5分、4分、非常满意等）
  if (availableMetrics.length === 0) {
    for (const row of rows) {
      const label = row.original_label || "";
      if (isSummaryOrStatisticRow(label, row.detected_row_type)) continue;

      const norm = label.toLowerCase();
      if (
        norm.includes("5") ||
        norm.includes("非常满意") ||
        norm.includes("strongly agree") ||
        norm.includes("极高") ||
        norm.includes("非常好") ||
        norm.includes("excellent")
      ) {
        const cell = row.cells?.[0];
        if (cell && typeof cell.parsed_value === "number") {
          const isPct = cell.parsed_unit === "percentage" || table.table_variant === "percentage";
          const val = Number(cell.parsed_value) * (isPct && Number(cell.parsed_value) <= 1 ? 100 : 1);
          const disp = cell.excel_display_value || (isPct ? `${val.toFixed(1)}%` : val.toFixed(1));
          availableMetrics.push({
            key: "top_positive",
            label: `高评选项目 (${label})`,
            rowLabel: label,
            value: val,
            display: disp,
            isPercentage: isPct,
          });
          break;
        }
      }
    }
  }

  // 优先级排序：Top 2 Box > Top 1 Box > Top 3 Box > Mean > top_positive
  const priorityOrder = ["top_2_box", "top_1_box", "top_3_box", "mean", "top_positive"];
  let chosenItem = null;
  for (const prioKey of priorityOrder) {
    const found = availableMetrics.find((m) => m.key === prioKey);
    if (found) {
      chosenItem = found;
      break;
    }
  }

  if (!chosenItem && availableMetrics.length > 0) {
    chosenItem = availableMetrics[0];
  }

  const bestMetric: BatteryBrandMetric | null = chosenItem
    ? {
        entity: entityName,
        table_id: table.extracted_table_id,
        source_range: table.source_range,
        metric_key: chosenItem.key as any,
        metric_name: chosenItem.label,
        value: chosenItem.value,
        display: chosenItem.display,
        is_percentage: chosenItem.isPercentage,
      }
    : null;

  return {
    availableMetrics,
    bestMetric,
    entityName,
  };
}

/**
 * 核心聚类函数：根据规则引擎将传入的表格列表进行题组聚类
 * 返回：识别出的 Battery 题组列表，以及未成组的独立单表
 */
export function clusterTablesIntoBatteryGroups(tables: ExtractedTable[]): {
  batteryGroups: BatteryGroup[];
  standaloneTables: ExtractedTable[];
} {
  const stemBuckets = new Map<string, ExtractedTable[]>();

  // 1. 初步按题干主干归类
  for (const table of tables) {
    const title = table.detected_question_text || table.detected_table_title || "";
    const { stem, entity } = extractStemAndEntity(title, table.detected_question_number);

    // 必须成功切分出 entity，才考虑归入 battery 候选桶
    if (stem && entity) {
      const normalizedStem = stem.trim().toLowerCase().replace(/\s+/g, " ");
      if (!stemBuckets.has(normalizedStem)) {
        stemBuckets.set(normalizedStem, []);
      }
      stemBuckets.get(normalizedStem)!.push(table);
    }
  }

  const batteryGroups: BatteryGroup[] = [];
  const clusteredTableIds = new Set<string>();

  // 2. 校验与提炼题组（至少 2 个品牌）
  let groupIndex = 1;
  for (const [, groupTables] of stemBuckets.entries()) {
    // 校验与提炼题组（至少 2 个有效品牌）
    // 过滤掉实体名称属于无效汇总统计行（如 Sigma, Total, Net, Base）的表格
    const validGroupTables = groupTables.filter((tbl) => {
      const { entityName } = extractBestMetricFromTable(tbl);
      return !isInvalidBrandEntity(entityName);
    });

    if (validGroupTables.length >= 2) {
      // 提取每个品牌的指标
      const brandMetrics: BatteryBrandMetric[] = [];
      const commonMetricsMap = new Map<string, string>(); // metricKey -> label

      for (const tbl of validGroupTables) {
        const { availableMetrics, bestMetric, entityName } = extractBestMetricFromTable(tbl);
        if (isInvalidBrandEntity(entityName)) continue;
        availableMetrics.forEach((m) => commonMetricsMap.set(m.key, m.label));
        if (bestMetric) {
          brandMetrics.push(bestMetric);
        } else {
          // 若没有打分指标，使用第一行有效数据
          const firstRow = tbl.rows?.find(
            (r) => !isSummaryOrStatisticRow(r.original_label, r.detected_row_type)
          );
          const cell = firstRow?.cells?.[0];
          const val = typeof cell?.parsed_value === "number" ? Number(cell.parsed_value) : 0;
          brandMetrics.push({
            entity: entityName,
            table_id: tbl.extracted_table_id,
            source_range: tbl.source_range,
            metric_key: "other",
            metric_name: firstRow?.original_label || "首选项占比",
            value: val * (cell?.parsed_unit === "percentage" ? 100 : 1),
            display: cell?.excel_display_value || `${val}`,
            is_percentage: cell?.parsed_unit === "percentage" || tbl.table_variant === "percentage",
          });
        }
      }

      // 确定题组的统一对比指标（按 Top 2 Box > Top 1 Box > Top 3 Box > Mean 优先）
      let chosenMetricKey: "top_2_box" | "top_1_box" | "top_3_box" | "mean" | "top_positive" = "top_2_box";
      let chosenMetricLabel = "Top 2 Box (T2B)";

      if (commonMetricsMap.has("top_2_box")) {
        chosenMetricKey = "top_2_box";
        chosenMetricLabel = commonMetricsMap.get("top_2_box")!;
      } else if (commonMetricsMap.has("top_1_box")) {
        chosenMetricKey = "top_1_box";
        chosenMetricLabel = commonMetricsMap.get("top_1_box")!;
      } else if (commonMetricsMap.has("top_3_box")) {
        chosenMetricKey = "top_3_box";
        chosenMetricLabel = commonMetricsMap.get("top_3_box")!;
      } else if (commonMetricsMap.has("mean")) {
        chosenMetricKey = "mean";
        chosenMetricLabel = commonMetricsMap.get("mean")!;
      } else if (brandMetrics.length > 0) {
        chosenMetricKey = brandMetrics[0].metric_key as any;
        chosenMetricLabel = brandMetrics[0].metric_name;
      }

      // 收集该题组中所有品牌在全部可用指标（Top 2 Box, Top 1 Box, Mean 等）下的多维数据矩阵
      // 保证前端切片器切换任何指标都能立即响应并渲染真实数据
      const allMetricsByBrand: BatteryBrandMetric[] = [];
      validGroupTables.forEach((tbl) => {
        const { availableMetrics, entityName } = extractBestMetricFromTable(tbl);
        if (isInvalidBrandEntity(entityName)) return;
        availableMetrics.forEach((m) => {
          allMetricsByBrand.push({
            entity: entityName,
            table_id: tbl.extracted_table_id,
            source_range: tbl.source_range,
            metric_key: m.key as any,
            metric_name: m.label,
            value: m.value,
            display: m.display,
            is_percentage: m.isPercentage,
          });
        });
      });

      // 根据选定的统一指标，刷新各品牌数值（确保默认口径统一且排序）
      const unifiedBrandMetrics: BatteryBrandMetric[] = validGroupTables.map((tbl) => {
        const { availableMetrics, entityName } = extractBestMetricFromTable(tbl);
        const match = availableMetrics.find((m) => m.key === chosenMetricKey);
        if (match) {
          return {
            entity: entityName,
            table_id: tbl.extracted_table_id,
            source_range: tbl.source_range,
            metric_key: match.key as any,
            metric_name: match.label,
            value: match.value,
            display: match.display,
            is_percentage: match.isPercentage,
          };
        }
        // 回退到默认
        const fallback = availableMetrics[0];
        return {
          entity: entityName,
          table_id: tbl.extracted_table_id,
          source_range: tbl.source_range,
          metric_key: fallback ? (fallback.key as any) : "other",
          metric_name: fallback ? fallback.label : "指标",
          value: fallback ? fallback.value : 0,
          display: fallback ? fallback.display : "-",
          is_percentage: fallback ? fallback.isPercentage : false,
        };
      });

      // 按数值降序排列（方便对比看板）
      unifiedBrandMetrics.sort((a, b) => b.value - a.value);

      const firstTitle = validGroupTables[0].detected_question_text || validGroupTables[0].detected_table_title || "";
      const { stem } = extractStemAndEntity(firstTitle, validGroupTables[0].detected_question_number);
      const stemTitle = stem || `题组 ${groupIndex}`;

      const entities = unifiedBrandMetrics.map((m) => m.entity);

      const recommendedVisual: "horizontal_bar" | "bar" = "horizontal_bar";

      const batteryGroup: BatteryGroup = {
        battery_group_id: `bg_${groupIndex++}_${validGroupTables[0].extracted_table_id}`,
        stem_title: stemTitle,
        question_number: validGroupTables[0].detected_question_number,
        tables: validGroupTables,
        entities,
        recommended_metric: chosenMetricKey,
        recommended_metric_label: chosenMetricLabel,
        available_metrics: Array.from(commonMetricsMap.entries()).map(([k, v]) => ({ key: k, label: v })),
        // aggregated_data 包含所有指标条目，保证前端切片器切换任意指标都有数据
        metrics_by_brand: allMetricsByBrand.length > 0 ? allMetricsByBrand : unifiedBrandMetrics,
        all_metrics_by_brand: allMetricsByBrand,
        recommended_visual: recommendedVisual,
        planning_reason: `识别为跨品牌打分题组 (${entities.join(" / ")})，优先使用 ${chosenMetricLabel} 进行品牌横向对比`,
      };

      batteryGroups.push(batteryGroup);
      validGroupTables.forEach((t) => clusteredTableIds.add(t.extracted_table_id));
    }
  }

  // 3. 未归入题组的独立单表
  const standaloneTables = tables.filter((t) => !clusteredTableIds.has(t.extracted_table_id));

  return {
    batteryGroups,
    standaloneTables,
  };
}
