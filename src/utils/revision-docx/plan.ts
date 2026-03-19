import type {
  CommentDecision,
  RevisionAnalysisSnapshot,
  RevisionCategory,
  RevisionPlanSummary,
} from "@/utils/revision-docx/types";

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyComment(content: string): RevisionCategory {
  const normalized = content.toLowerCase();

  if (
    includesAny(normalized, [
      "参考文献",
      "文献",
      "依据",
      "证据",
      "引用",
      "citation",
      "reference",
    ])
  ) {
    return "evidence_gap";
  }

  if (
    includesAny(normalized, [
      "f=",
      "r2",
      "r²",
      "z=",
      "p<",
      "p＜",
      "bootstrap",
      "中介",
      "显著",
      "结果",
      "统计",
      "回归",
    ])
  ) {
    return "missing_results";
  }

  if (
    includesAny(normalized, [
      "英文摘要",
      "english abstract",
      "摘要",
      "补充部分",
      "加入",
      "新增",
    ])
  ) {
    return "structure_addition";
  }

  if (
    includesAny(normalized, [
      "ai 生成",
      "这是ai",
      "这是 ai",
      "哔哩哔哩",
      "视频",
      "没搞明白",
      "实在不会",
      "表不清晰",
      "返给我看看",
    ])
  ) {
    return "non_actionable";
  }

  return "direct_rewrite";
}

function buildDecisionReason(category: RevisionCategory, content: string) {
  switch (category) {
    case "direct_rewrite":
      return `该批注可按段落进行安全改写：${content}`;
    case "structure_addition":
      if (content.includes("转折")) {
        return "结构补充需求可在原段落内通过衔接句处理。";
      }
      return "结构补充涉及新增段落或新增内容，默认需要人工复核。";
    case "evidence_gap":
      return "涉及证据或文献补充，自动改写不应编造依据，转人工确认。";
    case "missing_results":
      return "涉及统计结果缺失，系统不会自动编造数值，转人工确认。";
    case "non_actionable":
      return "该批注不构成可执行改写指令，默认跳过并记录说明。";
    default:
      return "已按默认策略处理。";
  }
}

export function createRevisionPlan(params: {
  analysis: RevisionAnalysisSnapshot;
  selectedAuthors: string[];
}) {
  const selectedAuthorSet = new Set(params.selectedAuthors);
  const targetAnchors = params.analysis.anchors.filter((anchor) =>
    selectedAuthorSet.has(anchor.author)
  );

  const decisions: CommentDecision[] = targetAnchors.map((anchor) => {
    const category = classifyComment(anchor.content);
    const requiresHumanReview =
      category === "evidence_gap" ||
      category === "missing_results" ||
      category === "non_actionable" ||
      (category === "structure_addition" && !anchor.content.includes("转折"));
    const action = requiresHumanReview
      ? category === "non_actionable"
        ? "skip"
        : "manual_review"
      : "rewrite_paragraph";

    return {
      commentId: anchor.commentId,
      author: anchor.author,
      content: anchor.content,
      paragraphIndex: anchor.paragraphIndex,
      category,
      action,
      riskLevel:
        category === "direct_rewrite"
          ? "low"
          : category === "structure_addition"
            ? "medium"
            : "high",
      requiresHumanReview,
      reason: buildDecisionReason(category, anchor.content),
    };
  });

  const summary: RevisionPlanSummary = {
    selectedCommentCount: decisions.length,
    autoRewriteCount: decisions.filter(
      (item) => item.action === "rewrite_paragraph"
    ).length,
    manualReviewCount: decisions.filter((item) => item.requiresHumanReview)
      .length,
    skipCount: decisions.filter((item) => item.action === "skip").length,
  };

  const manualReviewItems = decisions
    .filter((item) => item.requiresHumanReview)
    .map((item) => ({
      commentId: item.commentId,
      author: item.author,
      content: item.content,
      reason: item.reason,
    }));

  return {
    decisions,
    summary,
    manualReviewItems,
  };
}

