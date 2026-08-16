"""对单表 Smoke fixture 运行 Ark 两层结构识别，并输出无业务值的评估报告。"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from parser_poc.ark_adapter import ArkStructuredAdapter
from parser_poc.orchestration import run_xlsx_sheet_with_adapter


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=("deepseek", "doubao"), default="deepseek")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).parents[1] / "outputs/ark_smoke/Tabs_%95_first_table.xlsx",
    )
    parser.add_argument("--sheet", default="ban1_%Sig")
    parser.add_argument("--expected-range", default="A1:AB78")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parents[1] / "outputs/ark_smoke/deepseek_two_layer_results.json",
    )
    args = parser.parse_args()

    adapter = ArkStructuredAdapter.from_environment(args.profile)
    outlines, details, validations = run_xlsx_sheet_with_adapter(
        path=args.input,
        sheet_name=args.sheet,
        adapter=adapter,
    )
    proposals = []
    validation_index = 0
    for response in details:
        for proposal in response.proposals:
            validation = validations[validation_index]
            validation_index += 1
            proposals.append(
                {
                    "source_range": proposal.source_range,
                    "candidate_id": proposal.candidate_id,
                    "validation_outcome": validation.outcome.value,
                    "validation_categories": [category.value for category in validation.categories],
                    "exact_range_match": proposal.source_range == args.expected_range,
                }
            )
    report = {
        "schema_name": "ark_two_layer_smoke_report",
        "profile": args.profile,
        "source_file": args.input.name,
        "sheet_name": args.sheet,
        "expected_golden_table_range": args.expected_range,
        "outline_candidate_count": sum(len(response.candidates) for response in outlines),
        "detail_window_count": len(details),
        "proposals": proposals,
        "call_records": adapter.call_records,
        "interpretation": "物理范围校验通过不等于 Golden 完整边界正确；仅 exact_range_match=true 才表示本 Smoke 的完整范围匹配。",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("已写入 %s" % args.output)


if __name__ == "__main__":
    main()
