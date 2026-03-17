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
  keywordMinCount: z.number().int().positive(),
  keywordMaxCount: z.number().int().positive(),
  referenceMinCount: z.number().int().positive().optional(),
  foreignReferenceMinCount: z.number().int().positive().optional(),
  titleMaxLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  pageNumberPosition: z.enum(["left", "center", "right"]).optional(),
});
