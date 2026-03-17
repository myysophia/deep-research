import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  type IRunOptions,
  NumberFormat,
  Packer,
  PageNumber,
  Paragraph,
  SectionType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  createDefaultPaperLayoutConfig,
  createDefaultThesisTemplateMeta,
} from "@/utils/paper";

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2sD0QAAAAASUVORK5CYII=";

type SectionMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function cmToTwip(value: number) {
  return Math.round(value * 567);
}

function ptToHalfPoint(value: number) {
  return Math.round(value * 2);
}

function lineSpacingToTwip(lineSpacing = 20) {
  return Math.round(lineSpacing * 20);
}

function isPreNumberedHeading(text: string) {
  return /^(\d+(\.\d+)*\s*|[一二三四五六七八九十]+、|（[一二三四五六七八九十]+）)/.test(
    text.trim()
  );
}

function createRun(text: string, options?: Partial<IRunOptions>) {
  return new TextRun({
    text,
    font: "SimSun",
    size: ptToHalfPoint(12),
    ...options,
  });
}

function createBodyParagraph(
  text: string,
  options?: {
    bold?: boolean;
    italics?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    firstLineIndent?: boolean;
    spacingAfter?: number;
    fontSize?: number;
    fontFamily?: string;
    lineSpacing?: number;
    firstLineIndentChars?: number;
  },
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  const lineSpacing = options?.lineSpacing ?? layoutConfig.lineSpacing ?? 1.5;
  const fontFamily = options?.fontFamily || layoutConfig.bodyFontFamily || "SimSun";
  const fontSize = options?.fontSize ?? layoutConfig.bodyFontSize ?? 12;
  const firstLineIndentChars =
    options?.firstLineIndentChars ?? layoutConfig.firstLineIndentChars ?? 2;
  return new Paragraph({
    alignment: options?.alignment || AlignmentType.JUSTIFIED,
    spacing: {
      line: lineSpacingToTwip(lineSpacing * 10),
      after: Math.round((options?.spacingAfter ?? 0) * 20),
    },
    indent:
      options?.firstLineIndent === false
        ? undefined
        : { firstLine: firstLineIndentChars * 210 },
    children: [
      createRun(text, {
        bold: options?.bold,
        italics: options?.italics,
        font: fontFamily,
        size: ptToHalfPoint(fontSize),
      }),
    ],
  });
}

function createHeading(
  text: string,
  level: 1 | 2 | 3,
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  const baseTitleSize = layoutConfig.titleFontSize || 15;
  const bodyFontSize = layoutConfig.bodyFontSize || 12;
  const size =
    level === 1
      ? baseTitleSize
      : level === 2
        ? Math.max(bodyFontSize + 2, baseTitleSize - 1)
        : Math.max(bodyFontSize, baseTitleSize - 2);
  const heading =
    level === 1
      ? HeadingLevel.HEADING_1
      : level === 2
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_3;

  return new Paragraph({
    heading,
    spacing: {
      before: 200,
      after: 100,
      line: lineSpacingToTwip(20),
    },
    children: [
      new TextRun({
        text,
        bold: true,
        font: layoutConfig.titleFontFamily || "SimHei",
        size: ptToHalfPoint(size),
      }),
    ],
  });
}

function createCaption(text: string, type: "table" | "figure") {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: {
      before: type === "table" ? 120 : 60,
      after: type === "table" ? 60 : 120,
      line: lineSpacingToTwip(20),
    },
    children: [
      new TextRun({
        text,
        bold: true,
        font: "SimHei",
        size: ptToHalfPoint(10.5),
      }),
    ],
  });
}

function createBodyFooter(
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  const footerText = layoutConfig.footerText?.trim();
  const alignment =
    layoutConfig.pageNumberPosition === "left"
      ? AlignmentType.LEFT
      : layoutConfig.pageNumberPosition === "right"
        ? AlignmentType.RIGHT
        : AlignmentType.CENTER;
  return new Footer({
    children: [
      new Paragraph({
        alignment,
        children: [
          ...(footerText
            ? [
                new TextRun({
                  text: `${footerText} `,
                  font: layoutConfig.bodyFontFamily || "SimSun",
                  size: ptToHalfPoint(10.5),
                }),
              ]
            : []),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: "Times New Roman",
            size: ptToHalfPoint(10.5),
          }),
        ],
      }),
    ],
  });
}

