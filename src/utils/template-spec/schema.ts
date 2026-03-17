import { z } from "zod";

export const formatSpecSectionRuleSchema = z.object({
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
  required: z.boolean(),
  repeatable: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const formatSpecBodyChapterRuleSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  order: z.number().int().nonnegative(),
  minLength: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
});

export const formatSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  thesisType: z.enum(["graduation-thesis", "course-paper", "proposal"]),
  educationLevel: z.enum(["undergraduate", "master", "general"]),
  locale: z.string(),
  sectionRules: z.array(formatSpecSectionRuleSchema),
  abstractZhMinLength: z.number().int().positive().optional(),
  abstractZhMaxLength: z.number().int().positive().optional(),
  abstractEnMinLength: z.number().int().positive().optional(),
  abstractEnMaxLength: z.number().int().positive().optional(),
  titleMinLength: z.number().int().positive().optional(),
  titleMaxLength: z.number().int().positive().optional(),
  bodyMinLength: z.number().int().positive().optional(),
  bodyMaxLength: z.number().int().positive().optional(),
  keywordMinCount: z.number().int().positive(),
  keywordMaxCount: z.number().int().positive(),
  keywordSeparator: z.enum(["，", ",", "；", ";", "、", "/"]).optional(),
  keywordSeparatorRequired: z.boolean().optional(),
  tocRequirePageNumbers: z.boolean().optional(),
  referenceMinCount: z.number().int().positive().optional(),
  foreignReferenceMinCount: z.number().int().nonnegative().optional(),
  referenceStyle: z
    .enum([
      "gb-t-7714-2015-numeric",
      "gb-t-7714-2015-author-date",
      "apa-7",
      "mla-9",
      "chicago-17",
      "ieee",
    ])
    .optional(),
  requireCitationStyleConsistency: z.boolean().optional(),
  titleMaxLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  pageNumberPosition: z.enum(["left", "center", "right"]).optional(),
  requireContinuousPageNumbers: z.boolean().optional(),
  allowFrontMatterPageNumberReset: z.boolean().optional(),
  bodyChapterRules: z.array(formatSpecBodyChapterRuleSchema).optional(),
});
