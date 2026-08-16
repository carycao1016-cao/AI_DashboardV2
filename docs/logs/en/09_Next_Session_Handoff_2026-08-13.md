# AI Dashboard 明日工作交接

**交接日期：** 2026-08-13  
**工作目录：** `/Users/carycao/Downloads/0_AI_Dashboard`  
**明日开始先读本文，不需要重新通读全部 Markdown。**

## 当前状态

产品规格讨论已经从产品蓝图进入“可实现规则确认”阶段。当前核心方向是：

```text
Python 扫描所有 Sheet
-> 生成受限结构摘要
-> AI 提议候选表边界和区域
-> Python 回读原始坐标并确定性验证
-> 生成物理表 JSON
-> 严格关联可确认的逻辑变体
-> Quick Validation
-> 按结果粒度发布
```

AI 不负责最终数值、统计计算、权限、发布决策或未经验证的映射写入。

## 已确认规则

- 第一阶段支持中文和英文。
- 输入是通用 Excel/CSV Tab Book，不要求固定格式；A 列是线索，不是硬规则。
- 分块只用于 AI 结构识别成本控制；Python 始终保留并读取完整原始 Workbook。
- AI 响应失败按三层处理：整段不可读则重试当前区块；部分候选无效则保留有效候选；JSON 合法但源数据验证失败则进入 Review。每区块最多自动重试 2 次。
- 表头按物理表独立解析，MVP 原生支持 1-3 层；超过 3 层保留证据但限制自动高级能力。
- 没有题号或本表没有 Base 时仍保留物理表；不跨表/跨 Sheet 推断 Base，未明确 Base 不显示。
- 显著性是表级局部 schema，支持内嵌表头、标签行、旁列、下一行、数值内嵌、独立 Sheet 和混合布局。`A/a/B/b` 是大小写敏感的局部标签，不是 Excel 列名。
- `ABC` 只表示比较目标，不推断高于/低于；方向默认为 `unknown`。
- Count/Percentage/Sig 自动合并非常严格：表名、题号、选项、完整 Header Path、Market、Wave、Base 必须规范化后完全一致。单表内稳定交替的 Count/% 行可直接合并为一个物理表的多个指标块。
- `20%`、`20`、`0.2` 只有在格式和行上下文足够明确时才标准化；`<1%` 是上限约束，不能参与精确计算；`*`/`**` 保留为小样本限定符；不可用值永远不等于 0，客户端可统一显示 `-`。
- CSV 保留原始字节并做编码置信度判断；低置信度文本不发送给 AI、不参与身份匹配或发布。
- 中英文翻译支持上传翻译文件和 AI 初译；人工/上传译文优先。发布含 AI 初译的语言版本必须由 Creator 明确接受并留下审计。
- 发布按结果/视觉粒度排除阻塞内容，其余已验证内容可以发布，并生成排除报告。
- Review 是异常兜底，不是正常逐表人工流程；中置信度但 Python 校验通过的表可自动接受并提高 Quick Validation 抽样权重。

## 最近提交

- `fb1d118`：Parser validation、严格变体合并、数值/CSV、发布和双语规则。
- `b4d7e44`：通用边界识别、显著性 schema、AI 中间处理契约。

## 明日第一项工作

不要先重新阅读全部文档。按以下顺序开始：

1. 阅读本交接文档。
2. 阅读 `02_Data_and_JSON_Specification_v1.1.md` 中的 `WorkbookScanSummary`、`ExtractedTable`、`ExtractedCell`、`Official Significance`、`Publication Gate` 章节。
3. 阅读 `06_Python_Technical_Architecture.md` 中的 Workbook Extraction、Table Detection、Header/Significance Parsing、Table Variants 章节。
4. 继续讨论并冻结 `WorkbookScanSummary` 的实际字段和压缩算法。
5. 随后为三个中间/最终对象设计第一版 JSON Schema：
   - `WorkbookScanSummary`
   - `TableBoundaryProposal`
   - `ExtractedTable` 及其 Header/Cell 结构
6. 用 `PoC/Quantum Tab` 和 `PoC/Decipher Tab` 的样例做离线结构验证，再决定是否开始写 Parser POC。

## 尚未冻结的问题

- `WorkbookScanSummary` 的最终字段、区块大小和候选窗口大小。
- 候选行本地规则的具体正则和信号评分。
- `BoundaryValidationResult` 的错误码与自动修正范围。
- CSV 翻译文件的具体格式及稳定对象 ID 映射方式。
- 第一版 Parser POC 的目录结构、运行方式和 Golden fixture 选择。

## 工作边界提醒

- 先继续规格确认，再写代码；不要在规则未冻结时重构稳定模块。
- 所有 AI 结果都必须可验证、可追溯、可回退。
- 不把题号、日期、品牌、业务文本当作“验证枚举”；使用通用结构信号和规范化规则。
- 修改规格后继续使用独立的本地 Git 提交，并同步更新修改记录。
