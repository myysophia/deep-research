/**
 * numbering.ts
 * 解析 word/numbering.xml，提取编号定义与抽象编号层级信息。
 * 用于辅助判断文档是否使用了多级列表样式（对标题层级识别有帮助）。
 */

function readAttr(xml: string, attrName: string): string | undefined {
  const matched = new RegExp(`${attrName}="([^"]*)"`, "i").exec(xml);
  return matched?.[1];
}

/** 单个抽象编号的层级摘要 */
export interface AbstractNumLevel {
  /** 层级索引（0-based） */
  ilvl: number;
  /** 编号格式，如 decimal / lowerLetter / upperRoman */
  numFmt: string;
  /** 关联的段落样式 ID（如 Heading1） */
  pStyle?: string;
  /** 编号文本模板，如 "%1." */
  lvlText?: string;
}

/** 抽象编号定义摘要 */
export interface AbstractNumSummary {
  abstractNumId: string;
  /** 各层级定义 */
  levels: AbstractNumLevel[];
  /** 是否包含标题层级（pStyle 含 Heading/标题字样） */
  hasHeadingLevels: boolean;
}

/** 具体编号实例，关联到某个 abstractNum */
export interface NumInstanceSummary {
  numId: string;
  abstractNumId: string;
}

/** numbering.xml 整体解析结果 */
export interface NumberingSummary {
  abstractNums: AbstractNumSummary[];
  numInstances: NumInstanceSummary[];
  /** 文档使用了多级列表（含标题层级）的 numId 列表 */
  headingLinkedNumIds: string[];
}

/**
 * 从 word/numbering.xml 的文本中解析编号定义。
 * 若 numberingXml 为空则返回空摘要。
 */
export function extractNumberingSummary(numberingXml: string): NumberingSummary {
  const empty: NumberingSummary = {
    abstractNums: [],
    numInstances: [],
    headingLinkedNumIds: [],
  };

  if (!numberingXml) return empty;

  // ── 解析抽象编号 ──────────────────────────────────────────
  const abstractNumBlocks =
    numberingXml.match(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g) || [];

  const abstractNums: AbstractNumSummary[] = abstractNumBlocks.map((block) => {
    const abstractNumId = readAttr(block, "w:abstractNumId") ?? "";

    // 每个层级 <w:lvl>
    const lvlBlocks = block.match(/<w:lvl\b[\s\S]*?<\/w:lvl>/g) || [];
    const levels: AbstractNumLevel[] = lvlBlocks.map((lvl) => {
      const ilvl = Number(readAttr(lvl, "w:ilvl") ?? "0");
      const numFmtMatch = /\<w:numFmt[^>]*w:val="([^"]+)"/.exec(lvl);
      const pStyleMatch = /\<w:pStyle[^>]*w:val="([^"]+)"/.exec(lvl);
      const lvlTextMatch = /\<w:lvlText[^>]*w:val="([^"]*)"/.exec(lvl);

      return {
        ilvl,
        numFmt: numFmtMatch?.[1] ?? "bullet",
        pStyle: pStyleMatch?.[1],
        lvlText: lvlTextMatch?.[1],
      };
    });

    const hasHeadingLevels = levels.some(
      (l) =>
        l.pStyle &&
        (/heading/i.test(l.pStyle) || /标题/.test(l.pStyle))
    );

    return { abstractNumId, levels, hasHeadingLevels };
  });

  // ── 解析具体编号实例 ──────────────────────────────────────
  const numBlocks =
    numberingXml.match(/<w:num\b(?!Id)[\s\S]*?<\/w:num>/g) || [];

  const numInstances: NumInstanceSummary[] = numBlocks.map((block) => {
    const numId = readAttr(block, "w:numId") ?? "";
    const abstractNumIdRef =
      /\<w:abstractNumId[^>]*w:val="([^"]+)"/.exec(block)?.[1] ?? "";
    return { numId, abstractNumId: abstractNumIdRef };
  });

  // ── 计算含标题层级的 numId 集合 ────────────────────────────
  const headingAbstractIds = new Set(
    abstractNums.filter((a) => a.hasHeadingLevels).map((a) => a.abstractNumId)
  );

  const headingLinkedNumIds = numInstances
    .filter((n) => headingAbstractIds.has(n.abstractNumId))
    .map((n) => n.numId);

  return { abstractNums, numInstances, headingLinkedNumIds };
}
