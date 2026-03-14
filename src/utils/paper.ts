import { unique } from "radash";

const NON_NUMBERED_HEADINGS = ["参考文献", "附录", "致谢", "acknowledgements"];

function slugifyHeading(text: string, index: number) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return normalized ? `section-${normalized}-${index + 1}` : `section-${index + 1}`;
}

function trimMarkdown(text: string) {
  return text.replace(/^\n+|\n+$/g, "").trim();
}

function stripMarkdown(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#-]/g, "")
    .trim();
}

function isNonNumberedHeading(heading: string) {
  const normalized = heading.trim().toLowerCase();
  return NON_NUMBERED_HEADINGS.some((item) => normalized.startsWith(item));
}

export function createDefaultPaperLayoutConfig(): PaperLayoutConfig {
  return {
    paperSize: "A4",
    pageMargins: {
      top: 2.54,
      right: 2.4,
      bottom: 2.54,
      left: 3.18,
    },
    bindingSide: "left",
    titleFontFamily: "SimSun",
    titleFontSize: 18,
    bodyFontFamily: "SimSun",
    bodyFontSize: 12,
    lineSpacing: 1.5,
    letterSpacing: 0,
    paragraphSpacingBefore: 0,
    paragraphSpacingAfter: 8,
    firstLineIndentChars: 2,
    headerTextLeft: "AI论文撰写智能体",
    headerTextRight: "",
    footerText: "",
    showPageNumber: true,
    pageNumberPosition: "center",
    frontMatterPageNumberStyle: "roman",
    bodyPageNumberStyle: "decimal",
  };
}

export function createDefaultThesisTemplateMeta(): ThesisTemplateMeta {
  return {
    subtitle: "",
    college: "",
    major: "",
    className: "",
    studentName: "",
    studentId: "",
    advisor: "",
    completionDate: "",
    acknowledgements:
      "在本论文撰写过程中，谨向给予指导、帮助与支持的老师、同学和家人致以诚挚谢意。",
  };
}

export function createEmptyPaperDocument(): PaperDocument {
  return {
    title: "",
    abstractZh: "",
    abstractEn: "",
    keywordsZh: [],
    keywordsEn: [],
    sections: [],
    references: [],
    artifacts: [],
    layoutConfig: createDefaultPaperLayoutConfig(),
    templateMeta: createDefaultThesisTemplateMeta(),
  };
}

export function derivePaperSections(markdown: string): PaperSection[] {
  const content = trimMarkdown(markdown);
  if (!content) {
    return [];
  }

  const lines = content.split("\n");
  const sections: Array<{
    level: 1 | 2 | 3;
    heading: string;
    lines: string[];
  }> = [];

  let current: { level: 1 | 2 | 3; heading: string; lines: string[] } | null =
    null;

  for (const line of lines) {
    const matched = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (matched) {
      if (current) sections.push(current);
      current = {
        level: matched[1].length as 1 | 2 | 3,
        heading: matched[2].trim(),
        lines: [],
      };
      continue;
    }

    if (!current) {
      current = {
        level: 1,
        heading: "正文",
        lines: [],
      };
    }
    current.lines.push(line);
  }

  if (current) sections.push(current);

  const counters = [0, 0, 0];
  return sections.map((section, index) => {
    const levelIndex = section.level - 1;
    counters[levelIndex] += 1;
    for (let i = levelIndex + 1; i < counters.length; i += 1) {
      counters[i] = 0;
    }

    const numbering = isNonNumberedHeading(section.heading)
      ? ""
      : counters.slice(0, section.level).filter(Boolean).join(".");

    return {
      id: slugifyHeading(section.heading, index),
      level: section.level,
      numbering,
      heading: section.heading,
      markdown: trimMarkdown(section.lines.join("\n")),
    };
  });
}

function parseKeywordsFromText(text: string) {
  return text
    .split(/[;,，；、]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanKeywordList(keywords: string[]) {
  return unique(
    keywords
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !item.includes("请补充")),
    (item) => item.toLowerCase()
  ).slice(0, 6);
}

function inferChineseKeywords(title: string, abstractZh: string) {
  const text = `${title} ${abstractZh}`;
  const stopwords = new Set([
    "基于",
    "研究",
    "策略",
    "分析",
    "优化",
    "问题",
    "路径",
    "对策",
    "建议",
    "影响",
    "现状",
    "本文",
    "论文",
    "通过",
    "进行",
    "以及",
    "提出",
    "构建",
    "品牌",
  ]);

  const matches = text.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
  return cleanKeywordList(
    matches.filter((item) => !stopwords.has(item)).slice(0, 4)
  );
}

function inferEnglishKeywords(title: string, abstractEn: string) {
  const text = `${title} ${abstractEn}`;
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "through",
    "brand",
    "study",
    "research",
    "paper",
    "based",
    "analysis",
    "strategy",
  ]);

  const matches = text.match(/[A-Za-z][A-Za-z0-9-]{2,}/g) || [];
  return cleanKeywordList(
    matches
      .map((item) => item.trim())
      .filter((item) => !stopwords.has(item.toLowerCase()))
      .slice(0, 6)
  );
}

