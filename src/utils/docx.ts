import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2sD0QAAAAASUVORK5CYII=";

function cmToTwip(value: number) {
  return Math.round(value * 567);
}

function ptToHalfPoint(value: number) {
  return Math.round(value * 2);
}

function lineSpacingToTwip(value: number, fontSize: number) {
  return Math.round(value * fontSize * 20);
}

function escapeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildBodyParagraph(text: string, layoutConfig: PaperLayoutConfig) {
  return new Paragraph({
    spacing: {
      before: Math.round(layoutConfig.paragraphSpacingBefore * 20),
      after: Math.round(layoutConfig.paragraphSpacingAfter * 20),
      line: lineSpacingToTwip(
        layoutConfig.lineSpacing,
        layoutConfig.bodyFontSize
      ),
    },
    indent: {
      firstLine: layoutConfig.firstLineIndentChars * 420,
    },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        font: layoutConfig.bodyFontFamily,
        size: ptToHalfPoint(layoutConfig.bodyFontSize),
      }),
    ],
  });
}

function buildHeadingParagraph(
  section: PaperSection,
  layoutConfig: PaperLayoutConfig
) {
  const headingText = `${section.numbering ? `${section.numbering} ` : ""}${section.heading}`;
  const headingLevel =
    section.level === 1
      ? HeadingLevel.HEADING_1
      : section.level === 2
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_3;

  return new Paragraph({
    heading: headingLevel,
    spacing: {
      before: 240,
      after: 120,
    },
    children: [
      new TextRun({
        text: headingText,
        bold: true,
        font: layoutConfig.bodyFontFamily,
        size: ptToHalfPoint(
          Math.max(layoutConfig.bodyFontSize + (4 - section.level * 1.5), 12)
        ),
      }),
    ],
  });
}

function isMarkdownTableStart(lines: string[], index: number) {
  return (
    index + 1 < lines.length &&
    /\|/.test(lines[index]) &&
    /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[index + 1])
  );
}

function parseTableRows(lines: string[], start: number) {
  const rows: string[][] = [];
  let cursor = start;
  while (cursor < lines.length && /\|/.test(lines[cursor])) {
    if (cursor !== start + 1) {
      const row = lines[cursor]
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
      rows.push(row);
    }
    cursor += 1;
  }
  return { rows, nextIndex: cursor - 1 };
}

function markdownTableToDocx(
  rows: string[][],
  layoutConfig: PaperLayoutConfig
) {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
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
                    alignment: rowIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [
                      new TextRun({
                        text: cell,
                        bold: rowIndex === 0,
                        font: layoutConfig.bodyFontFamily,
                        size: ptToHalfPoint(layoutConfig.bodyFontSize),
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

function markdownToParagraphChildren(
  markdown: string,
  layoutConfig: PaperLayoutConfig
) {
  const blocks: Array<Paragraph | Table> = [];
  const lines = markdown.split("\n");
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    const text = escapeText(paragraphBuffer.join(" "));
    if (text) {
      blocks.push(buildBodyParagraph(text, layoutConfig));
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

    if (isMarkdownTableStart(lines, index)) {
      flushParagraph();
      const { rows, nextIndex } = parseTableRows(lines, index);
      blocks.push(markdownTableToDocx(rows, layoutConfig));
      index = nextIndex;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: trimmed.replace(/^[-*]\s+/, ""),
              font: layoutConfig.bodyFontFamily,
              size: ptToHalfPoint(layoutConfig.bodyFontSize),
            }),
          ],
          spacing: {
            line: lineSpacingToTwip(
              layoutConfig.lineSpacing,
              layoutConfig.bodyFontSize
            ),
          },
        })
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              font: layoutConfig.bodyFontFamily,
              size: ptToHalfPoint(layoutConfig.bodyFontSize),
            }),
          ],
          spacing: {
            line: lineSpacingToTwip(
              layoutConfig.lineSpacing,
              layoutConfig.bodyFontSize
            ),
          },
        })
      );
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

function buildReferenceParagraphs(
  references: Source[],
  layoutConfig: PaperLayoutConfig
) {
  return references.map(
    (item, index) =>
      new Paragraph({
        spacing: {
          line: lineSpacingToTwip(
            layoutConfig.lineSpacing,
            layoutConfig.bodyFontSize
          ),
          after: 80,
        },
        children: [
          new TextRun({
            text: `[${index + 1}] ${item.title || item.url} `,
            font: layoutConfig.bodyFontFamily,
            size: ptToHalfPoint(layoutConfig.bodyFontSize),
          }),
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: item.url,
                style: "Hyperlink",
              }),
            ],
            link: item.url,
          }),
        ],
      })
  );
}

