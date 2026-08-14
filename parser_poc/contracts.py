"""Typed contracts for the two-layer table-recognition proof of concept."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional, Protocol, TypeVar

from pydantic import BaseModel, ConfigDict, Field, model_validator


class OutlineStatus(str, Enum):
    COMPLETE = "complete"
    NEEDS_MORE_CONTEXT = "needs_more_context"
    AMBIGUOUS = "ambiguous"
    NOT_A_TABLE = "not_a_table"


class UnclassifiedReason(str, Enum):
    SHEET_CONTEXT = "sheet_context"
    NON_TAB_CONTENT = "non_tab_content"
    INSUFFICIENT_CONTEXT = "insufficient_context"
    AMBIGUOUS_STRUCTURE = "ambiguous_structure"
    OVERSIZED_OR_COMPLEX = "oversized_or_complex"


class ValidationOutcome(str, Enum):
    ACCEPTED = "accepted"
    ADJUSTED = "adjusted"
    REJECTED = "rejected"
    REVIEW_REQUIRED = "review_required"


class ValidationCategory(str, Enum):
    RANGE_INVALID = "range_invalid"
    STRUCTURE_UNRESOLVED = "structure_unresolved"
    DATA_UNREADABLE = "data_unreadable"
    SIGNIFICANCE_UNRESOLVED = "significance_unresolved"
    SOURCE_UNAVAILABLE = "source_unavailable"


class SignificanceLayout(str, Enum):
    HEADER_INLINE = "header_inline"
    SEPARATE_LABEL_ROW = "separate_label_row"
    ADJACENT_COLUMN = "adjacent_column"
    FOLLOWING_ROW = "following_row"
    INLINE_VALUE = "inline_value"
    SEPARATE_SHEET = "separate_sheet"
    MIXED = "mixed"
    NONE = "none"
    UNKNOWN = "unknown"


class CoarseRange(BaseModel):
    """A Layer 1 row range; it has no claim to exact table identity."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    start_row: int = Field(ge=1)
    end_row: int = Field(ge=1)
    status: OutlineStatus

    @model_validator(mode="after")
    def validate_range(self) -> "CoarseRange":
        if self.start_row > self.end_row:
            raise ValueError("start_row must not exceed end_row")
        return self


class UnclassifiedRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_row: int = Field(ge=1)
    end_row: int = Field(ge=1)
    reason: UnclassifiedReason

    @model_validator(mode="after")
    def validate_range(self) -> "UnclassifiedRange":
        if self.start_row > self.end_row:
            raise ValueError("start_row must not exceed end_row")
        return self


class SheetOutlineResponse(BaseModel):
    """Structured Layer 1 response for one Outline chunk."""

    model_config = ConfigDict(extra="forbid")

    schema_name: Literal["sheet_outline_response"] = "sheet_outline_response"
    schema_version: Literal["0.1.0-poc"] = "0.1.0-poc"
    sheet_name: str = Field(min_length=1)
    chunk_id: str = Field(min_length=1)
    candidates: list[CoarseRange] = Field(default_factory=list)
    unclassified_ranges: list[UnclassifiedRange] = Field(default_factory=list)


class DetailWindowRequest(BaseModel):
    """Python-owned Layer 2 input metadata; row samples remain in the payload."""

    model_config = ConfigDict(extra="forbid")

    schema_name: Literal["detail_window_request"] = "detail_window_request"
    schema_version: Literal["0.1.0-poc"] = "0.1.0-poc"
    sheet_name: str = Field(min_length=1)
    window_id: str = Field(min_length=1)
    candidate_ids: list[str] = Field(min_length=1)
    window_row_start: int = Field(ge=1)
    window_row_end: int = Field(ge=1)
    payload: dict[str, Any]

    @model_validator(mode="after")
    def validate_range(self) -> "DetailWindowRequest":
        if self.window_row_start > self.window_row_end:
            raise ValueError("window_row_start must not exceed window_row_end")
        return self


class TableRegions(BaseModel):
    """Absolute row coordinates. Significance overlap needs a declared layout."""

    model_config = ConfigDict(extra="forbid")

    title_rows: list[int] = Field(default_factory=list)
    header_rows: list[int] = Field(default_factory=list)
    base_rows: list[int] = Field(default_factory=list)
    data_rows: list[int] = Field(default_factory=list)
    footnote_rows: list[int] = Field(default_factory=list)
    significance_locations: list[int] = Field(default_factory=list)
    significance_layout: SignificanceLayout = SignificanceLayout.NONE

    @model_validator(mode="after")
    def validate_non_significance_overlap(self) -> "TableRegions":
        named_regions = {
            "title_rows": self.title_rows,
            "header_rows": self.header_rows,
            "base_rows": self.base_rows,
            "data_rows": self.data_rows,
            "footnote_rows": self.footnote_rows,
        }
        seen: set[int] = set()
        for rows in named_regions.values():
            if any(row < 1 for row in rows):
                raise ValueError("region rows must be positive")
            if len(rows) != len(set(rows)):
                raise ValueError("a region must not repeat a row")
            overlap = seen.intersection(rows)
            if overlap:
                raise ValueError("non-significance regions must not overlap")
            seen.update(rows)
        if self.significance_locations and self.significance_layout in {
            SignificanceLayout.NONE,
            SignificanceLayout.UNKNOWN,
        }:
            raise ValueError("significance locations require a declared layout")
        return self


class TableBoundaryProposal(BaseModel):
    """Layer 2 suggestion; it never contains extracted business values."""

    model_config = ConfigDict(extra="forbid")

    proposal_id: str = Field(min_length=1)
    candidate_id: str = Field(min_length=1)
    sheet_name: str = Field(min_length=1)
    source_range: str = Field(pattern=r"^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$")
    regions: TableRegions
    confidence_score: Optional[float] = Field(default=None, ge=0, le=1)


class DetailWindowResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_name: Literal["detail_window_response"] = "detail_window_response"
    schema_version: Literal["0.1.0-poc"] = "0.1.0-poc"
    sheet_name: str = Field(min_length=1)
    window_id: str = Field(min_length=1)
    proposals: list[TableBoundaryProposal] = Field(default_factory=list)


class BoundaryValidationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    proposal_id: str = Field(min_length=1)
    outcome: ValidationOutcome
    categories: list[ValidationCategory] = Field(default_factory=list)
    corrections: list[str] = Field(default_factory=list)


T = TypeVar("T", bound=BaseModel)


class StructuredGenerationAdapter(Protocol):
    """Provider-neutral synchronous boundary used by the offline PoC."""

    def generate_structured(self, *, task_name: str, payload: dict[str, Any], output_model: type[T]) -> T:
        ...