export function preparePaperDocumentForExport(
  paperDocument: PaperDocument,
  fallbackSources: Source[] = []
) {
  const warnings: string[] = [];
  const nextReferences = unique(
    [...(paperDocument.references || []), ...fallbackSources].filter(
      (item) => item?.url?.trim()
    ),
    (item) => item.url
  );

  const keywordsZh = cleanKeywordList(paperDocument.keywordsZh || []);
  const keywordsEn = cleanKeywordList(paperDocument.keywordsEn || []);

  const inferredKeywordsZh =
    keywordsZh.length > 0
      ? keywordsZh
      : inferChineseKeywords(paperDocument.title, paperDocument.abstractZh);
  const inferredKeywordsEn =
    keywordsEn.length > 0
      ? keywordsEn
      : inferEnglishKeywords(paperDocument.title, paperDocument.abstractEn);

  if (keywordsZh.length === 0 && inferredKeywordsZh.length > 0) {
    warnings.push("已根据标题和中文摘要自动补全中文关键词");
  }
  if (keywordsEn.length === 0 && inferredKeywordsEn.length > 0) {
    warnings.push("已根据标题和英文摘要自动补全英文关键词");
  }
  if ((paperDocument.references || []).length === 0 && nextReferences.length > 0) {
    warnings.push("已自动合并研究来源到参考文献列表");
  }
  if (nextReferences.length === 0) {
    warnings.push("当前仍无参考文献，导出稿仅可用于排版预览");
  }

  return {
    paperDocument: {
      ...paperDocument,
      keywordsZh: inferredKeywordsZh,
      keywordsEn: inferredKeywordsEn,
      references: nextReferences,
    },
    warnings,
  };
}

export function normalizePaperArtifacts(
  artifacts: PaperArtifact[],
  sections: PaperSection[]
): PaperArtifact[] {
  if (sections.length === 0) return [];
  const fallbackSectionId = sections[0].id;
  const sectionIds = new Set(sections.map((section) => section.id));

  return artifacts.map((artifact) => ({
    ...artifact,
    placementSectionId: sectionIds.has(artifact.placementSectionId)
      ? artifact.placementSectionId
      : fallbackSectionId,
  }));
}

export function derivePaperDocument(params: {
  title?: string;
  markdown: string;
  sources?: Source[];
  artifacts?: PaperArtifact[];
  layoutConfig?: PaperLayoutConfig;
  templateMeta?: ThesisTemplateMeta;
}): PaperDocument {
  const sections = derivePaperSections(params.markdown);
  const normalizedTitle =
    params.title ||
    sections[0]?.heading ||
    stripMarkdown(params.markdown.split("\n")[0] || "");
  const references = unique(params.sources || [], (item) => item.url);

  let abstractZh = "";
  let abstractEn = "";
  let keywordsZh: string[] = [];
  let keywordsEn: string[] = [];

  sections.forEach((section) => {
    const heading = section.heading.toLowerCase();
    if (heading === "摘要") {
      abstractZh = stripMarkdown(section.markdown);
    }
    if (heading === "abstract") {
      abstractEn = stripMarkdown(section.markdown);
    }
    if (heading === "关键词" || heading === "关键字") {
      keywordsZh = parseKeywordsFromText(stripMarkdown(section.markdown));
    }
    if (heading === "keywords") {
      keywordsEn = parseKeywordsFromText(stripMarkdown(section.markdown));
    }
  });

  return {
    title: normalizedTitle,
    abstractZh,
    abstractEn,
    keywordsZh,
    keywordsEn,
    sections,
    references,
    artifacts: normalizePaperArtifacts(params.artifacts || [], sections),
    layoutConfig: params.layoutConfig || createDefaultPaperLayoutConfig(),
    templateMeta: params.templateMeta || createDefaultThesisTemplateMeta(),
  };
}

export function syncPaperDocument(
  current: PaperDocument | undefined,
  updates: {
    title?: string;
    markdown: string;
    sources?: Source[];
  }
) {
  return derivePaperDocument({
    title: updates.title || current?.title,
    markdown: updates.markdown,
    sources: updates.sources || current?.references || [],
    artifacts: current?.artifacts || [],
    layoutConfig: current?.layoutConfig || createDefaultPaperLayoutConfig(),
    templateMeta: current?.templateMeta || createDefaultThesisTemplateMeta(),
  });
}

