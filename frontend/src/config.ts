/**
 * 前端演示配置。
 *
 * 这里先保存不依赖后端的界面默认值；接入用户偏好接口后，可由服务端
 * 返回同名配置覆盖，而不需要把默认行为散落在组件代码中。
 */
export const uiConfig = {
  /** AI 助手首次进入项目时是否展开。默认关闭，优先展示项目工作区。 */
  assistantDefaultOpen: false,
  /** 本地 Parser API；默认留空以便在同源端口下代理调用。 */
  parserApiBaseUrl: import.meta.env.VITE_PARSER_API_BASE_URL || "",
};
