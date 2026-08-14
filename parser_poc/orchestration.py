"""Offline two-layer orchestration shell with a controlled structured-output Stub."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Iterable, Sequence

from openpyxl.utils import range_boundaries
from pydantic import BaseModel

from parser_poc.contracts import (
    BoundaryValidationResult,
    CoarseRange,
    DetailWindowRequest,
    DetailWindowResponse,
    OutlineStatus,
    SheetOutlineResponse,
    StructuredGenerationAdapter,
    TableBoundaryProposal,
    ValidationCategory,
    ValidationOutcome,
)
from parser_poc.workbook_scan import plan_detail_windows


class ControlledStubAdapter:
    """Returns explicit fixture responses only; no semantic inference is performed."""

    def __init__(self, responses: Iterable[BaseModel]) -> None:
        self._responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    def generate_structured(self, *, task_name: str, payload: dict[str, Any], output_model: type[BaseModel]) -> BaseModel:
        self.calls.append({"task_name": task_name, "payload": payload, "output_model": output_model.__name__})
        for index, response in enumerate(self._responses):
            if isinstance(response, output_model):
                return self._responses.pop(index)
        raise LookupError("No controlled Stub response matches %s" % output_model.__name__)


def validate_proposal(proposal: TableBoundaryProposal, *, total_rows: int, total_columns: int) -> BoundaryValidationResult:
    """Validate only physical bounds and declared region rows in this offline shell."""
    categories: list[ValidationCategory] = []
    try:
        min_column, min_row, max_column, max_row = range_boundaries(proposal.source_range)
    except ValueError:
        categories.append(ValidationCategory.RANGE_INVALID)
    else:
        if min_row < 1 or max_row > total_rows or min_column < 1 or max_column > total_columns:
            categories.append(ValidationCategory.RANGE_INVALID)
        region_rows = [
            *proposal.regions.title_rows,
            *proposal.regions.header_rows,
            *proposal.regions.base_rows,
            *proposal.regions.data_rows,
            *proposal.regions.footnote_rows,
            *proposal.regions.significance_locations,
        ]
        if any(row < min_row or row > max_row for row in region_rows):
            categories.append(ValidationCategory.RANGE_INVALID)
        if not proposal.regions.header_rows or not proposal.regions.data_rows:
            categories.append(ValidationCategory.STRUCTURE_UNRESOLVED)

    return BoundaryValidationResult(
        proposal_id=proposal.proposal_id,
        outcome=ValidationOutcome.REVIEW_REQUIRED if categories else ValidationOutcome.ACCEPTED,
        categories=categories,
    )


def _candidate_ranges(responses: Sequence[SheetOutlineResponse]) -> list[tuple[str, int, int]]:
    return [
        (candidate.candidate_id, candidate.start_row, candidate.end_row)
        for response in responses
        for candidate in response.candidates
        if candidate.status in {OutlineStatus.COMPLETE, OutlineStatus.AMBIGUOUS, OutlineStatus.NEEDS_MORE_CONTEXT}
    ]


def build_detail_requests(
    *,
    sheet_name: str,
    total_rows: int,
    outline_responses: Sequence[SheetOutlineResponse],
    context_before: int = 20,
    context_after: int = 20,
    max_candidate_gap_rows: int = 20,
) -> list[DetailWindowRequest]:
    """Group positional candidates without merging their identities."""
    candidates = _candidate_ranges(outline_responses)
    windows = plan_detail_windows(
        [(start, end) for _identifier, start, end in candidates],
        total_rows,
        context_before,
        context_after,
        max_candidate_gap_rows,
    )
    identifiers_by_range: dict[tuple[int, int], list[str]] = defaultdict(list)
    for identifier, start, end in candidates:
        identifiers_by_range[(start, end)].append(identifier)

    requests = []
    for window in windows:
        candidate_ids = []
        for item in window["candidate_ranges"]:
            start, end = (int(value) for value in item.split(":"))
            candidate_ids.extend(identifiers_by_range[(start, end)])
        requests.append(
            DetailWindowRequest(
                sheet_name=sheet_name,
                window_id=window["window_id"],
                candidate_ids=candidate_ids,
                window_row_start=window["window_row_start"],
                window_row_end=window["window_row_end"],
                payload=window,
            )
        )
    return requests


def run_sheet_with_adapter(
    *,
    sheet_name: str,
    total_rows: int,
    total_columns: int,
    outline_chunks: Sequence[dict[str, Any]],
    adapter: StructuredGenerationAdapter,
) -> tuple[list[SheetOutlineResponse], list[DetailWindowResponse], list[BoundaryValidationResult]]:
    """Run the contracts with an adapter; source-value extraction is intentionally absent."""
    outline_responses = [
        adapter.generate_structured(
            task_name="sheet_outline",
            payload={"sheet_name": sheet_name, **chunk},
            output_model=SheetOutlineResponse,
        )
        for chunk in outline_chunks
    ]
    detail_requests = build_detail_requests(
        sheet_name=sheet_name,
        total_rows=total_rows,
        outline_responses=outline_responses,
    )
    detail_responses = [
        adapter.generate_structured(
            task_name="detail_window",
            payload=request.model_dump(mode="json"),
            output_model=DetailWindowResponse,
        )
        for request in detail_requests
    ]
    validations = [
        validate_proposal(proposal, total_rows=total_rows, total_columns=total_columns)
        for response in detail_responses
        for proposal in response.proposals
    ]
    return outline_responses, detail_responses, validations
