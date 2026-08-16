# AI 研究看板平台

## 产品需求文档（MVP 中文工作版）

**对应英文原稿：** `docs/design/en/01_AI_Research_Dashboard_PRD_MVP_v1.2.md`  
**版本：** v1.2  
**语言规则：** 本文件是中文工作版；英文原稿保留不覆盖。

## 1. 产品概述

平台接收市场研究 Tab Book（Excel 或 CSV），识别 Workbook、Sheet、物理表、题号、标题、Header、Base、指标、显著性和来源位置，生成可校验的结构化 JSON，并据此生成可 Review、可发布的研究看板。

MVP 的核心顺序是：

1. Creator 上传原始文件。
2. Python 扫描全部 Sheet，生成轻量结构摘要。
3. AI 根据摘要和必要的 Detail Window 提出候选边界及结构角色。
4. Python 回读原始坐标，验证边界、Header、Base、数值和显著性。
5. 保存独立可追溯的物理表和 Cell Truth。
6. 生成 Draft 看板，Creator Review 后再发布。

AI 只提出结构建议，不直接生成最终数值、不替代原始单元格证据，也不根据置信度单独决定发布。

## 2. 产品目标与非目标

### 2.1 MVP 目标

- 支持通用 Tab 识别，不把某个厂商或 `#page` 作为固定格式契约。
- 支持每个 Sheet 独立识别表格，保留精确的 Excel 范围。
- 支持 1-3 层 Header；更深层级保留原始证据并标记风险。
- 支持 Count、Percentage、Mean、Median、Top/Bottom Box、Net 和官方显著性。
- 支持 Decipher 相邻列显著性、Quantum 下一行显著性和同单元格显著性。
- 保留原始值、Excel 展示值、解析值、单位、精度来源和可用状态。
- 缺失值、`-`、`<1%`、`*` 和 `**` 与数字 0 严格区分。
- 物理表先按 Sheet 和范围独立保存，只有严格一致时才合并 Count、Percentage 和显著性变体。
- 尽量减少人工 Review；只有无法确定、来源冲突或验证失败时才进入 Review。

### 2.2 MVP 非目标

- 不重建原始调查问卷或响应级数据库。
- 不用 AI 重新计算官方显著性。
- 不允许 AI 猜测缺失 Base、Header 映射或显著性方向。
- 不把模糊文本相似度、Sheet 名或物理位置当作变体合并证据。
- 不在未完成验证时直接发布 Dashboard。

## 3. 用户角色

- **Creator：** 上传文件、确认识别结果、修正题号/标题/映射、接受翻译草稿并发布。
- **Admin：** 管理项目、权限、模型配置、审计和恢复。
- **Client Viewer：** 只查看已发布的 Dashboard，不接触原始文件和未发布数据。

## 4. Workbook 与物理表识别

### 4.1 通用扫描

Python 必须读取 Workbook 的全部 Sheet。A 列只能作为线索，不能作为识别合同；题号可能在其他列、合并区域或标题文本中。

Sheet 摘要至少保留：Sheet 名称、行列边界、非空密度、文本/数字/百分比样式计数、空行区间、合并区域、隐藏信息、首个非空单元格和分页/结构标记。

`#page` 可以作为 `page_marker` 边界线索，但不是题号、表名或物理表的一部分。没有 `#page` 的 Decipher Sheet 必须依靠标题、Header、Base、数据模式和空白区间识别。

### 4.2 两层 AI 识别

- **Layer 1：** 接收轻量 Sheet Outline，目标是高召回，返回粗粒度候选区间或 `complete`、`needs_more_context`、`ambiguous`、`not_a_table`。
- **Layer 2：** 只对 Layer 1 候选发送 Detail Window，返回绝对 Excel 坐标以及 title/header/base/data/footnote/significance 区域。
- Python 不预先替 AI 猜题号、表边界或 Base；Python 只负责扫描事实、回读坐标和最终验证。
- AI 请求失败只重试当前区块；无效候选不能丢弃同一请求中的有效候选。

`Index`、`Summary` 这类目录或样本定义 Sheet 可以被标记为 `not_a_table`，不能为了凑数量硬拆成物理表。

### 4.3 Header

