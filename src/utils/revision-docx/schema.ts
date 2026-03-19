import { z } from "zod";

export const revisionArchiveEntrySchema = z.object({
  name: z.string().min(1),
  base64: z.string().min(1),
});

export const revisionArchiveSnapshotSchema = z.object({
  entries: z.array(revisionArchiveEntrySchema).min(1),
});

export const revisionCommentSchema = z.object({
  id: z.string(),
  author: z.string(),
  initials: z.string(),
  date: z.string(),
  content: z.string(),
});

export const revisionParagraphSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string(),
  commentIds: z.array(z.string()),
});

export const commentAnchorSchema = z.object({
  commentId: z.string(),
  author: z.string(),
  content: z.string(),
  paragraphIndex: z.number().int().nonnegative().nullable(),
  paragraphText: z.string(),
  quotedText: z.string(),
  contextBefore: z.string(),
  contextAfter: z.string(),
});

export const revisionAuthorSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
});

export const revisionAnalysisStatsSchema = z.object({
  totalComments: z.number().int().nonnegative(),
  anchoredComments: z.number().int().nonnegative(),
  totalParagraphs: z.number().int().nonnegative(),
  paragraphsWithComments: z.number().int().nonnegative(),
});

export const revisionAnalysisSnapshotSchema = z.object({
  version: z.literal("v1"),
  fileName: z.string(),
  docHash: z.string(),
  createdAt: z.number(),
  archive: revisionArchiveSnapshotSchema,
  comments: z.array(revisionCommentSchema),
  paragraphs: z.array(revisionParagraphSchema),
  anchors: z.array(commentAnchorSchema),
  authors: z.array(revisionAuthorSchema),
  stats: revisionAnalysisStatsSchema,
});

export const commentDecisionSchema = z.object({
  commentId: z.string(),
  author: z.string(),
  content: z.string(),
  paragraphIndex: z.number().int().nonnegative().nullable(),
  category: z.enum([
    "direct_rewrite",
    "structure_addition",
    "evidence_gap",
    "missing_results",
    "non_actionable",
  ]),
  action: z.enum(["rewrite_paragraph", "manual_review", "skip"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  requiresHumanReview: z.boolean(),
  reason: z.string(),
});

export const llmConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  baseURL: z.string().url(),
  apiKey: z.string().optional(),
});

export const revisionPatchSchema = z.object({
  patchId: z.string(),
  paragraphIndex: z.number().int().nonnegative(),
  originalText: z.string(),
  revisedText: z.string(),
  relatedCommentIds: z.array(z.string()),
  method: z.enum(["llm", "rule-fallback"]),
  confidence: z.number(),
  applyMode: z.literal("replace"),
  changeSummary: z.string(),
});

export const revisionPlanRequestSchema = z.object({
  analysis: revisionAnalysisSnapshotSchema,
  selectedAuthors: z.array(z.string()).default([]),
});

export const revisionApplyRequestSchema = z.object({
  analysis: revisionAnalysisSnapshotSchema,
  decisions: z.array(commentDecisionSchema),
  llm: llmConfigSchema.optional(),
});

export const revisionExportRequestSchema = z.object({
  analysis: revisionAnalysisSnapshotSchema,
  patches: z.array(revisionPatchSchema),
});

