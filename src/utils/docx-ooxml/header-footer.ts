/**
 * header-footer.ts
 * 解析 word/header*.xml 与 word/footer*.xml，提取页眉页脚文本与域字段。
 * 用于判断文档是否已配置页眉/页脚，以及其内容类型（页码域、文字等）。
 */

function decodeXml(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(text: string) {
  return decodeXml(text.replace(/<[^>]+>/g, ""));
}

/** 单个页眉或页脚的解析摘要 */
export interface HeaderFooterSummary {
  /** 文件名，如 "word/header1.xml" */
  fileName: string;
  /** 类型：页眉 or 页脚 */
  kind: "header" | "footer";
  /** 提取到的纯文本内容（去除 XML 标签后） */
  textContent: string;
  /** 是否包含页码域（PAGE 字段） */
  hasPageNumber: boolean;
  /** 是否包含文档属性域（DOCPROPERTY / StyleRef 等） */
  hasDocPropertyField: boolean;
  /** 是否为空（无任何可见文本） */
  isEmpty: boolean;
}

/** 所有页眉/页脚的汇总 */
export interface HeaderFooterResult {
  items: HeaderFooterSummary[];
  /** 是否存在任何页眉 */
  hasHeader: boolean;
  /** 是否存在任何页脚 */
  hasFooter: boolean;
  /** 是否存在页码域 */
  hasPageNumberField: boolean;
  /** 所有页眉/页脚合并后的文本片段（用于 section 诊断） */
  combinedText: string;
}

/**
 * 解析单个页眉/页脚 XML 字符串。
 *
 * @param fileName 原始文件名，用于判断 kind 及回传
 * @param xml      对应 XML 文本
 */
function parseOneHeaderFooter(
  fileName: string,
  xml: string
): HeaderFooterSummary {
  const kind: "header" | "footer" = fileName.includes("footer")
    ? "footer"
    : "header";

  // 提取所有 <w:t> 内的文本
  const textRuns = xml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [];
  const textContent = stripTags(textRuns.join("")).trim();

  // 页码域：<w:fldChar> + instrText 包含 PAGE，或 <w:fldSimple w:instr="PAGE">
  const hasPageNumber =
    /\bPAGE\b/i.test(xml) || /<w:fldSimple[^>]*PAGE[^>]*>/i.test(xml);

  // 文档属性域：StyleRef / DOCPROPERTY / TITLE 等常见标题引用
  const hasDocPropertyField =
    /\b(DOCPROPERTY|StyleRef|TITLE)\b/i.test(xml);

  const isEmpty = textContent.length === 0 && !hasPageNumber;

  return { fileName, kind, textContent, hasPageNumber, hasDocPropertyField, isEmpty };
}

/**
 * 从 xmlEntries（整个 DOCX 解压出的 XML 映射）中提取全部页眉/页脚信息。
 *
 * @param xmlEntries readDocxXmlEntries 返回的 Record<filename, xmlText>
 */
export function extractHeaderFooterSummary(
  xmlEntries: Record<string, string>
): HeaderFooterResult {
  const items: HeaderFooterSummary[] = [];

  for (const [fileName, xml] of Object.entries(xmlEntries)) {
    // 只处理 word/header*.xml 与 word/footer*.xml
    if (
      !/^word\/(header|footer)\d*\.xml$/i.test(fileName) ||
      !xml
    ) {
      continue;
    }
    items.push(parseOneHeaderFooter(fileName, xml));
  }

  const hasHeader = items.some((i) => i.kind === "header" && !i.isEmpty);
  const hasFooter = items.some((i) => i.kind === "footer" && !i.isEmpty);
  const hasPageNumberField = items.some((i) => i.hasPageNumber);
  const combinedText = items
    .map((i) => i.textContent)
    .filter(Boolean)
    .join(" | ");

  return { items, hasHeader, hasFooter, hasPageNumberField, combinedText };
}
