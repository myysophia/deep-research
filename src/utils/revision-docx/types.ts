export type RevisionCategory =
  | "direct_rewrite"
  | "structure_addition"
  | "evidence_gap"
  | "missing_results"
  | "non_actionable";

export type RevisionAction = "rewrite_paragraph" | "manual_review" | "skip";

export type RevisionRiskLevel = "low" | "medium" | "high";

export interface RevisionCommentAuthor {
  name: string;
  count: number;
}

export interface RevisionComment {
  id: string;
  author: string;
  initials: string;
  date: string;
  content: string;
}

export interface RevisionParagraph {
  index: number;
  text: string;
  commentIds: string[];
}

export interface CommentAnchor {
  commentId: string;
  author: string;
  content: string;
  paragraphIndex: number | null;
  paragraphText: string;
  quotedText: string;
  contextBefore: string;
  contextAfter: string;
}

export interface RevisionArchiveEntry {
  name: string;
  base64: string;
}

export interface RevisionArchiveSnapshot {
  entries: RevisionArchiveEntry[];
}

export interface RevisionAnalysisStats {
  totalComments: number;
  anchoredComments: number;
  totalParagraphs: number;
  paragraphsWithComments: number;
}

export interface RevisionAnalysisSnapshot {
  version: "v1";
  fileName: string;
  docHash: string;
  createdAt: number;
  archive: RevisionArchiveSnapshot;
  comments: RevisionComment[];
  paragraphs: RevisionParagraph[];
  anchors: CommentAnchor[];
  authors: RevisionCommentAuthor[];
  stats: RevisionAnalysisStats;
}

export interface CommentDecision {
  commentId: string;
  author: string;
  content: string;
  paragraphIndex: number | null;
  category: RevisionCategory;
  action: RevisionAction;
  riskLevel: RevisionRiskLevel;
  requiresHumanReview: boolean;
  reason: string;
}

export interface RevisionPlanSummary {
  selectedCommentCount: number;
  autoRewriteCount: number;
  manualReviewCount: number;
  skipCount: number;
}

export interface RevisionPatch {
  patchId: string;
  paragraphIndex: number;
  originalText: string;
  revisedText: string;
  relatedCommentIds: string[];
  method: "llm" | "rule-fallback";
  confidence: number;
  applyMode: "replace";
  changeSummary: string;
}

export interface RevisionReportItem {
  commentId: string;
  author: string;
  commentContent: string;
  originalExcerpt: string;
  status: "已自动修改" | "需人工确认" | "跳过并说明原因";
  resultSummary: string;
  manualActionNeeded: boolean;
}

export interface RevisionApplySummary {
  selectedCommentCount: number;
  patchCount: number;
  manualReviewCount: number;
  skippedCount: number;
}

