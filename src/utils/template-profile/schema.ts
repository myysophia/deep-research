import { z } from "zod";

export const templateFieldAnchorSchema = z.object({
  key: z.enum([
    "title",
    "subtitle",
    "college",
    "major",
    "className",
    "studentName",
    "studentId",
    "advisor",
    "completionDate",
  ]),
  label: z.string(),
  anchorText: z.string(),
  confidence: z.number().min(0).max(1),
});

export const templateStyleRoleSchema = z.object({
  role: z.enum([
    "cover-title",
    "cover-field",
    "abstract-title-zh",
    "abstract-title-en",
    "toc-title",
    "body-text",
    "heading-1",
    "heading-2",
    "heading-3",
    "reference-title",
    "reference-item",
    "acknowledgements-title",
    "caption-table",
    "caption-figure",
  ]),
  styleId: z.string().optional(),
  styleName: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSizePt: z.number().positive().optional(),
  bold: z.boolean().optional(),
  alignment: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const templateSectionProfileSchema = z.object({
  key: z.enum([
    "cover",
    "declaration",
    "authorization",
    "abstract-zh",
    "abstract-en",
    "toc",
    "body",
    "references",
    "acknowledgements",
    "appendix",
  ]),
  label: z.string(),
  detected: z.boolean(),
  order: z.number().int().nonnegative(),
  startAnchorText: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const templatePageRuleSchema = z.object({
  paperSize: z.literal("A4"),
  marginsCm: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
  }),
  hasDifferentFirstPage: z.boolean(),
  pageNumberStart: z.number().int().positive().optional(),
  pageNumberFormat: z.enum(["decimal", "roman"]).optional(),
});

export const templateConfirmationItemSchema = z.object({
  id: z.string(),
  type: z.enum(["section", "field", "style", "page-rule"]),
  label: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  resolved: z.boolean(),
  suggestedValue: z.string().optional(),
});

export const templateValidationIssueSchema = z.object({
  level: z.enum(["error", "warning", "info"]),
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export const templateValidationResultSchema = z.object({
  canExport: z.boolean(),
  issues: z.array(templateValidationIssueSchema),
});

export const templateProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(["platform", "user-uploaded", "user-curated"]),
  documentKind: z.enum(["blank-template", "sample-paper"]),
  formatSpecId: z.string(),
  thesisType: z.enum(["graduation-thesis", "course-paper", "proposal"]),
  educationLevel: z.enum(["undergraduate", "master", "general"]),
  originalFileName: z.string().optional(),
  sections: z.array(templateSectionProfileSchema),
  fieldAnchors: z.array(templateFieldAnchorSchema),
  styleRoles: z.array(templateStyleRoleSchema),
  pageRule: templatePageRuleSchema,
  confirmationItems: z.array(templateConfirmationItemSchema),
  confidenceScore: z.number().min(0).max(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
