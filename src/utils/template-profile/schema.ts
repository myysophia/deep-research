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
  headerTextLeft: z.string().optional(),
  headerTextRight: z.string().optional(),
  footerText: z.string().optional(),
  pageNumberPosition: z.enum(["left", "center", "right"]).optional(),
});

const templateMarginsSchema = templatePageRuleSchema.shape.marginsCm;

export const templateLayoutSchema = z.object({
  paperSize: z.literal("A4"),
  marginsCm: templateMarginsSchema,
});

export const templatePreviewAnchorSchema = z.object({
  key: templateFieldAnchorSchema.shape.key,
  label: z.string(),
  confidence: z.number().min(0).max(1),
});

export const templatePreviewSnapshotSchema = z.object({
  pageNumber: z.number().int().positive(),
  sectionKey: templateSectionProfileSchema.shape.key,
  label: z.string(),
  summary: z.string(),
  coverage: z.number().min(0).max(1),
  layout: templateLayoutSchema,
  anchorHighlights: z.array(templatePreviewAnchorSchema).optional(),
});

export const templateValidationHighlightSchema = z.object({
  heading: z.string(),
  snippet: z.string(),
});

export const templateValidationDetailSchema = z.object({
  formatSpecId: z.string(),
  formatSpecName: z.string().optional(),
  differences: z.array(
    z.object({
      key: z.string(),
      expected: z.string(),
      actual: z.string().optional(),
      message: z.string(),
    })
  ),
  suggestions: z.array(
    z.object({
      target: z.string(),
      message: z.string(),
    })
  ),
});

export const templateValidationPreviewSchema = z.object({
  layout: templateLayoutSchema,
  highlights: z.array(templateValidationHighlightSchema),
  sectionCount: z.number().int().nonnegative(),
  artifactCount: z.number().int().nonnegative(),
  keyPages: z.array(templatePreviewSnapshotSchema).optional(),
  anchorCoverage: z
    .object({
      total: z.number().int().nonnegative(),
      captured: z.number().int().nonnegative(),
    })
    .optional(),
});

export const templateConfirmationItemSchema = z.object({
  id: z.string(),
  type: z.enum(["section", "field", "style", "page-rule"]),
  label: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  resolved: z.boolean(),
  resolution: z.enum(["confirmed", "ignored"]).optional(),
  targetKey: z.string().optional(),
  suggestedValue: z.string().optional(),
});

export const templateEditablePageRuleFieldsSchema = z.object({
  headerTextLeft: z.string().optional(),
  headerTextRight: z.string().optional(),
  footerText: z.string().optional(),
  pageNumberPosition: z.enum(["left", "center", "right"]).optional(),
});

export const templateEditableSectionFieldSchema = z.object({
  key: templateSectionProfileSchema.shape.key,
  detected: z.boolean(),
  confidence: z.number().min(0).max(1),
  startAnchorText: z.string().optional(),
});

export const templateProfileEditableFieldsSchema = z.object({
  name: z.string().min(1),
  schoolName: z.string().optional(),
  formatSpecId: z.string().min(1),
  pageRule: templateEditablePageRuleFieldsSchema,
  sections: z.array(templateEditableSectionFieldSchema),
  fieldAnchors: z.array(templateFieldAnchorSchema),
  revisionNote: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const templateProfileEditablePatchSchema =
  templateProfileEditableFieldsSchema
    .extend({
      pageRule: templateEditablePageRuleFieldsSchema.optional(),
      sections: z.array(templateEditableSectionFieldSchema).optional(),
      fieldAnchors: z.array(templateFieldAnchorSchema).optional(),
    })
    .partial({
      name: true,
      schoolName: true,
      formatSpecId: true,
      revisionNote: true,
      tags: true,
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
  preview: templateValidationPreviewSchema.optional(),
  detail: templateValidationDetailSchema.optional(),
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
  version: z.number().int().positive().default(1),
  originTemplateId: z.string().optional(),
  revisionNote: z.string().optional(),
  schoolName: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  lastEditedAt: z.number().int().nonnegative().optional(),
  confidenceScore: z.number().min(0).max(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
