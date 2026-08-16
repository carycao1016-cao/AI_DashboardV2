# Ark Smoke Fixture

这里仅保留 Quantum `Tabs_%95.xlsx` 的第一个物理表：`ban1_%Sig` 的第 1–78 行、A–AB 列。

`fixtures/` 下另有两个 Decipher 小样本：一个是 `Percentages_Sig1` 的相邻列显著性表，一个是 `Index` 的 `not_a_table` 参考 Sheet。

用途：

- 验证豆包 DeepSeek 和豆包自有模型的 Ark API 连通性；
- 验证 `SheetOutlineResponse` / `DetailWindowResponse` 的结构化输出；
- 估算单表请求的 token 和响应稳定性。

## 运行与产物

`parser_poc.run_ark_smoke` 始终将模型结构识别报告与 Python 回读的业务值分开：

- `--output`：仅包含候选数、proposal 范围、物理校验结果和调用状态，不写入业务文本或数值；
- `--extracted-output`：仅在 proposal 通过 Python 物理校验后，按源 Excel 坐标回读的表格 JSON。模型不会生成该文件中的业务数值。

Quantum 的下一行显著性 Smoke：

```bash
.venv/bin/python -m parser_poc.run_ark_smoke \
  --profile deepseek \
  --input outputs/ark_smoke/Tabs_%95_first_table.xlsx \
  --sheet ban1_%Sig \
  --expected-range A2:AB77 \
  --metric-type percentage \
  --output outputs/ark_smoke/deepseek_smoke_report.json \
  --extracted-output outputs/ark_smoke/deepseek_extracted_table.json
```

Decipher 的相邻列显著性 Smoke：

```bash
.venv/bin/python -m parser_poc.run_ark_smoke \
  --profile deepseek \
  --input outputs/ark_smoke/fixtures/Decipher_Percentages_Sig1_first_table.xlsx \
  --sheet Percentages_Sig1 \
  --expected-range A12:AW18 \
  --metric-type percentage \
  --output outputs/ark_smoke/decipher_extraction_smoke_report.json \
  --extracted-output outputs/ark_smoke/decipher_extracted_table.json
```

`exact_range_match=true` 才表示该 fixture 的范围与 Golden 一致。`accepted` 或 `adjusted` 只说明 Python 已完成物理边界校验；结构语义仍应通过 Golden 评估覆盖率与案例验证。

它不是完整 Golden，也不用于发布或替代原始 PoC。原始文件仍位于 `PoC/Quantum Tab/Tabs_%95.xlsx`。

重新生成：

```bash
python3 -m parser_poc.create_ark_smoke_fixture
```