function buildArtifactNodes(
  artifact: PaperArtifact,
  layoutConfig: PaperLayoutConfig
) {
  const nodes: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 160,
        after: 120,
      },
      children: [
        new TextRun({
          text: artifact.title,
          bold: true,
          font: layoutConfig.bodyFontFamily,
          size: ptToHalfPoint(layoutConfig.bodyFontSize),
        }),
      ],
    }),
  ];

  if (artifact.type === "table") {
    const rows = artifact.content
      .split("\n")
      .filter(Boolean)
      .filter((line, index) => !(index === 1 && /^(\|\s*[-:]+\s*)+\|?$/.test(line.trim())))
      .map((line) =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim())
      );
    if (rows.length > 0) {
      nodes.push(markdownTableToDocx(rows, layoutConfig));
    }
  } else if (artifact.renderedSvg) {
    try {
      const svgBuffer = Buffer.from(artifact.renderedSvg, "utf-8");
      nodes.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "svg",
              data: svgBuffer,
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
        ...markdownToParagraphChildren(
          ["```mermaid", artifact.content, "```"].join("\n"),
          layoutConfig
        )
      );
    }
  } else {
    nodes.push(
      ...markdownToParagraphChildren(
        ["```mermaid", artifact.content, "```"].join("\n"),
        layoutConfig
      )
    );
  }

  if (artifact.note) {
    nodes.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 100,
          after: 120,
        },
        children: [
          new TextRun({
            text: artifact.note,
            italics: true,
            font: layoutConfig.bodyFontFamily,
            size: ptToHalfPoint(Math.max(layoutConfig.bodyFontSize - 1, 10)),
          }),
        ],
      })
    );
  }

  return nodes;
}

export async function buildPaperDocxBuffer(paperDocument: PaperDocument) {
  const { layoutConfig } = paperDocument;
  const children: Array<Paragraph | Table | TableOfContents> = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 360,
      },
      children: [
        new TextRun({
          text: paperDocument.title || "未命名论文",
          bold: true,
          font: layoutConfig.titleFontFamily,
          size: ptToHalfPoint(layoutConfig.titleFontSize),
        }),
      ],
    })
  );

  if (paperDocument.abstractZh) {
    children.push(
      new Paragraph({
        text: "摘要",
        heading: HeadingLevel.HEADING_1,
      }),
      buildBodyParagraph(paperDocument.abstractZh, layoutConfig)
    );
  }

  if (paperDocument.keywordsZh.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `关键词：${paperDocument.keywordsZh.join("；")}`,
            bold: true,
            font: layoutConfig.bodyFontFamily,
            size: ptToHalfPoint(layoutConfig.bodyFontSize),
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      text: "目录",
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
    }),
    new TableOfContents("目录", {
      hyperlink: true,
      headingStyleRange: "1-3",
    })
  );

  paperDocument.sections.forEach((section) => {
    children.push(buildHeadingParagraph(section, layoutConfig));
    children.push(...markdownToParagraphChildren(section.markdown, layoutConfig));

    const artifacts = paperDocument.artifacts.filter(
      (artifact) => artifact.placementSectionId === section.id
    );
    artifacts.forEach((artifact) => {
      children.push(...buildArtifactNodes(artifact, layoutConfig));
    });
  });

  if (
    paperDocument.references.length > 0 &&
    !paperDocument.sections.some((section) =>
      /参考文献|references/i.test(section.heading)
    )
  ) {
    children.push(
      new Paragraph({
        text: "参考文献",
        heading: HeadingLevel.HEADING_1,
      }),
      ...buildReferenceParagraphs(paperDocument.references, layoutConfig)
    );
  }

  const pageNumberAlignment =
    layoutConfig.pageNumberPosition === "left"
      ? AlignmentType.LEFT
      : layoutConfig.pageNumberPosition === "right"
        ? AlignmentType.RIGHT
        : AlignmentType.CENTER;

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: cmToTwip(layoutConfig.pageMargins.top),
              right: cmToTwip(layoutConfig.pageMargins.right),
              bottom: cmToTwip(layoutConfig.pageMargins.bottom),
              left: cmToTwip(layoutConfig.pageMargins.left),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: layoutConfig.headerTextLeft,
                    font: layoutConfig.bodyFontFamily,
                    size: 18,
                  }),
                  new TextRun({
                    text: layoutConfig.headerTextRight
                      ? `    ${layoutConfig.headerTextRight}`
                      : "",
                    font: layoutConfig.bodyFontFamily,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: pageNumberAlignment,
                children: [
                  new TextRun({
                    text: layoutConfig.footerText
                      ? `${layoutConfig.footerText} `
                      : "",
                    font: layoutConfig.bodyFontFamily,
                    size: 18,
                  }),
                  ...(layoutConfig.showPageNumber
                    ? [
                        new TextRun({
                          children: [PageNumber.CURRENT],
                          font: layoutConfig.bodyFontFamily,
                          size: 18,
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(document);
}
