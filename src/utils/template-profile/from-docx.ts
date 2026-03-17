import { extractDocumentParagraphTexts, hasTableOfContentsField } from "@/utils/docx-ooxml/document";
import { extractHeaderFooterSummary } from "@/utils/docx-ooxml/header-footer";
import { extractNumberingSummary } from "@/utils/docx-ooxml/numbering";
import { extractSectionRules } from "@/utils/docx-ooxml/sections";
import { extractStyleSummaries } from "@/utils/docx-ooxml/styles";
import { readDocxXmlEntries } from "@/utils/docx-ooxml/unzip";
import { extractTemplateProfileFromText } from "@/utils/template-profile/extractor";

/**
 * 根据 styles.xml 解析结果推断各段落样式的语义角色。
 * 若 numbering.xml 显示文档包含与标题绑定的多级编号，则提升对应 heading 置信度。
 */
function inferStyleRolesFromSummaries(
  profile: TemplateProfile,
  styleSummaries: Array<{
    styleId?: string;
    name?: string;
    fontFamily?: string;
    fontSizePt?: number;
    bold?: boolean;
    alignment?: string;
  }>,
  /** 含标题层级的多级编号 numId 集合（来自 numbering.xml） */
  hasHeadingNumbering: boolean
) {
  const roles = [...profile.styleRoles];

  for (const summary of styleSummaries) {
    const name = (summary.name || "").toLowerCase();

    // 标题 1～3：若文档同时存在标题绑定的多级编号，则置信度提升 +0.05
    const numberingBonus = hasHeadingNumbering ? 0.05 : 0;

    if (name.includes("heading 1") || name.includes("标题 1")) {
      roles.push({
        role: "heading-1",
        styleId: summary.styleId,
        styleName: summary.name,
        fontFamily: summary.fontFamily,
        fontSizePt: summary.fontSizePt,
        bold: summary.bold,
        alignment: summary.alignment,
        confidence: Math.min(0.99, 0.92 + numberingBonus),
      });
    } else if (name.includes("heading 2") || name.includes("标题 2")) {
      roles.push({
        role: "heading-2",
        styleId: summary.styleId,
        styleName: summary.name,
        fontFamily: summary.fontFamily,
        fontSizePt: summary.fontSizePt,
        bold: summary.bold,
        alignment: summary.alignment,
        confidence: Math.min(0.99, 0.9 + numberingBonus),
      });
    } else if (name.includes("heading 3") || name.includes("标题 3")) {
      roles.push({
        role: "heading-3",
        styleId: summary.styleId,
        styleName: summary.name,
        fontFamily: summary.fontFamily,
        fontSizePt: summary.fontSizePt,
        bold: summary.bold,
        alignment: summary.alignment,
        confidence: Math.min(0.99, 0.88 + numberingBonus),
      });
    } else if (name.includes("toc")) {
      roles.push({
        role: "toc-title",
        styleId: summary.styleId,
        styleName: summary.name,
        fontFamily: summary.fontFamily,
        fontSizePt: summary.fontSizePt,
        bold: summary.bold,
        alignment: summary.alignment,
        confidence: 0.78,
      });
    } else if (name.includes("header")) {
      // styles.xml 中名为 "header" 的段落样式 → 暂归 cover-title（低置信度）
      roles.push({
        role: "cover-title",
        styleId: summary.styleId,
        styleName: summary.name,
        fontFamily: summary.fontFamily,
        fontSizePt: summary.fontSizePt,
        bold: summary.bold,
        alignment: summary.alignment,
        confidence: 0.35,
      });
    }
  }

  // 去重：同 role+styleId 保留置信度最高的条目
  const uniqueMap = new Map<string, TemplateStyleRole>();
  for (const item of roles) {
    const key = `${item.role}-${item.styleId || item.styleName || item.fontFamily || "default"}`;
    const existing = uniqueMap.get(key);
    if (!existing || existing.confidence < item.confidence) {
      uniqueMap.set(key, item);
    }
  }

  return Array.from(uniqueMap.values());
}