每张物理表拥有自己的完整 Header 路径。MVP 原生支持 1-3 层；不同表即使位于同一个 Sheet，也可以使用不同 Header 结构。

表头代码 `A`、`a`、`B`、`b` 是源文件的大小写敏感标签，不是 Excel 列字母。每个物理表必须建立独立的 `label -> extracted_header_id` 映射。

## 5. 指标与显著性

### 5.1 显著性布局

按物理表逐张检测，不依据厂商名称推断。支持：

- `header_inline`
- `separate_label_row`
- `adjacent_column`
- `following_row`
- `inline_value`
- `separate_sheet`
- `mixed`
- `none`
- `unknown`

同单元格案例必须保留完整原文。例如：

```json
{
  "raw_value": "20%ABC",
  "excel_display_value": "20%ABC",
  "parsed_value": 0.2,
  "parsed_unit": "percentage",
  "original_significance_marker": "ABC",
  "significance_representation": "inline_value"
}
```

如果显著性标签无法完整映射，保留原始标记和来源单元格，数值可以继续保留，但显著性必须隐藏并进入 Review。

### 5.2 值的真值字段

每个抽取单元格至少记录：

- `raw_value`：Excel/CSV 原始存储值。
- `excel_display_value`：按表格格式呈现的原始文本。
- `parsed_value`：只有在单位和上下文明确时才填写。
- `parsed_unit`：`count`、`percentage`、`mean` 等。
- `precision_source`：存储值、公式缓存、展示值或文本解析。
- `availability_status`：可用、未询问、不可用、抑制、未适用等。
- `source_cell`、`source_range` 和来源文件版本。

`-` 不能转换成 0；`<1%` 是上界约束，不是精确的 0.01；`*` 和 `**` 只有在源文件脚注支持时才解析为小样本标记。

## 6. 变体合并

Count、Percentage、Mean 和官方显著性可以是同一语义题目的物理变体，但必须严格匹配：

- 表名。
- 题号。
- 选项内容。
- 完整 Header 路径。
- Market、Wave 和 Base 定义。
- 行结构和指标互补关系。

允许的规范化仅包括首尾空格、重复空格、换行、Tab、全角/半角空格、不可见字符和 Unicode 表示差异。不能忽略标点、大小写、单位、括号内容或题号前缀。

同一张物理表中明确交替出现 Count/Percentage 时，可以生成一个 `combined` 提取，但必须分别保留两个指标块和各自来源坐标。

## 7. Base 与缺失数据

只有在本张物理表中明确识别到 Base 时才记录和展示 Base。不能从相邻表、其他 Sheet 或同题变体继承 Base。没有 Base 时保持空值，不显示 Base，也不能支持依赖 Base 的比较或显著性解释。

## 8. 校验与发布

Python 对 AI 提案执行范围、区域重叠、Header 映射、数值读取、Base（如存在）、显著性（如存在）和表身份验证，结果为：

- `accepted`
- `adjusted`
- `rejected`
- `review_required`

自动调整只允许修正空白外边界、合并 Header 范围、明显终止坐标、已验证的相邻显著性行/列和尾部脚注。不能猜业务含义、继承 Base、合并不一致表或补写数值。

发布前必须满足：所有结果有来源 Lineage，数值和单位已验证，显著性为官方且已映射，没有未解决的来源冲突。失败结果可以按结果粒度排除并生成排除报告，不必自动阻塞所有可发布内容。

## 9. Golden 测试要求

Golden 集合以 20-30 张物理表为第一阶段目标，覆盖 Quantum、Decipher、不同显著性布局、交替 Count/Percentage、合并/未合并 Header、缺失 Base、题文不在 A 列、深层 Header 和错误区块。

每张表记录准确的标题、Header、Base、数据、脚注和显著性区域，并提供 3-5 个 Cell Truth：Base、普通 Count/Percentage、显著性标记和异常值（如存在）。

第一阶段门槛：Layer 1 覆盖率 100%、Layer 2 最终结构准确率至少 95%、错误自动接受为 0、`review_required` 不超过 10%。

## 10. 当前实施边界

本中文工作版用于指导当前 PoC 和 Golden 标注，优先遵循我们已经确认的对话规则。与英文原稿存在差异时，必须在对应变更日志中记录原因，并同步更新英文原稿和中文版本。
