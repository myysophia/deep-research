import { formatSpecSchema } from "./schema";

const undergraduateThesisSpec = formatSpecSchema.parse({
  id: "cn-undergraduate-graduation-thesis-v1",
  name: "中国高校本科毕业论文通用规范",
  description:
    "适用于中文高校本科毕业论文的通用结构校验，可作为模板识别先验与导出前体检基线。",
  thesisType: "graduation-thesis",
  educationLevel: "undergraduate",
  locale: "zh-CN",
  sectionRules: [
    { key: "cover", label: "封面", required: true, repeatable: false, order: 1 },
    {
      key: "declaration",
      label: "独创性声明",
      required: false,
      repeatable: false,
      order: 2,
    },
    {
      key: "authorization",
      label: "授权书",
      required: false,
      repeatable: false,
      order: 3,
    },
    {
      key: "abstract-zh",
      label: "中文摘要",
      required: true,
      repeatable: false,
      order: 4,
    },
    {
      key: "abstract-en",
      label: "英文摘要",
      required: true,
      repeatable: false,
      order: 5,
    },
    { key: "toc", label: "目录", required: true, repeatable: false, order: 6 },
    { key: "body", label: "正文", required: true, repeatable: false, order: 7 },
    {
      key: "references",
      label: "参考文献",
      required: true,
      repeatable: false,
      order: 8,
    },
    {
      key: "acknowledgements",
      label: "致谢",
      required: false,
      repeatable: false,
      order: 9,
    },
    {
      key: "appendix",
      label: "附录",
      required: false,
      repeatable: true,
      order: 10,
    },
  ],
  abstractZhMinLength: 200,
  abstractZhMaxLength: 500,
  abstractEnMinLength: 150,
  abstractEnMaxLength: 500,
  keywordMinCount: 3,
  keywordMaxCount: 7,
  referenceMinCount: 10,
  foreignReferenceMinCount: 0,
  titleMaxLevel: 3,
  pageNumberPosition: "right",
});

export const builtinFormatSpecs: FormatSpec[] = [undergraduateThesisSpec];

export function getBuiltinFormatSpecById(id: string) {
  return builtinFormatSpecs.find((item) => item.id === id);
}

export function getDefaultFormatSpec() {
  return builtinFormatSpecs[0];
}
