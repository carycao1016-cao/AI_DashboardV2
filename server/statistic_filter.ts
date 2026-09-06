/**
 * 市场研究与交叉分析表（Market Research Crosstab）统计汇总行过滤与识别引擎
 * 
 * 严格遵从市场研究行业规范：
 * 1. 汇总与全集：Sigma (Σ), Total, Net, Sum, 合计, 总计
 * 2. 样本容量基数：Base, Sample Size, 样本量, Unweighted Base, Weighted Base
 * 3. 统计描述指标：Mean (均值), Median/Media (中位数), Std Dev / Standard Deviation (标准差), Std Err / Standard Error (标准误), Variance (方差)
 * 4. 统计箱体指标：Top 1/2/3 Box (T1B/T2B/T3B), Bottom 1/2 Box (B1B/B2B)
 */

/**
 * 判定某行是否为汇总、基数或统计描述指标行
 * 这些行通常不能作为普通分类选项混入条形图、饼图、雷达图等图表中
 */
export function isSummaryOrStatisticRow(label: string, detectedRowType?: string): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();

  // 1. Base 行
  if (
    detectedRowType === "base" ||
    normalized.startsWith("base:") ||
    normalized.startsWith("base ") ||
    normalized === "base" ||
    normalized.includes("sample size") ||
    normalized.includes("样本量") ||
    normalized.startsWith("unweighted base") ||
    normalized.startsWith("weighted base")
  ) {
    return true;
  }

  // 2. 汇总与全集行：Sigma, Total, Net, Sum
  if (
    normalized === "sigma" ||
    normalized.startsWith("sigma ") ||
    normalized.startsWith("sigma:") ||
    normalized.startsWith("sigma(") ||
    normalized.includes("σ") ||
    normalized === "total" ||
    normalized.startsWith("total ") ||
    normalized.startsWith("total:") ||
    normalized.startsWith("total(") ||
    normalized === "sum" ||
    normalized === "总计" ||
    normalized === "合计" ||
    normalized === "net" ||
    normalized.startsWith("net ") ||
    normalized.startsWith("net:")
  ) {
    return true;
  }

  // 3. 统计描述指标行：Mean, Median, Std Dev, Std Err, Variance
  if (
    normalized === "mean" ||
    normalized.startsWith("mean ") ||
    normalized.startsWith("mean:") ||
    normalized.startsWith("mean(") ||
    normalized === "均值" ||
    normalized === "平均值" ||
    normalized === "平均分" ||
    normalized === "average" ||
    normalized.startsWith("average ") ||
    normalized === "median" ||
    normalized === "media" ||
    normalized.startsWith("median ") ||
    normalized.startsWith("media ") ||
    normalized === "中位数" ||
    normalized === "std dev" ||
    normalized === "std.dev" ||
    normalized === "std dev." ||
    normalized === "standard deviation" ||
    normalized === "标准差" ||
    normalized.startsWith("std dev") ||
    normalized.startsWith("std. dev") ||
    normalized.startsWith("std.dev") ||
    normalized === "sd" ||
    normalized === "std err" ||
    normalized === "std.err" ||
    normalized === "std err." ||
    normalized === "standard error" ||
    normalized === "标准误" ||
    normalized.startsWith("std err") ||
    normalized.startsWith("std. err") ||
    normalized.startsWith("std.err") ||
    normalized === "se" ||
    normalized === "variance" ||
    normalized === "方差"
  ) {
    return true;
  }

  return false;
}

/**
 * 判定某行是否为打分箱体聚合指标（Top Box / Bottom Box）
 */
export function isBoxScoreRow(label: string): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();
  return (
    normalized.includes("top 1") ||
    normalized.includes("top 2") ||
    normalized.includes("top 3") ||
    normalized.includes("top-1") ||
    normalized.includes("top-2") ||
    normalized.includes("top-3") ||
    normalized.includes("top box") ||
    normalized.includes("top-box") ||
    normalized.includes("t2b") ||
    normalized.includes("t1b") ||
    normalized.includes("t3b") ||
    normalized.includes("bottom 1") ||
    normalized.includes("bottom 2") ||
    normalized.includes("bottom 3") ||
    normalized.includes("bottom-1") ||
    normalized.includes("bottom-2") ||
    normalized.includes("b2b") ||
    normalized.includes("b1b") ||
    normalized.includes("agree (4+5)") ||
    normalized.includes("agree(4+5)") ||
    normalized.includes("非常满意+满意") ||
    normalized.includes("net positive")
  );
}

/**
 * 判定是否为纯净的分类选项数据行（既非统计汇总行，也非箱体聚合行）
 */
export function isPureDataRow(label: string, detectedRowType?: string): boolean {
  return !isSummaryOrStatisticRow(label, detectedRowType) && !isBoxScoreRow(label);
}

/**
 * 从一行标签中识别具体的箱体或统计类型，并给出优先级权重
 * Top 2 Box 优先级最高（市场研究最常用 KPI），其次 Top 1 Box，再次 Top 3 Box，再次 Mean
 */
export function classifyRatingMetricType(label: string): {
  metricKey: "top_2_box" | "top_1_box" | "top_3_box" | "mean" | "other";
  displayName: string;
  priority: number;
} {
  const normalized = label.trim().toLowerCase();

  // 1. Top 2 Box (最优先)
  if (
    normalized.includes("top 2") ||
    normalized.includes("top-2") ||
    normalized.includes("t2b") ||
    normalized.includes("agree (4+5)") ||
    normalized.includes("agree(4+5)") ||
    normalized.includes("非常满意+满意")
  ) {
    return { metricKey: "top_2_box", displayName: "Top 2 Box (T2B)", priority: 1 };
  }

  // 2. Top 1 Box
  if (
    normalized.includes("top 1") ||
    normalized.includes("top-1") ||
    normalized.includes("t1b") ||
    normalized.includes("top box") ||
    normalized.includes("strongly agree")
  ) {
    return { metricKey: "top_1_box", displayName: "Top 1 Box (T1B)", priority: 2 };
  }

  // 3. Top 3 Box
  if (
    normalized.includes("top 3") ||
    normalized.includes("top-3") ||
    normalized.includes("t3b")
  ) {
    return { metricKey: "top_3_box", displayName: "Top 3 Box (T3B)", priority: 3 };
  }

  // 4. Mean (均值)
  if (
    normalized === "mean" ||
    normalized.startsWith("mean ") ||
    normalized.startsWith("mean:") ||
    normalized.startsWith("mean(") ||
    normalized === "均值" ||
    normalized === "平均值" ||
    normalized === "平均分" ||
    normalized === "average" ||
    normalized.startsWith("average ")
  ) {
    return { metricKey: "mean", displayName: "Mean (均值)", priority: 4 };
  }

  return { metricKey: "other", displayName: label, priority: 99 };
}
