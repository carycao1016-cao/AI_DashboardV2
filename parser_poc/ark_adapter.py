"""火山方舟 Ark 的 Provider 边界适配器。

仅此模块知道 Ark 的 HTTP 接口；Parser 领域层仍只依赖 StructuredGenerationAdapter。
DeepSeek 与豆包自有模型都通过方舟推理接入点 ID 配置，不在代码中固化模型名称。
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Callable, Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pydantic import BaseModel, ValidationError


ArkProfile = Literal["deepseek", "doubao"]
Transport = Callable[[Request, float], bytes]


class ArkConfigurationError(ValueError):
    """方舟环境变量缺失或配置不合法。"""


class ArkResponseError(RuntimeError):
    """方舟响应无法安全解析为要求的结构化输出。"""


class ArkRequestError(RuntimeError):
    """方舟请求未成功完成；错误文本不包含 API Key 或业务载荷。"""


@dataclass(frozen=True)
class ArkConnectionConfig:
    """方舟连接配置。model 必须是控制台创建的推理接入点 ID。"""

    api_key: str = field(repr=False)
    model: str
    base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    timeout_seconds: float = 120.0
    temperature: float = 0.0

    @classmethod
    def from_environment(cls, profile: ArkProfile) -> "ArkConnectionConfig":
        """从环境变量加载一个模型档案，避免密钥进入仓库或命令行。"""
        if profile not in {"deepseek", "doubao"}:
            raise ArkConfigurationError("Unsupported Ark profile: %s" % profile)
        model_key = "ARK_DEEPSEEK_MODEL" if profile == "deepseek" else "ARK_DOUBAO_MODEL"
        api_key = os.environ.get("ARK_API_KEY", "").strip()
        model = os.environ.get(model_key, "").strip()
        if not api_key:
            raise ArkConfigurationError("Missing required environment variable: ARK_API_KEY")
        if not model:
            raise ArkConfigurationError("Missing required environment variable: %s" % model_key)
        base_url = os.environ.get("ARK_BASE_URL", cls.base_url).strip().rstrip("/")
        if not base_url.startswith("https://"):
            raise ArkConfigurationError("ARK_BASE_URL must use https")
        timeout_text = os.environ.get("ARK_TIMEOUT_SECONDS", "120").strip()
        try:
            timeout_seconds = float(timeout_text)
        except ValueError as exc:
            raise ArkConfigurationError("ARK_TIMEOUT_SECONDS must be numeric") from exc
        if timeout_seconds <= 0:
            raise ArkConfigurationError("ARK_TIMEOUT_SECONDS must be positive")
        return cls(api_key=api_key, model=model, base_url=base_url, timeout_seconds=timeout_seconds)


def _default_transport(request: Request, timeout_seconds: float) -> bytes:
    """执行单次 HTTP 请求；调用方负责对响应内容做结构化校验。"""
    with urlopen(request, timeout=timeout_seconds) as response:
        return response.read()


def _extract_json_object(content: Any) -> dict[str, Any]:
    """接受常见的文本或 Markdown fenced JSON 响应，并拒绝非对象结果。"""
    if isinstance(content, list):
        content = "".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )
    if not isinstance(content, str):
        raise ArkResponseError("Ark response content is not text")
    text = content.strip()
    if text.startswith("```") and text.endswith("```"):
        text = text.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
    try:
        decoded = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ArkResponseError("Ark response is not valid JSON") from exc
    if not isinstance(decoded, dict):
        raise ArkResponseError("Ark response JSON must be an object")
    return decoded


class ArkStructuredAdapter:
    """将 Ark chat completions 映射为项目的同步 StructuredGenerationAdapter。"""

    def __init__(
        self,
        *,
        profile: ArkProfile,
        config: ArkConnectionConfig,
        transport: Transport = _default_transport,
    ) -> None:
        self.profile = profile
        self.config = config
        self._transport = transport
        # 仅记录可审计的调用元数据，不保留工作簿内容或 API Key。
        self.call_records: list[dict[str, Any]] = []

    @classmethod
    def from_environment(cls, profile: ArkProfile) -> "ArkStructuredAdapter":
        return cls(profile=profile, config=ArkConnectionConfig.from_environment(profile))

    def _request_completion(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        body = json.dumps(
            {
                "model": self.config.model,
                "messages": messages,
                "temperature": self.config.temperature,
                # 使用兼容性最广的 JSON object 模式；严格 schema 由本地 Pydantic 强制校验。
                "response_format": {"type": "json_object"},
            },
            ensure_ascii=False,
        ).encode("utf-8")
        request = Request(
            "%s/chat/completions" % self.config.base_url.rstrip("/"),
            data=body,
            headers={
                "Authorization": "Bearer %s" % self.config.api_key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            raw_response = self._transport(request, self.config.timeout_seconds)
        except HTTPError as exc:
            raise ArkRequestError("Ark HTTP request failed with status %s" % exc.code) from exc
        except URLError as exc:
            raise ArkRequestError("Ark network request failed") from exc
        except TimeoutError as exc:
            raise ArkRequestError("Ark request timed out") from exc
        try:
            decoded = json.loads(raw_response.decode("utf-8"))
            return decoded
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ArkResponseError("Ark response envelope is not valid UTF-8 JSON") from exc

    def generate_structured(
        self,
        *,
        task_name: str,
        payload: dict[str, Any],
        output_model: type[BaseModel],
    ) -> BaseModel:
        """请求 JSON 并至多修复一次；成功结果一定通过 output_model 校验。"""
        schema = output_model.model_json_schema()
        system_message = (
            "你是结构化数据接口。只返回一个 JSON 对象，不要返回 Markdown、解释或额外字段。"
            "输出必须符合用户提供的 JSON Schema；不得猜测未提供的源数据。"
        )
        user_message = json.dumps(
            {"task_name": task_name, "input": payload, "output_json_schema": schema},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]
        last_error: Exception | None = None
        for attempt in range(1, 3):
            response = self._request_completion(messages)
            try:
                content = response["choices"][0]["message"]["content"]
                parsed = _extract_json_object(content)
                result = output_model.model_validate(parsed)
            except (KeyError, IndexError, ArkResponseError, ValidationError) as exc:
                last_error = exc
                self.call_records.append(
                    {"task_name": task_name, "profile": self.profile, "model": self.config.model, "attempt": attempt, "outcome": "invalid_output"}
                )
                if attempt == 2:
                    break
                invalid_content = ""
                choices = response.get("choices")
                if isinstance(choices, list) and choices and isinstance(choices[0], dict):
                    message = choices[0].get("message")
                    if isinstance(message, dict):
                        invalid_content = str(message.get("content", ""))
                messages.extend(
                    [
                        {"role": "assistant", "content": invalid_content},
                        {"role": "user", "content": "上一次输出无效。仅返回符合先前 JSON Schema 的 JSON 对象，不要解释。"},
                    ]
                )
                continue
            self.call_records.append(
                {"task_name": task_name, "profile": self.profile, "model": self.config.model, "attempt": attempt, "outcome": "accepted"}
            )
            return result
        raise ArkResponseError("Ark returned invalid structured output after one repair attempt") from last_error
