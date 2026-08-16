import unittest

from parser_poc.contracts import BoundaryValidationResult, CoarseRange, OutlineStatus, SignificanceLayout, ValidationOutcome
from pathlib import Path

from parser_poc.golden_evaluation import (
    GoldenTableAnnotation,
    evaluate_golden,
    load_golden_bundle,
    outline_covers_annotation,
    parse_row_spec,
    validate_golden_template,
)


class GoldenEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.annotation = GoldenTableAnnotation(
            table_id="T01",
            sheet_name="Sheet1",
            table_range="A5:F25",
            title_rows=[],
            header_rows=[5, 6],
            base_rows=[],
            data_rows=list(range(7, 25)),
            footnote_rows=[],
            significance_layout=SignificanceLayout.NONE,
            expected_outline_status="complete",
            expected_validation_result=ValidationOutcome.ACCEPTED,
            header_depth=2,
            has_explicit_base=True,
            source_family="Quantum",
        )

    def test_parse_row_spec(self):
        self.assertEqual(parse_row_spec("5,7:9"), [5, 7, 8, 9])

    def test_outline_coverage_uses_header_or_first_data_row(self):
        candidate = CoarseRange(candidate_id="c1", start_row=6, end_row=10, status=OutlineStatus.COMPLETE)
        self.assertTrue(outline_covers_annotation(self.annotation, [candidate]))

    def test_status_only_report_has_counts_without_business_text(self):
        report = evaluate_golden(
            [self.annotation],
            {"Sheet1": [CoarseRange(candidate_id="c1", start_row=5, end_row=25, status=OutlineStatus.COMPLETE)]},
            {"T01": BoundaryValidationResult(proposal_id="p1", outcome=ValidationOutcome.ACCEPTED)},
        )
        self.assertEqual(report["outline_coverage_rate"], 1)
        self.assertEqual(report["validation_outcome_distribution"], {"accepted": 1})
        self.assertNotIn("Question", str(report))

    def test_final_template_has_sheet_negatives_truth_and_inline_cases(self):
        path = Path(__file__).parents[2] / "outputs/golden_annotation_final/Golden_Annotation_Final.xlsx"
        if not path.exists():
            self.skipTest("final Golden workbook is not present")
        bundle = load_golden_bundle(path)
        self.assertEqual(len(bundle["tables"]), 27)
        self.assertEqual(len(bundle["inline_cases"]), 3)
        self.assertTrue(any(item.expected_outline_status == "not_a_table" for item in bundle["sheets"]))
        result = validate_golden_template(path)
        self.assertEqual(result["error_count"], 0, result["errors"])
