"""对 PoC 源文件执行完整 Python Outline 扫描，并与最终 Golden 做覆盖评估。

本命令只评估 Layer 1 的扫描覆盖：Outline chunk 覆盖了多少张 Golden 物理表。
它不会把 chunk 当成 AI 的表边界，也不会生成题号、表头或数值解析结果。
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

from parser_poc.contracts import CoarseRange, OutlineStatus
from parser_poc.golden_evaluation import evaluate_golden, load_golden_bundle, validate_golden_template
from parser_poc.workbook_scan import scan_workbook


def evaluate_sources(*, root: Path, golden_path: Path) -> dict[str, Any]:
    """扫描 Golden 中登记的全部源文件，并返回可复现的 Layer 1 报告。"""
    bundle = load_golden_bundle(golden_path)
    sheets = bundle["sheets"]
    annotations = bundle["tables"]
    source_rows: dict[str, dict[str, Any]] = {}
    total_chunks = 0
    total_estimated_tokens = 0

    for golden_id in sorted({sheet.golden_id for sheet in sheets}):
        source_sheet_rows = [sheet for sheet in sheets if sheet.golden_id == golden_id]
        if not source_sheet_rows:
            continue
        source_file = source_sheet_rows[0].source_file
        source_annotations = [
            table for table in annotations
            if table.table_id.startswith("%s_" % golden_id)
        ]
        source_family = source_annotations[0].source_family if source_annotations else "unknown"
        source_directory = "Decipher Tab" if source_family.casefold() == "decipher" else "Quantum Tab"
        source_path = root / source_directory / source_file
        if not source_path.exists():
            raise FileNotFoundError("Golden source file not found: %s" % source_path)
        summary = scan_workbook(source_path)
        candidates_by_sheet: dict[str, list[CoarseRange]] = {}
        sheet_scan_stats = []
        for scanned_sheet in summary["sheets"]:
            chunks = scanned_sheet.get("outline_chunks", [])
            total_chunks += len(chunks)
            total_estimated_tokens += sum(int(chunk.get("estimated_input_tokens", 0)) for chunk in chunks)
            candidates_by_sheet[scanned_sheet["sheet_name"]] = [
                CoarseRange(
                    candidate_id=str(chunk["chunk_id"]),
                    start_row=int(chunk["chunk_row_start"]),
                    end_row=int(chunk["chunk_row_end"]),
                    status=OutlineStatus.COMPLETE,
                )
                for chunk in chunks
            ]
            sheet_scan_stats.append({
                "sheet_name": scanned_sheet["sheet_name"],
                "outline_chunk_count": len(chunks),
                "outline_estimated_input_tokens": sum(int(chunk.get("estimated_input_tokens", 0)) for chunk in chunks),
            })
        report = evaluate_golden(source_annotations, candidates_by_sheet, {})
        source_rows[golden_id] = {
            "source_file": source_file,
            "source_format": summary["source_format"],
            "sheet_count": len(summary["sheets"]),
            "sheet_scan_stats": sheet_scan_stats,
            "golden_report": report,
        }

    total_tables = sum(int(row["golden_report"]["table_count"]) for row in source_rows.values())
    total_covered = sum(int(row["golden_report"]["outline_covered_table_count"]) for row in source_rows.values())
    status_distribution = Counter({
        "covered": total_covered,
        "missed": total_tables - total_covered,
    })
    return {
        "schema_name": "golden_full_scan_evaluation_report",
        "schema_version": "0.1.0-poc",
        "golden_template_validation": validate_golden_template(golden_path),
        "source_count": len(source_rows),
        "total_table_count": total_tables,
        "outline_covered_table_count": total_covered,
        "outline_missed_table_count": total_tables - total_covered,
        "outline_coverage_rate": 0 if not total_tables else total_covered / total_tables,
        "layer_status_distribution": dict(status_distribution),
        "total_outline_chunk_count": total_chunks,
        "total_outline_estimated_input_tokens": total_estimated_tokens,
        "sources": source_rows,
        "interpretation": "覆盖率仅表示 Python Outline chunk 覆盖 Golden 坐标；不代表 AI 已正确识别物理表边界。",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).parents[1] / "PoC")
    parser.add_argument("--golden", type=Path, default=Path(__file__).parents[1] / "outputs/golden_annotation_final/Golden_Annotation_Final.xlsx")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = evaluate_sources(root=args.root, golden_path=args.golden)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("已写入 %s" % args.output)


if __name__ == "__main__":
    main()
