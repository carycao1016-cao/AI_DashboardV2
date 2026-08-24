"""有边界的 Dashboard AI Planning：只推荐模板和图形，不修改提取数据。"""

from __future__ import annotations

from dataclasses import replace
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from parser_poc.ark_adapter import ArkStructuredAdapter

from ..settings import AI_ENABLED, AI_PROFILE


TemplateName = Literal[
    "Brand Tracking", "Concept Test", "Product Test", "Customer Satisfaction / NPS",
    "Packaging Test", "Pricing Results", "U&A / Category Study", "Campaign Evaluation", "Custom Dashboard",
]
VisualName = Literal["bar", "horizontal_bar", "grouped_bar", "line", "funnel", "pyramid", "heatmap", "pie", "donut", "radar", "scatter", "data_table"]


class TemplateMatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template: TemplateName
    reason: str = Field(min_length=1, max_length=240)


class QuestionPlanningDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    table_id: str = Field(min_length=1)
    template_matches: list[TemplateMatch] = Field(default_factory=list, max_length=3)
    recommended_visual: VisualName
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(min_length=1, max_length=320)


class DashboardPlanningResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decisions: list[QuestionPlanningDecision] = Field(default_factory=list)


def request_dashboard_ai_plan(candidates: list[dict[str, object]]) -> tuple[dict[str, dict[str, object]], str | None]:
    """请求模型的题目级建议；失败时返回空结果，调用方使用确定性回退。"""
    if not AI_ENABLED or not candidates:
        return {}, None
    try:
        adapter = ArkStructuredAdapter.from_environment(AI_PROFILE)  # type: ignore[arg-type]
        # Planning 只生成轻量建议；限制单次等待，避免 Draft 更新被模型网络请求长期占住。
        adapter.config = replace(adapter.config, timeout_seconds=min(adapter.config.timeout_seconds, 15.0))
        response = adapter.generate_structured(
            task_name="dashboard_planning",
            payload={
                "templates": [
                    "Brand Tracking", "Concept Test", "Product Test", "Customer Satisfaction / NPS",
                    "Packaging Test", "Pricing Results", "U&A / Category Study", "Campaign Evaluation", "Custom Dashboard",
                ],
                "visuals": ["bar", "horizontal_bar", "grouped_bar", "line", "funnel", "pyramid", "heatmap", "pie", "donut", "radar", "scatter", "data_table"],
                "planning_policy": [
                    "Match each table to zero or more listed templates using only the supplied title, headers, options and validated metric type.",
                    "Recommend a visual only from the supplied whitelist. Do not create metrics, combine tables, infer Base, or claim significance.",
                    "Use pyramid or funnel only when the same table explicitly represents ordered funnel stages. A list of brands is not a funnel.",
                    "Use line only when the supplied headers explicitly represent time or waves. Otherwise prefer horizontal_bar for ranking/comparison percentages, or data_table when uncertain.",
                    "Use pie or donut only for mutually exclusive composition that can sum to one total. Use radar only for 3-10 comparable attribute dimensions on the same scale. Use scatter only when paired X and Y measures are explicitly supplied; a normal Tab banner is not an X/Y pair.",
                    "Internal, hidden, screening and demographic tables should normally receive no template match unless the supplied title clearly belongs to a study module.",
                ],
                "candidates": candidates,
            },
            output_model=DashboardPlanningResponse,
        )
        valid_ids = {str(candidate["table_id"]) for candidate in candidates}
        decisions = {
            decision.table_id: decision.model_dump(mode="json")
            for decision in response.decisions
            if decision.table_id in valid_ids
        }
        return decisions, None
    except Exception:
        return {}, "AI planning was unavailable; deterministic template and chart rules were used."
