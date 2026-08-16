import unittest
from pathlib import Path

from parser_poc.contracts import BoundaryValidationResult, SignificanceLayout, TableBoundaryProposal, TableRegions, ValidationOutcome
from parser_poc.extraction import extract_validated_table


class ExtractionTests(unittest.TestCase):
    def test_quantum_following_row_preserves_raw_values_and_markers(self):
        proposal = TableBoundaryProposal(
            proposal_id="p1",
            candidate_id="c1",
            sheet_name="ban1_%Sig",
            source_range="A2:AB77",
            regions=TableRegions(
                title_rows=[2, 3],
                header_rows=[10, 11],
                base_rows=[13],
                data_rows=[14, 16, 18],
                footnote_rows=[77],
                significance_locations=[15, 17, 19],
                significance_layout=SignificanceLayout.FOLLOWING_ROW,
            ),
        )
        result = extract_validated_table(
            path=Path(__file__).parents[2] / "PoC/Quantum Tab/Tabs_%95.xlsx",
            proposal=proposal,
            validation=BoundaryValidationResult(proposal_id="p1", outcome=ValidationOutcome.ACCEPTED),
            extracted_table_id="Q03_01",
            metric_type="percentage",
        )
        self.assertEqual(result["source_range"], "A2:AB77")
        self.assertEqual(result["detected_question_number"], "S1a")
        self.assertEqual(result["rows"][1]["cells"][0]["raw_value"], 0.094)
        self.assertEqual(result["rows"][1]["cells"][0]["original_significance_marker"], "D")
        self.assertEqual(result["rows"][1]["cells"][0]["significance_marker_source_cell"], "B15")
        self.assertEqual(result["rows"][1]["cells"][0]["parsed_unit"], "percentage")

    def test_dash_is_not_zero(self):
        proposal = TableBoundaryProposal(
            proposal_id="p2",
            candidate_id="c2",
            sheet_name="ban1_%Sig",
            source_range="A2:AB77",
            regions=TableRegions(header_rows=[10, 11], data_rows=[14], significance_layout=SignificanceLayout.FOLLOWING_ROW, significance_locations=[15]),
        )
        result = extract_validated_table(
            path=Path(__file__).parents[2] / "PoC/Quantum Tab/Tabs_%95.xlsx",
            proposal=proposal,
            validation=BoundaryValidationResult(proposal_id="p2", outcome=ValidationOutcome.ACCEPTED),
            extracted_table_id="Q03_01",
            metric_type="percentage",
        )
        dash_cell = result["rows"][0]["cells"][3]
        self.assertEqual(dash_cell["raw_value"], "- ")
        self.assertIsNone(dash_cell["parsed_value"])
        self.assertEqual(dash_cell["availability_status"], "not_available")

    def test_separate_label_row_is_read_as_following_row(self):
        proposal = TableBoundaryProposal(
            proposal_id="p3",
            candidate_id="c3",
            sheet_name="ban1_%Sig",
            source_range="A2:AB77",
            regions=TableRegions(
                header_rows=[10, 11],
                data_rows=[14],
                significance_locations=[15],
                significance_layout=SignificanceLayout.SEPARATE_LABEL_ROW,
            ),
        )
        result = extract_validated_table(
            path=Path(__file__).parents[2] / "PoC/Quantum Tab/Tabs_%95.xlsx",
            proposal=proposal,
            validation=BoundaryValidationResult(proposal_id="p3", outcome=ValidationOutcome.ACCEPTED),
            extracted_table_id="Q03_01",
        )
        self.assertEqual(result["rows"][0]["cells"][0]["original_significance_marker"], "D")

    def test_decipher_adjacent_significance_columns_are_not_extracted_as_data(self):
        proposal = TableBoundaryProposal(
            proposal_id="p4",
            candidate_id="c4",
            sheet_name="Percentages_Sig1",
            source_range="A12:AW18",
            regions=TableRegions(
                title_rows=[12],
                header_rows=[14, 15],
                base_rows=[16],
                data_rows=[17, 18],
                significance_layout=SignificanceLayout.ADJACENT_COLUMN,
            ),
        )
        result = extract_validated_table(
            path=Path(__file__).parents[2] / "outputs/ark_smoke/fixtures/Decipher_Percentages_Sig1_first_table.xlsx",
            proposal=proposal,
            validation=BoundaryValidationResult(proposal_id="p4", outcome=ValidationOutcome.ACCEPTED),
            extracted_table_id="D01_01",
            metric_type="percentage",
        )
        self.assertEqual([header["data_column"] for header in result["headers"][:3]], ["B", "D", "F"])
        self.assertNotIn("E", [header["data_column"] for header in result["headers"]])
        male_cell = next(cell for cell in result["rows"][1]["cells"] if cell["source_cell"] == "D17")
        self.assertEqual(male_cell["original_significance_marker"], "C")
        self.assertEqual(male_cell["significance_marker_source_cell"], "E17")
        self.assertEqual(male_cell["significance_mapping_status"], "mapped")
