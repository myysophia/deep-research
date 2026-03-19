export { analyzeRevisionDocx, readArchiveFromAnalysis } from "@/utils/revision-docx/analyze";
export { createRevisionPlan } from "@/utils/revision-docx/plan";
export { applyRevisionPlan } from "@/utils/revision-docx/apply";
export { exportRevisedDocx } from "@/utils/revision-docx/export";
export type {
  CommentAnchor,
  CommentDecision,
  RevisionAction,
  RevisionAnalysisSnapshot,
  RevisionApplySummary,
  RevisionArchiveSnapshot,
  RevisionCategory,
  RevisionComment,
  RevisionCommentAuthor,
  RevisionPatch,
  RevisionPlanSummary,
  RevisionReportItem,
  RevisionRiskLevel,
} from "@/utils/revision-docx/types";
export {
  commentDecisionSchema,
  llmConfigSchema,
  revisionAnalysisSnapshotSchema,
  revisionApplyRequestSchema,
  revisionExportRequestSchema,
  revisionPatchSchema,
  revisionPlanRequestSchema,
} from "@/utils/revision-docx/schema";

