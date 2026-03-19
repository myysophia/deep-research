export type RevisionDecisionCategory =
  | "direct_rewrite"
  | "structure_addition"
  | "evidence_gap"
  | "missing_results"
  | "non_actionable";

export type RevisionDecisionAction =
  | "rewrite_paragraph"
  | "append_after_paragraph"
  | "skip";

export type RevisionRiskLevel = "low" | "medium" | "high";

export type RevisionReportStatus =
  | "已自动修改"
  | "跳过并说明原因"
  | "需人工确认";

export interface RevisionCommentAuthor {
  author: string;
  count: number;
  selected?: boolean;
}

export interface CommentAnchor {
  commentId: string;
  author: string;
  content: string;
  quotedText: string;
  paragraphIndex: number;
  paragraphText: string;
  contextBefore: string;
  contextAfter: string;
  locationPath: string;
}

export interface RevisionSummary {
  totalComments: number;
  selectedComments: number;
  autoApplicableCount: number;
  skippedCount: number;
  manualReviewCount: number;
}

export interface RevisionAnalysis {
  fileName: string;
  fileSize: number;
  fileType: string;
  docxBase64: string;
  documentXml: string;
  anchors: CommentAnchor[];
  authors: RevisionCommentAuthor[];
  summary: RevisionSummary;
}

export interface CommentDecision {
  commentId: string;
  paragraphIndex: number;
  category: RevisionDecisionCategory;
  action: RevisionDecisionAction;
  riskLevel: RevisionRiskLevel;
  requiresHumanReview: boolean;
  reason: string;
}

export interface RevisionPatch {
  commentIds: string[];
  paragraphIndex: number;
  targetScope: "paragraph";
  originalText: string;
  revisedText: string;
  changeSummary: string;
  applyMode: "replace" | "append" | "skip";
  confidence: number;
  manualReviewNote?: string;
}

export interface RevisionReportItem {
  commentId: string;
  author: string;
  commentContent: string;
  originalExcerpt: string;
  status: RevisionReportStatus;
  resultSummary: string;
  manualActionNeeded?: string;
}

export interface RevisionPlanResult {
  decisions: CommentDecision[];
  summary: RevisionSummary;
  manualReviewItems: RevisionReportItem[];
}

export interface RevisionApplyResult {
  patches: RevisionPatch[];
  summary: RevisionSummary;
  reportItems: RevisionReportItem[];
  reportMarkdown: string;
  exportPayload: Record<string, unknown>;
}
