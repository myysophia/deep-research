export type ThesisQuickPromptId =
  | "general-academic"
  | "undergraduate"
  | "master";

export interface ThesisQuickPromptTemplate {
  id: ThesisQuickPromptId;
  promptTemplate: string;
}

export const DEFAULT_THESIS_QUICK_PROMPT_ID: ThesisQuickPromptId =
  "undergraduate";

export const THESIS_QUICK_PROMPT_TEMPLATES: ThesisQuickPromptTemplate[] = [
  {
    id: "general-academic",
    promptTemplate: `你现在是一名熟悉中国高校论文写作规范的学术写作助手。

请围绕论文题目《{{title}}》，为我设计一份完整的论文写作框架。

要求：
1. 输出一级标题、二级标题、三级标题。
2. 框架要符合本科/硕士论文常见结构。
3. 每个二级标题后说明“本节写什么”“解决什么问题”。
4. 逻辑要完整，体现“提出问题—分析问题—解决问题—总结”的思路。
5. 不要空泛，不要只给标题，要写出每部分的内容重点。
6. 输出格式清晰，适合直接作为论文目录和写作提纲使用。`,
  },
  {
    id: "undergraduate",
    promptTemplate: `请以本科毕业论文的标准，为题目《{{title}}》设计论文框架。

要求：
1. 结构符合本科毕业论文写作习惯，避免过度理论化。
2. 框架应包括：摘要、关键词、引言、理论基础/概念界定、现状分析、问题分析、对策建议、结论、参考文献。
3. 正文标题层级采用：
   一、
   （一）
   1.
4. 每一章后补充“本章写作要点”。
5. 语言务实，突出可写性，不要写成空洞的大纲。
6. 结合题目特点，尽量体现专业性和现实意义。`,
  },
  {
    id: "master",
    promptTemplate: `请按照硕士论文的研究逻辑，为《{{title}}》设计论文框架。

要求：
1. 体现研究问题、研究目标、研究假设/研究思路、研究方法、研究结论的逻辑链条。
2. 给出一级标题、二级标题，并说明每章之间的逻辑关系。
3. 在引言部分明确：
   - 研究背景
   - 研究意义
   - 文献综述
   - 研究思路与方法
   - 创新点
4. 在正文部分明确理论分析、实证分析/案例分析、结论与建议。
5. 输出为可直接扩展成论文正文的详细提纲。`,
  },
];

export function formatThesisQuickPrompt(
  title: string,
  templateId: ThesisQuickPromptId
): string {
  const normalizedTitle = title.trim();
  const template = THESIS_QUICK_PROMPT_TEMPLATES.find(
    (item) => item.id === templateId
  );

  if (!template || !normalizedTitle) {
    return normalizedTitle;
  }

  return template.promptTemplate.replaceAll("{{title}}", normalizedTitle);
}