function createBodyHeader(
  text = "毕业论文",
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  const headerText =
    layoutConfig.headerTextLeft || layoutConfig.headerTextRight || text;
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: headerText,
            font: layoutConfig.bodyFontFamily || "SimSun",
            size: ptToHalfPoint(10.5),
          }),
        ],
      }),
    ],
  });
}

function stripMarkdown(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<QUERY[^>]*>/g, "")
    .replace(/[`*_>#]/g, "")
    .trim();
}

function normalizeArtifactTitle(title: string, type: "table" | "mermaid") {
  const cleaned = title
    .replace(/^(表|图)\s*\d+([-.－—]\d+)?\s*/u, "")
    .replace(/^(Table|Figure)\s*\d+([-.]\d+)?\s*/iu, "")
    .trim();

  if (cleaned) return cleaned;
  return type === "table" ? "数据表" : "示意图";
}

function parseMarkdownTable(lines: string[], start: number) {
  const rows: string[][] = [];
  let cursor = start;
  while (cursor < lines.length && /\|/.test(lines[cursor])) {
    const line = lines[cursor].trim();
    if (cursor !== start + 1) {
      rows.push(
        line
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((item) => item.trim())
      );
    }
    cursor += 1;
  }
  return { rows, nextIndex: cursor - 1 };
}

function isMarkdownTable(lines: string[], index: number) {
  return (
    index + 1 < lines.length &&
    /\|/.test(lines[index]) &&
    /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[index + 1])
  );
}

function buildThreeLineTable(rows: string[][]) {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 3, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 3, color: "000000" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "666666",
      },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment:
                      rowIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                    spacing: {
                      line: lineSpacingToTwip(18),
                    },
                    children: [
                      new TextRun({
                        text: cell,
                        bold: rowIndex === 0,
                        font: rowIndex === 0 ? "SimHei" : "SimSun",
                        size: ptToHalfPoint(10.5),
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
    ),
  });
}

function buildMarkdownBlocks(
  markdown: string,
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  const blocks: Array<Paragraph | Table> = [];
  const lines = markdown.split("\n");
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    const text = stripMarkdown(paragraphBuffer.join(" "));
    if (text) {
      blocks.push(createBodyParagraph(text, undefined, layoutConfig));
    }
    paragraphBuffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph();
      continue;
    }

    if (isMarkdownTable(lines, index)) {
      flushParagraph();
      const { rows, nextIndex } = parseMarkdownTable(lines, index);
      if (rows.length > 0) {
        blocks.push(buildThreeLineTable(rows));
      }
      index = nextIndex;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      const headingText = stripMarkdown(headingMatch[2]);
      const level = Math.min(headingMatch[1].length + 1, 3) as 1 | 2 | 3;
      blocks.push(createHeading(headingText, level, layoutConfig));
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: {
                  line: lineSpacingToTwip(20),
                },
          children: [
            createRun(stripMarkdown(trimmed.replace(/^[-*]\s+/, "")), {
              font: layoutConfig.bodyFontFamily || "SimSun",
              size: ptToHalfPoint(layoutConfig.bodyFontSize || 12),
            }),
          ],
        })
      );
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

function normalizePaperDocument(paperDocument: PaperDocument) {
  const templateMeta = {
    ...createDefaultThesisTemplateMeta(),
    ...paperDocument.templateMeta,
  };
  const normalizedTitle = paperDocument.title.replace(/\s+/g, "").trim();

  const abstractZh =
    paperDocument.abstractZh ||
    paperDocument.sections.find((section) => section.heading.trim() === "摘要")
      ?.markdown ||
    "";
  const abstractEn =
    paperDocument.abstractEn ||
    paperDocument.sections.find(
      (section) => section.heading.trim().toLowerCase() === "abstract"
    )?.markdown ||
    "";

  const bodySections = paperDocument.sections.filter((section) => {
    const rawHeading = section.heading.trim();
    const heading = rawHeading.toLowerCase();
    const compactHeading = rawHeading.replace(/\s+/g, "");
    return ![
      "摘要",
      "abstract",
      "关键词",
      "关键字",
      "keywords",
      "参考文献",
      "references",
      "致谢",
      "acknowledgements",
      "目录",
      "目 录",
    ].includes(rawHeading) &&
      compactHeading !== normalizedTitle &&
      !heading.startsWith("附录");
  });

  const appendixSections = paperDocument.sections.filter((section) =>
    section.heading.trim().startsWith("附录")
  );

  const acknowledgementsSection = paperDocument.sections.find((section) =>
    /致谢|acknowledgements/i.test(section.heading)
  );

  return {
    ...paperDocument,
    abstractZh: stripMarkdown(abstractZh),
    abstractEn: stripMarkdown(abstractEn),
    bodySections,
    appendixSections,
    acknowledgements:
      acknowledgementsSection?.markdown || templateMeta.acknowledgements,
    templateMeta,
  };
}

function createSectionProperties(
  margins: SectionMargins,
  options?: {
    startPage?: number;
    numberFormat?: (typeof NumberFormat)[keyof typeof NumberFormat];
    type?: (typeof SectionType)[keyof typeof SectionType];
  }
) {
  return {
    type: options?.type || SectionType.NEXT_PAGE,
    page: {
      margin: {
        top: cmToTwip(margins.top),
        right: cmToTwip(margins.right),
        bottom: cmToTwip(margins.bottom),
        left: cmToTwip(margins.left),
        header: cmToTwip(1.7),
        footer: cmToTwip(1.7),
      },
      pageNumbers:
        options?.numberFormat || options?.startPage
          ? {
              start: options?.startPage,
              formatType: options?.numberFormat,
            }
          : undefined,
    },
  };
}

function createCoverChildren(
  paperDocument: PaperDocument,
  templateMeta: ThesisTemplateMeta
) {
  const completionDate = templateMeta.completionDate || "2026年3月";
  const { layoutConfig } = paperDocument;
  const coverMetaFontSize = Math.max(layoutConfig.bodyFontSize + 2, 14);
  return [
    new Paragraph({
      spacing: {
        before: 1400,
        after: 800,
      },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "本科毕业论文(设计)",
          font: layoutConfig.titleFontFamily || "SimSun",
          bold: true,
          size: ptToHalfPoint(Math.max(layoutConfig.titleFontSize + 4, 22)),
        }),
      ],
    }),
    new Paragraph({
      spacing: {
        before: 500,
        after: 200,
      },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: paperDocument.title || "论文题目",
          font: layoutConfig.titleFontFamily || "SimHei",
          bold: true,
          size: ptToHalfPoint(layoutConfig.titleFontSize || 18),
        }),
      ],
    }),
    ...(templateMeta.subtitle
      ? [
          new Paragraph({
            spacing: {
              after: 800,
            },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: templateMeta.subtitle,
                font: layoutConfig.bodyFontFamily || "SimSun",
                size: ptToHalfPoint(coverMetaFontSize),
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({ spacing: { before: 600, after: 300 }, children: [createRun(`学    院：${templateMeta.college || ""}`, { font: layoutConfig.bodyFontFamily || "SimSun", size: ptToHalfPoint(coverMetaFontSize) })] }),
    new Paragraph({ spacing: { after: 300 }, children: [createRun(`专    业：${templateMeta.major || ""}`, { font: layoutConfig.bodyFontFamily || "SimSun", size: ptToHalfPoint(coverMetaFontSize) })] }),
    new Paragraph({ spacing: { after: 300 }, children: [createRun(`班    级：${templateMeta.className || ""}`, { font: layoutConfig.bodyFontFamily || "SimSun", size: ptToHalfPoint(coverMetaFontSize) })] }),
    new Paragraph({ spacing: { after: 300 }, children: [createRun(`学生姓名：${templateMeta.studentName || ""}`, { font: layoutConfig.bodyFontFamily || "SimSun", size: ptToHalfPoint(coverMetaFontSize) })] }),
    new Paragraph({ spacing: { after: 300 }, children: [createRun(`学    号：${templateMeta.studentId || ""}`, { font: layoutConfig.bodyFontFamily || "SimSun", size: ptToHalfPoint(coverMetaFontSize) })] }),
    new Paragraph({ spacing: { after: 300 }, children: [createRun(`指导教师：${templateMeta.advisor || ""}`, { font: layoutConfig.bodyFontFamily || "SimSun", size: ptToHalfPoint(coverMetaFontSize) })] }),
    new Paragraph({
      spacing: {
        before: 700,
      },
      alignment: AlignmentType.CENTER,
      children: [
        createRun(`完成日期：${completionDate}`, {
          font: layoutConfig.bodyFontFamily || "SimSun",
          size: ptToHalfPoint(coverMetaFontSize),
        }),
      ],
    }),
  ];
}

function createStatementChildren(title: string, meta: ThesisTemplateMeta) {
  const dateText = meta.completionDate ? `日期：${meta.completionDate}` : "日期：      年     月";
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 240,
        after: 240,
      },
      children: [
        new TextRun({
          text: "毕业论文（设计）原创性声明",
          bold: true,
          font: "SimHei",
          size: ptToHalfPoint(15),
        }),
      ],
    }),
    createBodyParagraph(
      `本人郑重声明：所呈交的毕业论文《${title || "论文题目"}》是在指导教师的指导下独立完成的研究成果。除文中已经注明引用的内容外，本论文不包含任何他人已经发表或撰写过的研究成果，也不包含为获得其他教育机构学位或证书而使用过的材料。对本文研究做出贡献的个人和集体，均已在文中以明确方式标注并致谢。本人愿对本声明承担全部责任。`
    ),
    new Paragraph({
      spacing: {
        before: 240,
      },
      children: [
        createRun(`作者签名：${meta.studentName || ""}                                       ${dateText}`, {
          size: ptToHalfPoint(12),
        }),
      ],
    }),
  ];
}

function createAuthorizationChildren(meta: ThesisTemplateMeta) {
  const authorDate = meta.completionDate ? `日期：${meta.completionDate}` : "日期：      年     月";
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 240,
        after: 240,
      },
      children: [
        new TextRun({
          text: "毕业论文（设计）版权使用授权书",
          bold: true,
          font: "SimHei",
          size: ptToHalfPoint(15),
        }),
      ],
    }),
    createBodyParagraph(
      "本人完全了解学校有关保留、使用毕业论文的规定，同意学校保存并向有关部门报送论文的复印件和电子版，允许论文被查阅和借阅；学校可以采用影印、缩印、数字化或其他复制手段保存、汇编和展示论文的全部或部分内容。"
    ),
    new Paragraph({
      spacing: {
        before: 240,
        after: 180,
      },
      children: [
        createRun(`作者签名：${meta.studentName || ""}                                       ${authorDate}`),
      ],
    }),
    new Paragraph({
      children: [
        createRun(`指导教师签名：${meta.advisor || ""}                                   ${authorDate}`),
      ],
    }),
  ];
}

function createAbstractSectionChildren(
  title: string,
  subtitle: string,
  heading: string,
  content: string,
  keywordsLabel: string,
  keywords: string[],
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 200,
        after: 120,
      },
      children: [
        new TextRun({
          text: title || "论文题目",
          font: layoutConfig.titleFontFamily || "SimHei",
          bold: true,
          size: ptToHalfPoint(layoutConfig.titleFontSize || 16),
        }),
      ],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 160,
            },
            children: [
              createRun(subtitle, {
                font: layoutConfig.bodyFontFamily || "SimSun",
                size: ptToHalfPoint(Math.max(layoutConfig.bodyFontSize + 2, 14)),
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 160,
      },
      children: [
        new TextRun({
          text: heading,
          font: layoutConfig.titleFontFamily || "SimHei",
          bold: true,
          size: ptToHalfPoint(Math.max(layoutConfig.titleFontSize - 1, 15)),
        }),
      ],
    }),
    createBodyParagraph(content || "请补充摘要内容。", undefined, layoutConfig),
    new Paragraph({
      spacing: {
        before: 120,
      },
      children: [
        new TextRun({
          text: `${keywordsLabel}：${keywords.join("；") || "请补充关键词"}`,
          font:
            heading === "Abstract"
              ? "Times New Roman"
              : layoutConfig.bodyFontFamily || "SimHei",
          bold: true,
          size: ptToHalfPoint(layoutConfig.bodyFontSize || 12),
        }),
      ],
    }),
  ];
}

function createTocChildren() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 200,
        after: 240,
      },
      children: [
        new TextRun({
          text: "目  录",
          font: "SimHei",
          bold: true,
          size: ptToHalfPoint(15),
        }),
      ],
    }),
    new TableOfContents("目录", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
  ];
}

function buildArtifactNodes(
  artifact: PaperArtifact,
  chapterNumber: string,
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  const captionPrefix = artifact.type === "table" ? "表" : "图";
  const indexInChapter = Number(artifact.id.replace(/\D+/g, "")) || 1;
  const caption = `${captionPrefix}${chapterNumber}-${indexInChapter} ${normalizeArtifactTitle(
    artifact.title,
    artifact.type
  )}`;
  const nodes: Array<Paragraph | Table> = [];

  if (artifact.type === "table") {
    nodes.push(createCaption(caption, "table"));
    const rows = artifact.content
      .split("\n")
      .filter(Boolean)
      .filter(
        (line, index) =>
          !(index === 1 && /^(\|\s*[-:]+\s*)+\|?$/.test(line.trim()))
      )
      .map((line) =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim())
      );
    if (rows.length > 0) {
      nodes.push(buildThreeLineTable(rows));
    }
  } else {
    if (artifact.renderedSvg) {
      try {
        nodes.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "svg",
                data: Buffer.from(artifact.renderedSvg, "utf-8"),
                fallback: {
                  type: "png",
                  data: Buffer.from(TRANSPARENT_PNG_BASE64, "base64"),
                },
                transformation: {
                  width: 520,
                  height: 280,
                },
              }),
            ],
          })
        );
      } catch {
        nodes.push(
          ...buildMarkdownBlocks(
            ["```mermaid", artifact.content, "```"].join("\n"),
            layoutConfig
          )
        );
      }
    } else {
      nodes.push(
        ...buildMarkdownBlocks(
          ["```mermaid", artifact.content, "```"].join("\n"),
          layoutConfig
        )
      );
    }
    nodes.push(createCaption(caption, "figure"));
  }

  if (artifact.note) {
    nodes.push(
      createBodyParagraph(artifact.note, {
        alignment: AlignmentType.CENTER,
        firstLineIndent: false,
        italics: true,
        fontSize: 10.5,
      }, layoutConfig)
    );
  }

  return nodes;
}

function buildBodyChildren(paperDocument: ReturnType<typeof normalizePaperDocument>) {
  const children: Array<Paragraph | Table> = [];
  const { layoutConfig } = paperDocument;

  paperDocument.bodySections.forEach((section, index) => {
    const sectionTitle =
      section.numbering && !isPreNumberedHeading(section.heading)
        ? `${section.numbering} ${section.heading}`
        : section.heading;
    children.push(createHeading(sectionTitle, section.level, layoutConfig));
    children.push(...buildMarkdownBlocks(section.markdown, layoutConfig));

    const chapterNumber =
      section.numbering.split(".")[0] || String(index + 1);
    paperDocument.artifacts
      .filter((artifact) => artifact.placementSectionId === section.id)
      .forEach((artifact) => {
        children.push(...buildArtifactNodes(artifact, chapterNumber, layoutConfig));
      });
  });

  return children;
}

function buildReferenceChildren(
  references: Source[],
  layoutConfig: PaperLayoutConfig = createDefaultPaperLayoutConfig()
) {
  if (references.length === 0) {
    return [
      createBodyParagraph(
        "暂无参考文献，请补充后再导出。",
        { firstLineIndent: false },
        layoutConfig
      ),
    ];
  }

  return references.map(
    (item, index) =>
      new Paragraph({
        spacing: {
          line: lineSpacingToTwip(20),
          after: 60,
        },
        indent: {
          hanging: 420,
        },
        style: "ListParagraph",
        children: [
          createRun(`[${index + 1}] ${item.title || "未命名文献"} `, {
            font: layoutConfig.bodyFontFamily || "SimSun",
            size: ptToHalfPoint(layoutConfig.bodyFontSize || 12),
          }),
          new ExternalHyperlink({
            link: item.url,
            children: [
              new TextRun({
                text: item.url,
                style: "Hyperlink",
              }),
            ],
          }),
        ],
      })
  );
}

export async function buildTemplateThesisDocxBuffer(input: PaperDocument) {
  const paperDocument = normalizePaperDocument({
    ...input,
    layoutConfig: input.layoutConfig || createDefaultPaperLayoutConfig(),
    templateMeta: {
      ...createDefaultThesisTemplateMeta(),
      ...input.templateMeta,
    },
  });
  const { templateMeta } = paperDocument;
  const title = paperDocument.title || "论文题目";
  const frontMatterMargins = paperDocument.layoutConfig.pageMargins;
  const bodyMargins = paperDocument.layoutConfig.pageMargins;

  const document = new Document({
    sections: [
      {
        properties: createSectionProperties(frontMatterMargins),
        children: createCoverChildren(paperDocument, templateMeta),
      },
      {
        properties: createSectionProperties(frontMatterMargins),
        children: createStatementChildren(title, templateMeta),
      },
      {
        properties: createSectionProperties(frontMatterMargins, {
          startPage: 1,
          numberFormat: NumberFormat.UPPER_ROMAN,
        }),
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children: createAbstractSectionChildren(
          title,
          templateMeta.subtitle,
          "摘  要",
          paperDocument.abstractZh,
          "关键词",
          paperDocument.keywordsZh,
          paperDocument.layoutConfig
        ),
      },
      {
        properties: createSectionProperties(frontMatterMargins, {
          numberFormat: NumberFormat.UPPER_ROMAN,
        }),
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children: createAuthorizationChildren(templateMeta),
      },
      {
        properties: createSectionProperties(frontMatterMargins, {
          numberFormat: NumberFormat.UPPER_ROMAN,
        }),
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children: createAbstractSectionChildren(
          title,
          templateMeta.subtitle,
          "Abstract",
          paperDocument.abstractEn,
          "Keywords",
          paperDocument.keywordsEn,
          paperDocument.layoutConfig
        ),
      },
      {
        properties: createSectionProperties(frontMatterMargins, {
          numberFormat: NumberFormat.UPPER_ROMAN,
        }),
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children: createTocChildren(),
      },
      {
        properties: createSectionProperties(bodyMargins, {
          startPage: 1,
          numberFormat: NumberFormat.DECIMAL,
        }),
        headers: {
          default: createBodyHeader("毕业论文", paperDocument.layoutConfig),
        },
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children: buildBodyChildren(paperDocument),
      },
      {
        properties: createSectionProperties(bodyMargins, {
          numberFormat: NumberFormat.DECIMAL,
        }),
        headers: {
          default: createBodyHeader("毕业论文", paperDocument.layoutConfig),
        },
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children: [
          createHeading("参考文献", 1, paperDocument.layoutConfig),
          ...buildReferenceChildren(
            paperDocument.references,
            paperDocument.layoutConfig
          ),
        ],
      },
      {
        properties: createSectionProperties(bodyMargins, {
          numberFormat: NumberFormat.DECIMAL,
        }),
        headers: {
          default: createBodyHeader("毕业论文", paperDocument.layoutConfig),
        },
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children: [
          createHeading("致谢", 1, paperDocument.layoutConfig),
          createBodyParagraph(
            stripMarkdown(templateMeta.acknowledgements),
            undefined,
            paperDocument.layoutConfig
          ),
        ],
      },
      {
        properties: createSectionProperties(bodyMargins, {
          numberFormat: NumberFormat.DECIMAL,
        }),
        headers: {
          default: createBodyHeader("毕业论文", paperDocument.layoutConfig),
        },
        footers: {
          default: createBodyFooter(paperDocument.layoutConfig),
        },
        children:
          paperDocument.appendixSections.length > 0
            ? paperDocument.appendixSections.flatMap((section) => [
                createHeading(section.heading, 1, paperDocument.layoutConfig),
                ...buildMarkdownBlocks(
                  section.markdown,
                  paperDocument.layoutConfig
                ),
              ])
            : [
                createHeading("附录", 1, paperDocument.layoutConfig),
                createBodyParagraph("暂无附录内容。", {
                  firstLineIndent: false,
                }, paperDocument.layoutConfig),
              ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
