# 火山方舟模型配置

本 PoC 提供两个独立的方舟配置档：

- `deepseek`：豆包方舟中部署或接入的 DeepSeek 推理接入点。
- `doubao`：豆包方舟自有模型的推理接入点。

模型值必须填写方舟控制台中实际创建的推理接入点 ID，例如 `ep-...`；不要把示例模型名写死到 Parser 代码中。

## 环境变量

```bash
export ARK_API_KEY='由方舟控制台创建的 API Key'
export ARK_DEEPSEEK_MODEL='DeepSeek 的推理接入点 ID'
export ARK_DOUBAO_MODEL='豆包模型的推理接入点 ID'
export ARK_BASE_URL='https://ark.cn-beijing.volces.com/api/v3'
export ARK_TIMEOUT_SECONDS='120'
```

`ARK_API_KEY` 只能放在本机环境变量或部署环境的密钥管理服务中，不能写入 `.env`、代码、测试、Git 提交或 Golden 报告。

## 创建适配器

```python
from parser_poc.ark_adapter import ArkStructuredAdapter

deepseek_adapter = ArkStructuredAdapter.from_environment("deepseek")
doubao_adapter = ArkStructuredAdapter.from_environment("doubao")
```

两个配置档均使用同一个 `StructuredGenerationAdapter` 接口。模型返回内容会先由 Pydantic 校验；无效 JSON 最多发起一次修复请求，第二次仍失败就停止并报错。当前阶段尚未读取或发送任何真实文件，必须先用 Golden 评估命令比较两个模型的结果。
