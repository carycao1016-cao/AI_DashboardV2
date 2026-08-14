import unittest

from parser_poc.contracts import (
    CoarseRange,
    DetailWindowResponse,
    OutlineStatus,
    SheetOutlineResponse,
    SignificanceLayout,
    TableBoundaryProposal,
    TableRegions,
    ValidationOutcome,
)
from parser_poc.orchestration import ControlledStubAdapter, run_sheet_with_adapter, validate_proposal


class OrchestrationTests(unittest.TestCase):
    def test_controlled_stub_runs_two_layers_and_validates_physical_range(self):
        outline = SheetOutlineResponse(
            sheet_name="Sheet1",
            chunk_id="Sheet1_chunk_001_rows_1_50",
            candidates=[CoarseRange(candidate_id="candidate_1", start_row=5, end_row=25, status=OutlineStatus.COMPLETE)],
        )
        detail = DetailWindowResponse(
            sheet_name="Sheet1",
            window_id="detail_window_001",
            proposals=[
                TableBoundaryProposal(
                    proposal_id="proposal_1",
                    candidate_id="candidate_1",
                    sheet_name="Sheet1",
                    source_range="A5:F25",
                    regions=TableRegions(header_rows=[5, 6], data_rows=list(range(7, 25))),
                )
            ],
        )
        adapter = ControlledStubAdapter([outline, detail])
        outlines, details, validations = run_sheet_with_adapter(
            sheet_name="Sheet1",
            total_rows=50,
            total_columns=6,
            outline_chunks=[{"chunk_id": "Sheet1_chunk_001_rows_1_50", "rows": []}],
            adapter=adapter,
        )
        self.assertEqual(len(outlines), 1)
        self.assertEqual(len(details), 1)
        self.assertEqual(validations[0].outcome, ValidationOutcome.ACCEPTED)
        self.assertEqual([call["task_name"] for call in adapter.calls], ["sheet_outline", "detail_window"])

    def test_out_of_bounds_proposal_requires_review(self):
        proposal = TableBoundaryProposal(
            proposal_id="proposal_2",
            candidate_id="candidate_2",
            sheet_name="Sheet1",
            source_range="A5:F55",
            regions=TableRegions(header_rows=[5], data_rows=[6]),
        )
        result = validate_proposal(proposal, total_rows=50, total_columns=6)
        self.assertEqual(result.outcome, ValidationOutcome.REVIEW_REQUIRED)

    def test_significance_overlap_requires_declared_layout(self):
        with self.assertRaises(ValueError):
            TableRegions(header_rows=[5], data_rows=[6], significance_locations=[6])
        regions = TableRegions(
            header_rows=[5],
            data_rows=[6],
            significance_locations=[6],
            significance_layout=SignificanceLayout.FOLLOWING_ROW,
        )
        self.assertEqual(regions.significance_layout, SignificanceLayout.FOLLOWING_ROW)
