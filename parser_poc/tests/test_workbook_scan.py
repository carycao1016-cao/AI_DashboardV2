import unittest

from parser_poc.workbook_scan import compact_blank_rows, outline_row_summary, plan_detail_windows, select_sample_columns


class WorkbookScanTests(unittest.TestCase):
    def test_position_sampling_preserves_a_and_spans_row(self):
        selected = select_sample_columns([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], True)
        self.assertIn(1, selected)
        self.assertLessEqual(len(selected), 6)
        self.assertIn(10, selected)

    def test_position_sampling_does_not_invent_a_column(self):
        selected = select_sample_columns([3, 4, 5, 6, 7, 8], False)
        self.assertNotIn(1, selected)
        self.assertLessEqual(len(selected), 6)

    def test_consecutive_blank_rows_are_compacted(self):
        rows = [
            {"kind": "row", "row_number": 1},
            {"kind": "blank_row", "row_number": 2},
            {"kind": "blank_row", "row_number": 3},
            {"kind": "blank_row", "row_number": 4},
            {"kind": "row", "row_number": 5},
        ]
        result = compact_blank_rows(rows)
        self.assertEqual(result[1]["kind"], "blank_row_range")
        self.assertEqual(result[1]["start_row"], 2)
        self.assertEqual(result[1]["end_row"], 4)

    def test_outline_contains_structure_without_detail_samples(self):
        class Cell:
            def __init__(self, value, data_type="s", number_format="General"):
                self.value = value
                self.data_type = data_type
                self.number_format = number_format

        result = outline_row_summary([Cell("Base"), Cell(100, "n", "0")], 9)
        self.assertEqual(result["a_value"], "Base")
        self.assertEqual(result["numeric_count"], 1)
        self.assertNotIn("sampled_cells", result)

    def test_nearby_candidates_share_a_detail_window_without_merging_identity(self):
        windows = plan_detail_windows([(120, 185), (190, 240), (400, 420)], 500, 20, 20, 20)
        self.assertEqual(len(windows), 2)
        self.assertEqual(windows[0]["candidate_ranges"], ["120:185", "190:240"])
        self.assertEqual(windows[0]["window_row_start"], 100)
        self.assertEqual(windows[0]["window_row_end"], 260)


if __name__ == "__main__":
    unittest.main()
