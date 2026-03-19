import type {
  CommentAnchor,
  CommentDecision,
  RevisionAnalysis,
  RevisionPlanResult,
  RevisionReportItem,
  RevisionSummary,
} from "@/types/revision";

function classifyComment(anchor: CommentAnchor): CommentDecision {
  const content = anchor.content;

  if (/参考文献|插入参考文献|有依据|要有依据|依据的|文献/.test(content)) {
    return {
      commentId: anchor.commentId,
      paragraphIndex: anchor.paragraphIndex,
      category: "evidence_gap",
      action: "skip",
      riskLevel: "high",
      requiresHumanReview: true,
      reason: "涉及文献或依据补充，系统不会自动编造参考文献或证据。",
    };
  }

  if (
    /F=|R2|R²|P＜|P<|中介|结果|返给我看看|统计学方法|显著/.test(content)
  ) {
    return {
      commentId: anchor.commentId,
      paragraphIndex: anchor.paragraphIndex,
      category: "missing_results",
      action: "skip",
      riskLevel: "high",
      requiresHumanReview: true,
      reason: "涉及统计结果或模型输出，系统不会自动补写具体数值。",
    };
  }

  if (/英文摘要|加入英文摘要|english abstract/i.test(content)) {
    return {
      commentId: anchor.commentId,
      paragraphIndex: anchor.paragraphIndex,
      category: "structure_addition",
      action: "skip",
      riskLevel: "high",
      requiresHumanReview: true,
      reason: "英文摘要需要基于完整摘要精准翻译，当前版本默认转为人工确认。",
    };
  }

  if (/AI|重新做|表不清晰|图不清晰|视频/.test(content)) {
    return {
      commentId: anchor.commentId,
      paragraphIndex: anchor.paragraphIndex,
      category: "non_actionable",
      action: "skip",
      riskLevel: "medium",
      requiresHumanReview: true,
      reason: "该批注不直接对应可安全自动回写的正文修改动作。",
    };
  }

  return {
    commentId: anchor.commentId,
    paragraphIndex: anchor.paragraphIndex,
    category: "direct_rewrite",
    action: "rewrite_paragraph",
    riskLevel: "medium",
    requiresHumanReview: false,
    reason: "可按段落进行语言与逻辑层面的安全改写。",
  };
}

function buildSummary(
  allAnchors: CommentAnchor[],
  decisions: CommentDecision[],
): RevisionSummary {
  const selectedComments = decisions.length;
  const autoApplicableCount = decisions.filter(
    (item) => !item.requiresHumanReview && item.action !== "skip",
  ).length;
  const skippedCount = decisions.filter((item) => item.action === "skip").length;
  const manualReviewCount = decisions.filter((item) => item.requiresHumanReview).length;

  return {
    totalComments: allAnchors.length,
    selectedComments,
    autoApplicableCount,
    skippedCount,
    manualReviewCount,
  };
}

function buildManualReviewItems(
  anchors: CommentAnchor[],
  decisions: CommentDecision[],
): RevisionReportItem[] {
  const anchorMap = new Map(anchors.map((anchor) => [anchor.commentId, anchor]));

  return decisions
    .filter((item) => item.requiresHumanReview)
    .map((item) => {
      const anchor = anchorMap.get(item.commentId);
      return {
        commentId: item.commentId,
        author: anchor?.author || "",
        commentContent: anchor?.content || "",
        originalExcerpt: anchor?.paragraphText || "",
        status: "需人工确认",
        resultSummary: item.reason,
        manualActionNeeded: item.reason,
      };
    });
}

export function buildRevisionPlan(
  analysis: RevisionAnalysis,
  selectedAuthors: string[],
): RevisionPlanResult {
  const selectedAnchors = analysis.anchors.filter((anchor) =>
    selectedAuthors.includes(anchor.author),
  );
  const decisions = selectedAnchors.map(classifyComment);

  return {
    decisions,
    summary: buildSummary(analysis.anchors, decisions),
    manualReviewItems: buildManualReviewItems(selectedAnchors, decisions),
  };
}
