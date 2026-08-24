from typing import Literal

from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
    project_name: str = Field(min_length=1, max_length=200)


class ResolveReviewIssueRequest(BaseModel):
    """Creator 的人工处理结论；不允许通过此接口修改原始表格数据。"""

    status: Literal["resolved", "accepted_risk", "excluded"]
    creator_note: str | None = Field(default=None, max_length=1000)


class CreateDashboardDraftRequest(BaseModel):
    """Creator 可选择模板和纳入范围，历史 Draft 不会被改写。"""

    metric_confirmations: dict[str, Literal["percentage", "count", "mean", "net", "box_score"]] = Field(default_factory=dict)
    template: Literal[
        "Brand Tracking", "Concept Test", "Product Test", "Customer Satisfaction / NPS",
        "Packaging Test", "Pricing Results", "U&A / Category Study", "Campaign Evaluation", "Custom Dashboard",
    ] | None = None
    selected_table_ids: list[str] | None = Field(default=None)
    visual_overrides: dict[str, str] = Field(default_factory=dict)
    planning_mode: Literal["ai_refresh", "python_only"] = "ai_refresh"
