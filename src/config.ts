/**
 * 前端演示配置。
 *
 * 这里先保存不依赖后端的界面默认值；接入用户偏好接口后，可由服务端
 * 返回同名配置覆盖，而不需要把默认行为散落在组件代码中。
 */
export const uiConfig = {
  /** AI 助手首次进入项目时是否展开。默认关闭，优先展示项目工作区。 */
  assistantDefaultOpen: false,
  /** 本地 Python Parser API；部署时由环境配置替换。 */
  parserApiBaseUrl: "http://127.0.0.1:8000",
};