export async function extractTemplateProfileFromDocx(params: {
  fileName: string;
  arrayBuffer: ArrayBuffer;
  documentKind?: TemplateDocumentKind;
}) {
  const xmlEntries = await readDocxXmlEntries(params.arrayBuffer);
  const documentXml = xmlEntries["word/document.xml"];

  if (!documentXml) {
    throw new Error("DOCX 缺少 word/document.xml，无法识别模板结构。");
  }

  const stylesXml = xmlEntries["word/styles.xml"] || "";
  const numberingXml = xmlEntries["word/numbering.xml"] || "";

  // ── 基础文本提取 ──────────────────────────────────────────
  const paragraphs = extractDocumentParagraphTexts(documentXml);
  const textContent = paragraphs.join("\n");
  const base = extractTemplateProfileFromText({
    fileName: params.fileName,
    textContent,
    documentKind: params.documentKind,
  });

  // ── OOXML 专项解析 ────────────────────────────────────────
  const styleSummaries = extractStyleSummaries(stylesXml);
  const sectionRules = extractSectionRules(documentXml);
  const numberingSummary = extractNumberingSummary(numberingXml);
  const headerFooter = extractHeaderFooterSummary(xmlEntries);

  // ── 样式角色推断（含 numbering 置信度加成） ────────────────
  const hasHeadingNumbering = numberingSummary.headingLinkedNumIds.length > 0;
  const styleRoles = inferStyleRolesFromSummaries(
    base.profile,
    styleSummaries,
    hasHeadingNumbering
  );

  // ── 页面规则（取第一个 section 的边距信息） ───────────────
  const pageRule: TemplatePageRule = sectionRules[0]
    ? {
        paperSize: "A4" as const,
        marginsCm: sectionRules[0].marginsCm,
        hasDifferentFirstPage: sectionRules[0].hasDifferentFirstPage,
        pageNumberStart: sectionRules[0].pageNumberStart,
        pageNumberFormat:
          (sectionRules[0].pageNumberFormat === "roman"
            ? "roman"
            : "decimal") as TemplatePageRule["pageNumberFormat"],
        headerTextLeft: headerFooter.items.find(
          (item) => item.kind === "header" && !item.isEmpty
        )?.textContent,
        footerText: headerFooter.items.find(
          (item) => item.kind === "footer" && !item.isEmpty
        )?.textContent,
        pageNumberPosition: headerFooter.items.some((item) => item.hasPageNumber)
          ? ("right" as const)
          : ("center" as const),
      }
    : base.profile.pageRule;

  // ── Section 增强：目录 + 页眉页脚辅助识别 ─────────────────
  const sections = base.profile.sections.map((item) => {
    if (item.key === "toc") {
      // 目录：OOXML field 检测 OR 页眉页脚文本含"目录"字样
      const tocInHeaderFooter = /目\s*录/u.test(headerFooter.combinedText);
      if (hasTableOfContentsField(documentXml) || tocInHeaderFooter) {
        return {
          ...item,
          detected: true,
          confidence: Math.max(item.confidence, 0.95),
          startAnchorText: item.startAnchorText || "TOC",
        };
      }
    }
    return item;
  });

  // ── 学校名称检测增强（基于文档内容和页眉页脚）───────────────
  const baseDiagnostics = (base.diagnostics || {}) as TemplateProfileDiagnostics;
  const schoolNameCandidates = [...(baseDiagnostics.schoolNameCandidates || [])];
  // 从页眉页脚中提取可能的学校名称
  const headerFooterSchoolMatch = headerFooter.combinedText.match(/([^\s]{2,10})(大学|学院)/gu);
  if (headerFooterSchoolMatch) {
    headerFooterSchoolMatch.forEach((match) => {
      const candidate = match.trim();
      if (candidate.length >= 3 && !schoolNameCandidates.includes(candidate)) {
        schoolNameCandidates.push(candidate);
      }
    });
  }
  const enhancedSchoolName = schoolNameCandidates[0] || base.profile.schoolName;

  // ── 综合置信分计算 ────────────────────────────────────────
  // styleRoles 最多贡献 +0.18；section 数量 +0.05；numbering +0.03；header/footer 各 +0.02
  const confidenceScore = Math.min(
    0.99,
    Number(
      (
        base.profile.confidenceScore +
        Math.min(styleRoles.length, 6) * 0.03 +
        (sectionRules.length > 0 ? 0.05 : 0) +
        (hasHeadingNumbering ? 0.03 : 0) +
        (headerFooter.hasHeader ? 0.02 : 0) +
        (headerFooter.hasFooter ? 0.02 : 0) +
        (headerFooter.hasPageNumberField ? 0.02 : 0) +
        (enhancedSchoolName ? 0.01 : 0)
      ).toFixed(2)
    )
  );

  const profile: TemplateProfile = {
    ...base.profile,
    schoolName: enhancedSchoolName,
    styleRoles,
    pageRule,
    sections,
    confidenceScore,
    updatedAt: Date.now(),
  };

  return {
    ...base,
    profile,
    diagnostics: {
      paragraphCount: paragraphs.length,
      styleCount: styleSummaries.length,
      sectionCount: sectionRules.length,
      // numbering 诊断
      abstractNumCount: numberingSummary.abstractNums.length,
      headingLinkedNumIds: numberingSummary.headingLinkedNumIds,
      // 页眉/页脚诊断
      hasHeader: headerFooter.hasHeader,
      hasFooter: headerFooter.hasFooter,
      hasPageNumberField: headerFooter.hasPageNumberField,
      headerFooterItems: headerFooter.items.map((i) => ({
        fileName: i.fileName,
        kind: i.kind,
        isEmpty: i.isEmpty,
        hasPageNumber: i.hasPageNumber,
        textContent: i.textContent,
      })),
      textLength: baseDiagnostics.textLength,
      paragraphEstimate: baseDiagnostics.paragraphEstimate,
      schoolNameCandidates,
      completenessMetrics: {
        hasMultipleSections: sections.filter((s) => s.detected).length >= 3,
        hasCover: sections.find((s) => s.key === "cover")?.detected || false,
        hasAbstract:
          sections.some(
            (s) =>
              (s.key === "abstract-zh" || s.key === "abstract-en") && s.detected
          ) || false,
        hasBody: sections.find((s) => s.key === "body")?.detected || false,
        hasReferences: sections.find((s) => s.key === "references")?.detected || false,
        headingLevelCoverage: {
          level1: styleRoles.some((r) => r.role === "heading-1"),
          level2: styleRoles.some((r) => r.role === "heading-2"),
          level3: styleRoles.some((r) => r.role === "heading-3"),
        },
      },
    },
  };
}
