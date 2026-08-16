# 火山方舟模型配置

本 PoC 提供两个独立的方舟配置档：

- `deepseek`：豆包方舟中部署或接入的 DeepSeek 推理接入点。
- `doubao`：豆包方舟自有模型的推理接入点。

模型值必须填写方舟控制台中实际创建的推理接入点 ID，例如 `ep-...`；不要把示例模型名写死到 Parser 代码中。

## 本机环境文件

本项目已经创建并忽略 `parser_poc/.env.ark`。在该文件中填写实际值即可；它只在本机读取，不会被 Git 跟踪。

```bash
ARK_API_KEY='由方舟控制台创建的 API Key'
ARK_DEEPSEEK_MODEL='DeepSeek 的推理接入点 ID'
ARK_DOUBAO_MODEL='豆包模型的推理接入点 ID'
ARK_BASE_URL='https://ark.cn-beijing.volces.com/api/v3'
ARK_TIMEOUT_SECONDS='120'
```

`ARK_API_KEY` 只能放在此被 Git 忽略的本机文件或部署环境的密钥管理服务中，不能写入代码、测试、Git 提交或 Golden 报告。部署环境应使用平台密钥管理，而不是本地文件。

## 创建适配器

```python
from parser_poc.ark_adapter import ArkStructuredAdapter

deepseek_adapter = ArkStructuredAdapter.from_environment("deepseek")
doubao_adapter = ArkStructuredAdapter.from_environment("doubao")
```

两个配置档均使用同一个 `StructuredGenerationAdapter` 接口。模型返回内容会先由 Pydantic 校验；无效 JSON 最多发起一次修复请求，第二次仍失败就停止并报错。真实文件只可通过受控的 Smoke 或 Golden 评估命令发送，不能直接把完整工作簿交给模型。

## DeepSeek Smoke 两层测试

```bash
.venv/bin/python -m parser_poc.run_ark_smoke \
  --profile deepseek \
  --output outputs/ark_smoke/deepseek_two_layer_results.json
```

命令只读取单表 Smoke fixture。报告不保留原始单元格值，但会记录 Layer 1 候选数、Layer 2 提议范围、物理校验状态和与 Golden 完整范围的精确匹配结果。
