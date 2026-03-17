import { extractDocumentParagraphTexts, hasTableOfContentsField } from "@/utils/docx-ooxml/document";
import { extractSectionRules } from "@/utils/docx-ooxml/sections";
import { extractStyleSummaries } from "@/utils/docx-ooxml/styles";
import { readDocxXmlEntries } from "@/utils/docx-ooxml/unzip";
import { extractTemplateProfileFromText } from "@/utils/template-profile/extractor";

function inferStyleRolesFromSummaries(
  profile: TemplateProfile,
  styleSummaries: Array<{
    styleId?: string;
    name?: string;
    fontFamily?: string;
    fontSizePt?: number;
    bold?: boolean;
    alignment?: string;
  }>
) {
  const roles = [...profile.styleRoles];

  for (const summary of styleSummaries) {
    const name = (summary.name || "").toLowerCase();

    if (name.includes("heading 1") || name.includes("标题 1")) {
      roles.push({
        role: "heading-1",
        styleId: summary.styleId,
        styleName: summary.name,
        fontFamily: summary.fontFamily,
        fontSizePt: summary.fontSizePt,
        bold: summary.bold,
        alignment: summary.alignment,
        confidence: 0.92,
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
        confidence: 0.9,
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
        confidence: 0.88,
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
  const paragraphs = extractDocumentParagraphTexts(documentXml);
  const textContent = paragraphs.join("\n");
  const base = extractTemplateProfileFromText({
    fileName: params.fileName,
    textContent,
    documentKind: params.documentKind,
  });

  const styleSummaries = extractStyleSummaries(stylesXml);
  const sectionRules = extractSectionRules(documentXml);
  const styleRoles = inferStyleRolesFromSummaries(base.profile, styleSummaries);
  const pageRule = sectionRules[0]
    ? {
        paperSize: "A4" as const,
        marginsCm: sectionRules[0].marginsCm,
        hasDifferentFirstPage: sectionRules[0].hasDifferentFirstPage,
        pageNumberStart: sectionRules[0].pageNumberStart,
        pageNumberFormat: sectionRules[0].pageNumberFormat,
      }
    : base.profile.pageRule;

  const profile: TemplateProfile = {
    ...base.profile,
    styleRoles,
    pageRule,
    sections: base.profile.sections.map((item) => {
      if (item.key === "toc" && hasTableOfContentsField(documentXml)) {
        return {
          ...item,
          detected: true,
          confidence: Math.max(item.confidence, 0.95),
          startAnchorText: item.startAnchorText || "TOC",
        };
      }
      return item;
    }),
    confidenceScore: Math.min(
      0.99,
      Number(
        (
          base.profile.confidenceScore +
          Math.min(styleRoles.length, 6) * 0.03 +
          (sectionRules.length > 0 ? 0.05 : 0)
        ).toFixed(2)
      )
    ),
    updatedAt: Date.now(),
  };

  return {
    ...base,
    profile,
    diagnostics: {
      paragraphCount: paragraphs.length,
      styleCount: styleSummaries.length,
      sectionCount: sectionRules.length,
    },
  };
}
