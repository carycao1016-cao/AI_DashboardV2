# 数据与 JSON 规范

## 中文工作版 v1.1

**英文原稿：** `docs/design/en/02_Data_and_JSON_Specification_v1.1.md`  
**用途：** Parser、Golden 标注、语义合并和 Dashboard 发布的共同数据基线。

## 1. 总体原则

- 原始 Workbook/CSV 是唯一数值事实来源。
- AI 只提出结构和分类建议；Python 回读并验证源单元格。
- 物理表按 `workbook -> sheet -> source_range` 保存，不能只按题号保存。
- 每个物理表拥有自己的完整 Header 路径和显著性映射。
- 所有可发布数值必须有 Source Lineage。
- 缺失值、不可用值、抑制值和数字 0 不得互相转换。

## 2. JSON 层次

### 2.1 Workbook 扫描摘要

`WorkbookScanSummary` 记录文件元数据、编码、Sheet 摘要和扫描状态。Sheet 摘要包括：

- Sheet 名称和顺序。
- 行列范围、非空密度和空行区间。
- 文本、数字、百分比样式计数。
- 合并单元格、隐藏行列和分页标记。
- `expected_outline_status`：`complete`、`needs_more_context`、`ambiguous`、`not_a_table`。

`Index`、`Summary` 等非数据 Sheet 必须保留为 `not_a_table` 负例，不能强行生成物理表。

### 2.2 TableBoundaryProposal

AI 的边界提案只包含绝对坐标和结构角色：

```json
{
  "sheet_name": "Percentages_Sig1",
  "table_range": "A12:AW18",
  "title_rows": [12],
  "header_rows": [14, 15],
  "base_rows": [16],
  "data_rows": [17, 18],
  "footnote_rows": [],
  "significance_locations": ["C17:AW18"],
  "significance_layout": "adjacent_column",
  "status": "complete",
  "evidence": ["row_12_question_text", "row_16_base_pattern"]
}
```

Title、Header、Base、data 和 footnote 区域不得互相重叠；显著性可以与 Header 或 data 重叠，但必须有明确布局解释。

## 3. ExtractedTable

每张物理表至少包含：

- `extracted_table_id`
- Workbook、Sheet、源范围和来源文件版本
- `question_number`、`question_text`、`table_title`
- `title_rows`、`header_rows`、`base_rows`、`data_rows`、`footnote_rows`
- `header_depth`
- `has_explicit_base`
- `metric_type`
- `table_type`
- `significance_schema`
- `extracted_header_ids`
- `extracted_row_ids`
- `validation_status`

题号、题文和表名可由 Creator 修订，但不能因此修改物理来源范围。来源范围和结构字段仍由 Python 验证。

## 4. Header 与显著性

### 4.1 Header 路径

```json
{
  "extracted_header_id": "hdr_s1_male",
  "header_path": ["Market", "Gender", "Male"],
  "display_label": "Male",
  "source_cells": ["D14", "D15"]
}
```

不同物理表允许使用不同 Header。超过三层时保留全部路径并标记 `header_depth_exceeds_mvp`，禁止自动跨表链接。

### 4.2 significance_schema

```json
{
  "presence": "available",
  "representation": "adjacent_column",
  "label_map": {
    "A": ["hdr_total"],
    "B": ["hdr_male"]
  },
  "direction": "unknown",
  "mapping_status": "mapped"
}
```

支持 `header_inline`、`separate_label_row`、`adjacent_column`、`following_row`、`inline_value`、`separate_sheet`、`mixed`、`none` 和 `unknown`。

显著性标签大小写敏感。`A` 和 `a` 默认是两个不同标签，不得当作 Excel 列字母。未知标签保留原文和来源单元格，并进入 Review。

## 5. ExtractedCell 与值解析

```json
{
  "extracted_cell_id": "cell_s1_male",
  "extracted_table_id": "tbl_s1",
  "source_sheet": "Percentages_Sig1",
  "source_cell": "D17",
  "raw_value": 0.439,
  "raw_type": "number",
  "excel_display_value": "43.9%",
  "excel_number_format": "0.0%",
  "parsed_value": 0.439,
  "parsed_unit": "percentage",
  "precision_source": "excel_stored_value",
  "availability_status": "available",
  "original_significance_marker": "C",
  "significance_marker_source_cell": "E17",
  "significance_representation": "adjacent_column",
  "significance_referenced_header_ids": ["hdr_female"],
  "significance_mapping_status": "mapped"
}
```

必须同时保留：

- `raw_value`：原始存储值或原始文本。
- `excel_display_value`：表格按格式展示的值。
- `parsed_value`：只有单位和上下文已确定时才填写。
- `parsed_unit`：`count`、`percentage`、`mean` 等。
- `precision_source`：`excel_stored_value`、`formula_cached_value`、`displayed_value_only`、`text_parsed` 或 `unknown`。
- `availability_status`：`available`、`not_asked`、`not_available`、`suppressed`、`not_applicable`、`recognition_pending`、`source_conflict`。

### 5.1 特殊值

- `-`、`—`、空白和不可用符号保留原始展示文本，解析值为 `null`，不能变成 0。
- `<1%` 是小于 0.01 的约束，不得写成精确 0.01。
- `*`、`**` 只有在脚注确认时才解析为 `small_base`、`very_small_base`。
- `20%A`、`20ABC`、`20%ABC` 保留完整原文；解析值和显著性标记必须拆开记录。

## 6. Base、指标与变体

Base 只从当前物理表明确提取；缺失 Base 为空，不继承、不显示。Count、Percentage、Mean 和官方显著性变体只有在题号、标题、选项、完整 Header、Market、Wave 和 Base 完全一致时才能链接。

同一物理表中明确交替出现 Count/Percentage 时，使用 `combined`，但保持独立的 metric block 和来源坐标。

## 7. Source Lineage

```json
{
  "source_lineage_id": "lin_001",
  "source_file_version_id": "sfv_001",
  "sheet_snapshot_id": "sheet_001",
  "extracted_table_id": "tbl_s1",
  "source_cell": "D17",
  "original_excel_display": "43.9%",
  "structured_display": "43.9%",
  "dashboard_display": "43.9%"
}
```

每个发布结果至少引用一个 Lineage。来源坐标、原始展示值和结构化值之间出现冲突时，结果不能自动发布。

## 8. 发布与校验

发布前检查：范围有效、Header 完整、单位兼容、Base 规则正确、显著性已映射、来源 Lineage 存在、没有变体身份冲突。

验证结果为 `accepted`、`adjusted`、`rejected` 或 `review_required`。人工 Review 是异常路径，不是默认流程；但明确的人工修订是最终确认，不能被自动质量检查再次拦截。
