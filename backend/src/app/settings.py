"""后端运行时配置；AI 识别默认关闭，避免上传时产生隐式模型请求。"""

from __future__ import annotations

import os


def _truthy(value: str) -> bool:
    return value.casefold() in {"1", "true", "yes", "on"}


AI_ENABLED = _truthy(os.environ.get("PARSER_AI_ENABLED", "false"))
AI_PROFILE = os.environ.get("PARSER_AI_PROFILE", "deepseek").casefold()
AI_MAX_SHEETS = max(1, int(os.environ.get("PARSER_AI_MAX_SHEETS", "1")))
