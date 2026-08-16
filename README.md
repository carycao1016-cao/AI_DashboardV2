# AI Research Dashboard

通用 Excel/CSV Tab 解析 Dashboard。Python 读取和验证源文件，AI 只提出有界的
结构建议；最终数值、显著性、来源坐标和发布结论均由 Python 回读与校验。

## 目录

```text
frontend/                 # React/Vite Creator 界面
backend/src/app/          # FastAPI 服务入口与 HTTP 路由
parser_poc/               # 已验证的 Parser 核心与 Golden 测试，过渡期由后端复用
docs/design/en/           # 英文原始设计文档
docs/design/zh/           # 中文工作版设计文档
```

`parser_poc` 不是浏览器端代码。它保留为独立、可测试的 Python 解析核心；在
领域模块稳定前，`backend` 通过它执行 Workbook 扫描。后续迁入
`backend/src/app/pipelines/` 时必须保持 Golden 测试通过。

## 本地启动

```bash
# Python 后端
.venv/bin/uvicorn backend.src.app.main:app --host 127.0.0.1 --port 8000

# React 前端
npm run dev
```

前端默认访问 `http://127.0.0.1:8000`。如需替换，可设置
`VITE_PARSER_API_BASE_URL`；密钥和 AI Provider 配置始终保留在 Python 服务端。
