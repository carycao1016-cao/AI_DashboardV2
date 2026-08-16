# AI Dashboard Python 后端

这里是 Dashboard 的 Python 服务边界。HTTP API 使用 FastAPI，前端只通过
`/api/*` 调用；原始文件、解析、AI Provider、校验和后续持久化都属于后端。

## 当前结构

```text
backend/
  pyproject.toml
  src/app/
    main.py                 # FastAPI 入口
    api/source_versions.py  # 文件版本上传与 Workbook 扫描
```

当前 Workbook Parser 仍暂时复用根目录 `parser_poc` 包，保证既有 Golden 和
27 项离线测试不被目录迁移破坏。后续会把稳定的 Parser 模块迁入
`backend/src/app/pipelines/`，再删除兼容依赖。

## 启动

在项目根目录执行：

```bash
.venv/bin/uvicorn backend.src.app.main:app --host 127.0.0.1 --port 8000
```

健康检查：

```bash
curl http://127.0.0.1:8000/api/health
```

## AI 识别开关

上传只执行 Python 扫描，不会自动调用模型。只有显式点击“开始识别”并在后端
配置以下变量后，才会调用 Ark Provider：

```bash
PARSER_AI_ENABLED=true
PARSER_AI_PROFILE=deepseek
PARSER_AI_MAX_SHEETS=1
```

模型密钥仍使用 `parser_poc/.env.ark` 的本机配置，不进入前端或 Git。`MAX_SHEETS`
用于控制 Smoke 阶段的请求数量，正式扩大范围前应先完成 Golden 评估。