export function buildPaperToc(paperDocument: PaperDocument) {
  return paperDocument.sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    numbering: section.numbering,
    level: section.level,
  }));
}

export function renderPaperArtifactMarkdown(artifact: PaperArtifact) {
  const title = artifact.title.trim();
  const note = artifact.note?.trim();

  if (artifact.type === "table") {
    return [title ? `**${title}**` : "", artifact.content, note || ""]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    title ? `**${title}**` : "",
    "```mermaid",
    artifact.content.trim(),
    "```",
    note || "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function serializePaperDocumentToMarkdown(
  paperDocument: PaperDocument,
  options?: {
    includeToc?: boolean;
    includeReferences?: boolean;
  }
) {
  const includeToc = options?.includeToc ?? true;
  const includeReferences = options?.includeReferences ?? true;
  const blocks: string[] = [];

  if (paperDocument.title) {
    blocks.push(`# ${paperDocument.title}`);
  }

  if (paperDocument.abstractZh) {
    blocks.push(`## 摘要\n\n${paperDocument.abstractZh}`);
  }

  if (paperDocument.keywordsZh.length > 0) {
    blocks.push(`**关键词：** ${paperDocument.keywordsZh.join("；")}`);
  }

  if (includeToc && paperDocument.sections.length > 0) {
    blocks.push(
      [
        "## 目录",
        ...buildPaperToc(paperDocument).map((item) => {
          const indent = "  ".repeat(item.level - 1);
          return `${indent}- ${item.numbering ? `${item.numbering} ` : ""}${item.heading}`;
        }),
      ].join("\n")
    );
  }

  paperDocument.sections.forEach((section) => {
    const prefix = "#".repeat(section.level + 1);
    blocks.push(
      [section.heading ? `${prefix} ${section.heading}` : "", section.markdown]
        .filter(Boolean)
        .join("\n\n")
    );

    paperDocument.artifacts
      .filter((artifact) => artifact.placementSectionId === section.id)
      .forEach((artifact) => {
        blocks.push(renderPaperArtifactMarkdown(artifact));
      });
  });

  if (includeReferences && paperDocument.references.length > 0) {
    blocks.push(
      [
        "## 参考文献",
        ...paperDocument.references.map(
          (item, index) => `[${index + 1}] ${item.title || item.url} ${item.url}`
        ),
      ].join("\n")
    );
  }

  return blocks.filter(Boolean).join("\n\n");
}

export function generatePaperArtifacts(params: {
  title: string;
  tasks: SearchTask[];
  paperDocument: PaperDocument;
}): PaperArtifact[] {
  const { title, tasks, paperDocument } = params;
  if (paperDocument.sections.length === 0 || tasks.length === 0) {
    return [];
  }

  const targetSection =
    paperDocument.sections.find((section) =>
      /(现状|分析|结果|讨论|策略|结论|introduction|discussion|results)/i.test(
        section.heading
      )
    ) || paperDocument.sections[0];

  const tableHeader = [
    "| 研究主题 | 研究目标 | 结论概述 |",
    "| --- | --- | --- |",
  ];
  const tableRows = tasks.slice(0, 5).map((task) => {
    const summary = stripMarkdown(task.learning)
      .replace(/\s+/g, " ")
      .slice(0, 80);
    return `| ${task.query} | ${task.researchGoal || "补充论证"} | ${
      summary || "结合研究主题形成论证结论"
    } |`;
  });

  const sectionNodes = paperDocument.sections
    .filter((section) => section.level === 1)
    .slice(0, 6)
    .map((section, index) => `S${index + 1}["${section.heading}"]`);
  const sectionEdges = paperDocument.sections
    .filter((section) => section.level === 1)
    .slice(0, 6)
    .map((section, index) => {
      if (index === 0) {
        return `T["${title || "论文主题"}"] --> S1`;
      }
      return `S${index} --> S${index + 1}`;
    });

  return normalizePaperArtifacts(
    [
      {
        id: "artifact-table-summary",
        type: "table",
        title: "表 1 研究主题与结论概览",
        placementSectionId: targetSection.id,
        content: [...tableHeader, ...tableRows].join("\n"),
        isSyntheticData: true,
        note: "注：示意数据/摘要由系统根据研究过程自动整理，仅用于论文论证展示。",
      },
      {
        id: "artifact-mermaid-structure",
        type: "mermaid",
        title: "图 1 论文论证结构图",
        placementSectionId: targetSection.id,
        content: ["graph TD", ...sectionNodes, ...sectionEdges].join("\n"),
        isSyntheticData: true,
        note: "注：结构图由系统根据当前论文章节自动生成。",
      },
    ],
    paperDocument.sections
  );
}
