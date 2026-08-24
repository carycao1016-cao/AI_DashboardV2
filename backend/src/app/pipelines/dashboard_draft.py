"""从已验证提取结果生成可审计的内部 Dashboard Draft。"""

from __future__ import annotations

import re
import unicodedata
import uuid
from collections import Counter, defaultdict
from typing import Any

from .dashboard_planning import request_dashboard_ai_plan


def _normalize_identity(value: object) -> str:
    return " ".join(unicodedata.normalize("NFKC", str(value or "")).casefold().split())


def _tables(recognition_result: dict[str, Any]) -> list[dict[str, Any]]:
    sheets = recognition_result.get("sheets") if isinstance(recognition_result, dict) else []
    return [
        table
        for sheet in sheets if isinstance(sheet, dict)
        for table in sheet.get("extracted_tables", []) if isinstance(sheet.get("extracted_tables"), list) and isinstance(table, dict)
    ]


def _question_key(table: dict[str, Any]) -> tuple[str, ...]:
    """只允许规格定义的非语义归一化，避免模糊合并相邻或相似表。"""
    headers = table.get("headers", []) if isinstance(table.get("headers"), list) else []
    header_paths = tuple(
        " / ".join(_normalize_identity(part) for part in header.get("header_path", []) if part)
        for header in headers if isinstance(header, dict)
    )
    rows = table.get("rows", []) if isinstance(table.get("rows"), list) else []
    option_labels = tuple(_normalize_identity(row.get("original_label")) for row in rows if isinstance(row, dict))
    base_labels = tuple(label for label in option_labels if label.startswith("base:"))
    return (_normalize_identity(table.get("detected_question_number")), _normalize_identity(table.get("detected_table_title")), *header_paths, *base_labels, *option_labels)


def _module_for(table: dict[str, Any]) -> tuple[str, str]:
    text = " ".join(str(table.get(key) or "") for key in ("detected_question_number", "detected_question_text", "detected_table_title")).casefold()
    if "awareness" in text or "认知" in text:
        return "brand_awareness", "Brand Awareness"
    if "funnel" in text:
        return "brand_funnel", "Brand Funnel"
    if "imagery" in text or "image" in text:
        return "brand_imagery", "Brand Imagery"
    return "detailed_results", "Detailed Results"


def _is_internal(table: dict[str, Any]) -> bool:
    identifier = str(table.get("detected_question_number") or table.get("detected_table_title") or "").casefold()
    return identifier.startswith("hid_") or "hidden" in identifier


TEMPLATES = {
    "Brand Tracking", "Concept Test", "Product Test", "Customer Satisfaction / NPS",
    "Packaging Test", "Pricing Results", "U&A / Category Study", "Campaign Evaluation", "Custom Dashboard",
}


def _template_matches(table: dict[str, Any], module_id: str) -> list[dict[str, str]]:
    """按题目语义和已识别模块返回多个模板候选；这是模板规则层，不冒充模型结论。"""
    text = " ".join(str(table.get(key) or "") for key in ("detected_question_number", "detected_question_text", "detected_table_title")).casefold()
    matches: list[dict[str, str]] = []
    if module_id in {"brand_awareness", "brand_funnel", "brand_imagery"} or any(token in text for token in ("brand", "awareness", "认知", "品牌")):
        matches.append({"template": "Brand Tracking", "reason": "品牌认知、品牌漏斗或品牌形象模块"})
    if any(token in text for token in ("concept", "idea", "概念", "创意")):
        matches.append({"template": "Concept Test", "reason": "概念或创意评估题"})
    if any(token in text for token in ("product", "产品", "试用", "性能")):
        matches.append({"template": "Product Test", "reason": "产品使用或产品评价题"})
    if any(token in text for token in ("nps", "satisfaction", "满意", "推荐意愿")):
        matches.append({"template": "Customer Satisfaction / NPS", "reason": "满意度或 NPS 题"})
    if any(token in text for token in ("packaging", "package", "包装")):
        matches.append({"template": "Packaging Test", "reason": "包装评价题"})
    if any(token in text for token in ("price", "pricing", "价格", "付费", "购买意愿")):
        matches.append({"template": "Pricing Results", "reason": "价格或购买意愿题"})
    if any(token in text for token in ("usage", "category", "purchase", "品类", "购买", "使用", "消费")):
        matches.append({"template": "U&A / Category Study", "reason": "使用、购买或品类模块"})
    if any(token in text for token in ("campaign", "advertising", "广告", "活动")):
        matches.append({"template": "Campaign Evaluation", "reason": "广告或活动评估题"})
    return matches


