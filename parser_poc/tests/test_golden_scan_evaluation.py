import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from parser_poc.contracts import SignificanceLayout, ValidationOutcome
from parser_poc.golden_evaluation import GoldenTableAnnotation
from parser_poc.golden_scan_evaluation import evaluate_sources


class GoldenScanEvaluationTests(unittest.TestCase):
    def test_outline_chunks_are_reported_as_coverage_not_ai_recognition(self):
        sheet = SimpleNamespace(
            golden_id="Q01",
            source_file="fixture.xlsx",
            sheet_name="Sheet1",
        )
        table = GoldenTableAnnotation(
            table_id="Q01_01",
            sheet_name="Sheet1",
            table_range="A5:F20",
            title_rows=[5],
            header_rows=[6],
            base_rows=[7],
            data_rows=list(range(8, 21)),
            footnote_rows=[],
            significance_layout=SignificanceLayout.NONE,
            expected_outline_status="complete",
            expected_validation_result=ValidationOutcome.ACCEPTED,
            header_depth=1,
            has_explicit_base=True,
            source_family="Quantum",
        )
        scan = {
            "source_format": "xlsx",
            "sheets": [{
                "sheet_name": "Sheet1",
                "outline_chunks": [{
                    "chunk_id": "Sheet1_chunk_001_rows_1_25",
                    "chunk_row_start": 1,
                    "chunk_row_end": 25,
                    "estimated_input_tokens": 10,
                }],
            }],
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "Quantum Tab" / "fixture.xlsx"
            source.parent.mkdir()
            source.touch()
            with patch("parser_poc.golden_scan_evaluation.load_golden_bundle", return_value={"sheets": [sheet], "tables": [table]}), patch(
                "parser_poc.golden_scan_evaluation.validate_golden_template", return_value={"error_count": 0}
            ), patch("parser_poc.golden_scan_evaluation.scan_workbook", return_value=scan):
                report = evaluate_sources(root=root, golden_path=root / "golden.xlsx")

        self.assertEqual(report["outline_coverage_rate"], 1)
        self.assertEqual(report["layer_status_distribution"], {"covered": 1, "missed": 0})
        self.assertIn("不代表 AI", report["interpretation"])


if __name__ == "__main__":
    unittest.main()
