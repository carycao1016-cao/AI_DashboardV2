from typing import Literal

from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
    project_name: str = Field(min_length=1, max_length=200)


class ResolveReviewIssueRequest(BaseModel):
    """Creator 的人工处理结论；不允许通过此接口修改原始表格数据。"""

    status: Literal["resolved", "accepted_risk", "excluded"]
    creator_note: str | None = Field(default=None, max_length=1000)