def _recommended_metric(table: dict[str, Any]) -> str:
    """仅采用 Python 已验证的单元格单位，不从数值范围猜测指标。"""
    units = [
        str(cell.get("parsed_unit") or "unknown")
        for row in table.get("rows", []) if isinstance(row, dict) and not _normalize_identity(row.get("original_label")).startswith("base:")
        for cell in row.get("cells", []) if isinstance(cell, dict)
    ]
    supported = [unit for unit in units if unit in {"percentage", "count", "mean", "net", "box_score"}]
    return Counter(supported).most_common(1)[0][0] if supported else "unknown"


def _ai_recommends_inclusion(table: dict[str, Any], module_id: str, template: str) -> bool:
    if _is_internal(table):
        return False
    if template == "Brand Tracking":
        return module_id in {"brand_awareness", "brand_funnel", "brand_imagery"}
    if template == "Custom Dashboard":
        return True
    return True


def _rule_visual(metric_type: str) -> str:
    return "horizontal_bar" if metric_type in {"percentage", "mean", "net", "box_score"} else "data_table"


def _validated_visual(recommended_visual: str, question: dict[str, Any]) -> str:
    """模型只能建议表现层；Python 根据源结构限制漏斗、趋势等高语义图形。"""
    if recommended_visual in {"bar", "horizontal_bar", "grouped_bar", "data_table"}:
        return recommended_visual
    text = " ".join([str(question.get("title") or ""), str(question.get("module_name") or "")]).casefold()
    templates = {match["template"] for match in question.get("template_matches", [])}
    structure = question.get("visual_evidence", {})
    option_labels = " ".join(structure.get("option_labels", [])).casefold() if isinstance(structure, dict) else ""
    header_paths = " ".join(structure.get("header_paths", [])).casefold() if isinstance(structure, dict) else ""
    units = set(structure.get("units", [])) if isinstance(structure, dict) else set()
    option_count = int(structure.get("option_count", 0)) if isinstance(structure, dict) else 0
    if recommended_visual in {"funnel", "pyramid"} and "Brand Tracking" in templates and any(token in text for token in ("funnel", "stage", "consider", "purchase", "漏斗", "阶段", "考虑", "购买路径")):
        return recommended_visual
    if recommended_visual == "line" and any(token in text for token in ("wave", "trend", "month", "year", "波次", "趋势", "月", "年")):
        return recommended_visual
    if recommended_visual == "heatmap" and any(token in text for token in ("imagery", "matrix", "image", "形象", "矩阵")):
        return recommended_visual
    percentage_total = float(structure.get("percentage_total", 0)) if isinstance(structure, dict) else 0
    if recommended_visual in {"pie", "donut"} and units == {"percentage"} and 2 <= option_count <= 12 and (0.9 <= percentage_total <= 1.1 or any(token in text + " " + option_labels for token in ("share", "composition", "占比", "构成", "比例"))):
        return recommended_visual
    if recommended_visual == "radar" and 3 <= option_count <= 10 and any(token in text + " " + option_labels for token in ("imagery", "attribute", "profile", "形象", "属性", "评价")):
        return recommended_visual
    if recommended_visual == "scatter" and "x_measure" in header_paths and "y_measure" in header_paths:
        return recommended_visual
    return _rule_visual(str(question.get("metric_type") or "unknown"))


