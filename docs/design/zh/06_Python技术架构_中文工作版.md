# Python 技术架构

## 中文工作版

**英文原稿：** `docs/design/en/06_Python_Technical_Architecture.md`

## 1. 架构边界

Python 负责 Workbook/CSV 扫描、AI 请求编排、原始坐标回读、确定性验证、值解析、变体链接、Lineage 和 Extraction Snapshot。AI Provider 通过结构化生成适配器接入，领域代码不能直接导入具体 Provider SDK 或硬编码模型名。

## 2. 处理流水线

```text
Workbook 扫描
-> Layer 1 Sheet Outline
-> AI 粗粒度候选
-> Layer 2 Detail Window
-> AI 精确 TableBoundaryProposal
-> Python BoundaryValidationResult
-> Table 结构解析
-> Header 层级解析
-> 行分类
-> 值与显著性解析
-> Extraction Snapshot
```

## 3. 扫描与 AI 边界

Python 扫描每个 Sheet，保留行列、原始值、类型、公式、缓存值、数字格式、合并区域、隐藏状态和必要样式签名。扫描摘要只发送结构事实，不发送完整单元格数据。

Layer 1 只做召回，返回候选范围和状态。Layer 2 只发送候选范围附近的 Detail Window，默认前后文 20 行，可配置。每行最多提供有限的按位置抽样，不让 AI 直接接收完整大 Sheet。

AI 返回的坐标必须是绝对 Excel 坐标。AI 不返回最终数值、不计算显著性、不替换源文件证据。

`#page` 记录为分页线索，不能自动成为题号、表名或表格区域。没有分页标记时，使用标题、Header、Base、数据密度和空白区间等事实。

## 4. 确定性验证

Python 回读 AI 提议的原始坐标，验证：

- 范围在 Sheet 边界内。
- title、Header、Base、data、footnote 不发生非法重叠。
- 显著性重叠必须有已声明的布局。
- Header 映射能覆盖业务值列。
- Base 只在当前表明确存在时写入。
- 数值、展示格式、单位和可用状态一致。
- 显著性标签全部能通过本表 label map 映射。
- 物理表身份没有冲突。

允许的自动调整只有：去掉外部空白边界、纳入合并标题/Header、修正明显终止坐标、纳入已验证的相邻显著性行/列和尾部脚注。不能猜测业务含义或合并不一致表。

## 5. 值解析

解析器同时保存 raw value 和 best-available display value。只有源格式、行上下文和指标类型共同证明单位时才填写 parsed value。

- `-`、`—`、空白和不可用符号不是 0。
- `<1%` 记录为上界约束。
- `*` 和 `**` 保留源限定符，并在脚注支持时解析样本风险。
- `20%A`、`20ABC`、`20%ABC` 使用 `inline_value`，原文不可丢失。

CSV 依次尝试 UTF-8/BOM、GB18030、GBK 和 Big5，记录最终编码及置信度。低置信度解码不能进入 AI、匹配、变体链接或发布。

## 6. 显著性解析

显著性按物理表检测，不能按 Quantum/Decipher 名称预设。支持相邻列、下一行、同单元格、独立 Sheet 和混合布局。

每个物理表建立大小写敏感的 `label -> extracted_header_id` 映射。解析结果保留：原始 marker、marker 源单元格、呈现方式、映射 Header ID 和映射状态。未映射 marker 不得被 AI 猜测。

## 7. 变体链接

物理表始终独立可追溯。只有题号、标题、选项、完整 Header 路径、Market、Wave 和 Base 完全一致时，Count、Percentage、Mean 和显著性变体才可以链接。

同一表中重复且明确的 Count/Percentage 行可生成 `combined` 表，但必须保留各 metric block 的来源坐标。

## 8. Provider 与成本

Provider 选择由配置决定，比较结构化 JSON 可靠性、上下文容量、隐私和留存、数据驻留、审计、成本、延迟和 Golden 结果。任何模型都必须通过相同的 Contract、Boundary Validation 和 Golden 评估。

## 9. 结果与发布

每个 AI 提案产生 `accepted`、`adjusted`、`rejected` 或 `review_required`。中置信度只有在确定性验证完整通过时才可自动接受，并提高 Quick Data Validation 抽样权重。

发布前必须保证所有结果有 Source Lineage、单位已确定、来源没有冲突、官方显著性已验证。异常结果可以按结果粒度排除并生成排除报告，不能用 Dashboard 展示值反向充当原始真值。

## 10. 测试基线

Golden 表集目标为 20-30 张物理表，覆盖 Quantum、Decipher、多个显著性布局、交替 Count/Percentage、合并/未合并 Header、缺失 Base、非 A 列题文、深层 Header 和复杂错误区块。

第一阶段要求：Layer 1 覆盖率 100%、Layer 2 最终结构准确率至少 95%、错误自动接受为 0、`review_required` 不超过 10%。
