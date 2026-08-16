# Ark Smoke Fixture

这里仅保留 Quantum `Tabs_%95.xlsx` 的第一个物理表：`ban1_%Sig` 的第 1–78 行、A–AB 列。

用途：

- 验证豆包 DeepSeek 和豆包自有模型的 Ark API 连通性；
- 验证 `SheetOutlineResponse` / `DetailWindowResponse` 的结构化输出；
- 估算单表请求的 token 和响应稳定性。

它不是完整 Golden，也不用于发布或替代原始 PoC。原始文件仍位于 `PoC/Quantum Tab/Tabs_%95.xlsx`。

重新生成：

```bash
python3 -m parser_poc.create_ark_smoke_fixture
```