def build_dashboard_draft(
    project_id: str,
    source_file_version_id: str,
    project_name: str,
    recognition_result: dict[str, Any],
    metric_confirmations: dict[str, str] | None = None,
    *,
    template: str | None = None,
    selected_table_ids: list[str] | None = None,
    visual_overrides: dict[str, str] | None = None,
    planning_mode: str = "ai_refresh",
) -> tuple[dict[str, Any], dict[str, Any]]:
    """构建保守的语义快照和 Draft 计划，所有展示都保留到源物理表的证据。"""
    physical_tables = _tables(recognition_result)
    grouped: dict[tuple[str, ...], list[dict[str, Any]]] = defaultdict(list)
    for table in physical_tables:
        grouped[_question_key(table)].append(table)

    semantic_model_id = f"semv_{uuid.uuid4().hex[:12]}"
    confirmations = metric_confirmations or {}
    requested_template = template if template in TEMPLATES else None
    selected_ids = set(selected_table_ids or []) if selected_table_ids is not None else None
    requested_visuals = visual_overrides or {}
    questions: list[dict[str, Any]] = []
    planning_candidates: list[dict[str, object]] = []
    for index, variants in enumerate(grouped.values(), 1):
        primary = variants[0]
        module_id, module_name = _module_for(primary)
        source_table_ids = [str(item["extracted_table_id"]) for item in variants]
        ai_metric = _recommended_metric(primary)
        metric_type = confirmations.get(source_table_ids[0], ai_metric)
        template_matches = _template_matches(primary, module_id)
        if requested_template and not template_matches and not _is_internal(primary):
            template_matches = [{"template": requested_template, "reason": "Creator 兼容范围"}]
        included_by_ai = bool(template_matches) and not _is_internal(primary)
        included_in_draft = any(table_id in selected_ids for table_id in source_table_ids) if selected_ids is not None else included_by_ai
        questions.append({
            "semantic_question_id": f"sq_{index:03d}",
            "source_extracted_table_ids": source_table_ids,
            "title": primary.get("detected_question_text") or primary.get("detected_table_title") or primary.get("detected_question_number") or "Untitled table",
            "question_number": primary.get("detected_question_number") or None,
            "module_id": module_id,
            "module_name": module_name,
            "metric_type": metric_type,
            "review_status": "creator_confirmed" if source_table_ids[0] in confirmations else "ai_recommended" if metric_type != "unknown" else "review_required",
            "metric_source": "creator" if source_table_ids[0] in confirmations else "validated_unit" if metric_type != "unknown" else "unknown",
            "ai_recommended": included_by_ai,
            "template_matches": template_matches,
            "recommended_visual": _rule_visual(metric_type),
            "planning_source": "rules",
            "visual_evidence": {
                "units": sorted({str(cell.get("parsed_unit")) for row in primary.get("rows", []) if isinstance(row, dict) and not _normalize_identity(row.get("original_label")).startswith("base:") for cell in row.get("cells", []) if isinstance(cell, dict) and cell.get("parsed_unit")}),
                "option_labels": [str(row.get("original_label") or "") for row in primary.get("rows", []) if isinstance(row, dict) and not _normalize_identity(row.get("original_label")).startswith("base:")][:32],
                "header_paths": [" / ".join(str(part) for part in header.get("header_path", []) if part) for header in primary.get("headers", []) if isinstance(header, dict)][:32],
                "option_count": sum(1 for row in primary.get("rows", []) if isinstance(row, dict) and not _normalize_identity(row.get("original_label")).startswith("base:")),
                "percentage_total": sum(float(cell.get("parsed_value")) for row in primary.get("rows", []) if isinstance(row, dict) and not _normalize_identity(row.get("original_label")).startswith("base:") for cell in row.get("cells", [])[:1] if isinstance(cell, dict) and cell.get("parsed_unit") == "percentage" and isinstance(cell.get("parsed_value"), (int, float))),
            },
            "included_in_draft": included_in_draft,
            "evidence": {"strict_variant_count": len(variants), "source_ranges": [item.get("source_range") for item in variants]},
        })
        planning_candidates.append({
            "table_id": source_table_ids[0],
            "title": questions[-1]["title"],
            "question_number": questions[-1]["question_number"],
            "deterministic_module": module_name,
            "validated_metric_type": metric_type,
            "headers": [header.get("display_label") for header in primary.get("headers", []) if isinstance(header, dict)][:24],
            "option_samples": [row.get("original_label") for row in primary.get("rows", []) if isinstance(row, dict) and not _normalize_identity(row.get("original_label")).startswith("base:")][:24],
        })

    # 已有 Draft 的保存操作只处理 Creator 的范围/图形变更，不再重复调用 AI Planning。
    # 首次生成没有 visual_overrides 时才请求 AI；这样手动保存可以快速返回。
    ai_candidates = planning_candidates if planning_mode == "ai_refresh" else []
    ai_plans, planning_warning = request_dashboard_ai_plan(ai_candidates)
    for question in questions:
        table_id = question["source_extracted_table_ids"][0]
        decision = ai_plans.get(table_id)
        if decision:
            question["template_matches"] = decision["template_matches"]
            question["recommended_visual"] = _validated_visual(str(decision["recommended_visual"]), question)
            question["planning_source"] = "ai"
            question["planning_confidence"] = decision["confidence"]
            question["planning_reason"] = decision["reason"]
        if table_id in requested_visuals:
            requested_visual = str(requested_visuals[table_id])
            validated_visual = _validated_visual(requested_visual, question)
            question["recommended_visual"] = validated_visual
            question["planning_source"] = "creator_override"
            question["planning_reason"] = "Creator 选择的图形已通过 Python 数据结构校验。" if validated_visual == requested_visual else f"Creator 选择的图形不适合当前数据，已由 Python 回退为 {validated_visual}。"
        question["ai_recommended"] = bool(question["template_matches"]) and not _is_internal(next(table for table in physical_tables if table["extracted_table_id"] == table_id))
        question["included_in_draft"] = any(item_id in selected_ids for item_id in question["source_extracted_table_ids"]) if selected_ids is not None else question["ai_recommended"]

    semantic_model = {
        "semantic_model_version_id": semantic_model_id,
        "project_id": project_id,
        "source_file_version_id": source_file_version_id,
        "template_suggestion": {
            "template": "Mixed Study" if len({match["template"] for question in questions for match in question["template_matches"]}) > 1 else next(iter({match["template"] for question in questions for match in question["template_matches"]}), "Custom Dashboard"),
            "templates": sorted({match["template"] for question in questions for match in question["template_matches"]}),
            "confidence": "medium",
            "requires_creator_confirmation": False,
        },
        "questions": questions,
        "metrics": [{"semantic_question_id": question["semantic_question_id"], "metric_type": question["metric_type"]} for question in questions if question["metric_type"] != "unknown"],
        "warnings": (["Metric types remain unknown until semantic review confirms them; no KPI or derived calculation is generated."] if any(question["metric_type"] == "unknown" for question in questions) else []) + ([planning_warning] if planning_warning else []),
    }

    dashboard_id = f"dash_{project_id.removeprefix('prj_')}"
    pages: list[dict[str, Any]] = []
    included_questions = [question for question in questions if question["included_in_draft"]]
    core_questions = [question for question in included_questions if question["module_id"] != "detailed_results"][:6]
    suggested_questions = [question for question in included_questions if question not in core_questions and not _is_internal(next(table for table in physical_tables if table["extracted_table_id"] == question["source_extracted_table_ids"][0]))]
    internal_questions = [question for question in included_questions if question not in core_questions and question not in suggested_questions]

    def page(category: str, title: str, items: list[dict[str, Any]], order: int) -> dict[str, Any]:
        page_id = f"page_{uuid.uuid4().hex[:10]}"
        visuals = [{
            "dashboard_visual_id": f"visual_{uuid.uuid4().hex[:10]}",
            "source_extracted_table_id": question["source_extracted_table_ids"][0],
            "visual_type": question["recommended_visual"],
            "display_precision": 1,
            "title": question["title"],
            "grid_span": 12,
            "review_status": question["review_status"],
            "evidence": {"semantic_question_id": question["semantic_question_id"], **question["evidence"]},
        } for question in items]
        return {"dashboard_page_id": page_id, "category": category, "title": title, "sort_order": order, "visuals": visuals}

    if core_questions:
        pages.append(page("core", "Core findings", core_questions, 1))
    if suggested_questions:
        pages.append(page("suggested", "Suggested detailed results", suggested_questions, len(pages) + 1))
    if internal_questions:
        pages.append(page("internal", "Internal / technical", internal_questions, len(pages) + 1))

    draft = {
        "dashboard_id": dashboard_id,
        "dashboard_version_id": f"dashv_{uuid.uuid4().hex[:12]}",
        "dashboard_name": f"{project_name} Dashboard",
        "project_id": project_id,
        "source_file_version_id": source_file_version_id,
        "semantic_model_version_id": semantic_model_id,
        "status": "draft",
        "template": "Mixed Study" if len({match["template"] for question in questions for match in question["template_matches"]}) > 1 else next(iter({match["template"] for question in questions for match in question["template_matches"]}), "Custom Dashboard"),
        "pages": pages,
        "semantic_questions": questions,
        "summary": {"tables_detected": len(physical_tables), "semantic_questions": len(questions), "tables_in_draft": sum(len(page["visuals"]) for page in pages), "blocking_issues": 0, "review_required": sum(question["review_status"] == "review_required" and question["included_in_draft"] for question in questions)},
        "warnings": semantic_model["warnings"],
    }
    return semantic_model, draft
