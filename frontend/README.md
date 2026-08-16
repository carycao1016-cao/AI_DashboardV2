# AI Dashboard 前端

React/Vite Creator 工作区位于本目录。前端只负责页面、交互和状态展示，
通过 `/api/*` 调用 Python 后端，不直接读取 Workbook 或调用 AI Provider。

根目录的 `package.json` 保留为当前单仓库的开发入口；Vite 配置、HTML 入口和
前端源码均位于本目录。
