"""后端运行时配置；AI 识别默认关闭，避免上传时产生隐式模型请求。"""

from __future__ import annotations

import os
from pathlib import Path


def _load_local_runtime_environment() -> dict[str, str]:
    """读取后端本机开关配置，不执行 Shell，也不覆盖已注入的环境变量。

    密钥不放在这个文件中：方舟密钥与接入点仍由 parser_poc/.env.ark 管理。
    这里仅保存是否启用 AI、使用哪个模型档案及单次前台测试的 Sheet 上限。
    """
    env_file = Path(__file__).resolve().parents[2] / ".env"
    if not env_file.exists():
        return {}
    values: dict[str, str] = {}
    for line_number, raw_line in enumerate(env_file.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or not key.startswith("PARSER_AI_"):
            raise ValueError(f"backend/.env 第 {line_number} 行不是有效的 PARSER_AI_ 配置")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


_LOCAL_RUNTIME_VALUES = _load_local_runtime_environment()


def _setting(name: str, default: str) -> str:
    """部署环境变量优先，本机配置只作为开发环境后备。"""
    return os.environ.get(name, _LOCAL_RUNTIME_VALUES.get(name, default)).strip()


def _truthy(value: str) -> bool:
    return value.casefold() in {"1", "true", "yes", "on"}


AI_ENABLED = _truthy(_setting("PARSER_AI_ENABLED", "false"))
AI_PROFILE = _setting("PARSER_AI_PROFILE", "deepseek").casefold()
AI_MAX_SHEETS = max(1, int(_setting("PARSER_AI_MAX_SHEETS", "1")))
AI_OUTLINE_TARGET_TOKENS = max(1_000, int(_setting("PARSER_AI_OUTLINE_TARGET_TOKENS", "16000")))
AI_OUTLINE_HARD_TOKENS = max(AI_OUTLINE_TARGET_TOKENS, int(_setting("PARSER_AI_OUTLINE_HARD_TOKENS", "20000")))

if AI_PROFILE not in {"deepseek", "doubao"}:
    raise ValueError("PARSER_AI_PROFILE 只能是 deepseek 或 doubao")
