import {
  getBuiltinFormatSpecById,
  getDefaultFormatSpec,
} from "@/utils/template-spec/builtin-specs";
import {
  templateValidationDetailSchema,
  templateValidationPreviewSchema,
} from "./schema";

export function validateTemplateProfile(
  profile: TemplateProfile,
  formatSpecId?: string
): TemplateValidationResult {
  const formatSpec =
    getBuiltinFormatSpecById(formatSpecId || profile.formatSpecId) ||
    getDefaultFormatSpec();
  const issues: TemplateValidationIssue[] = [];
  const differences: TemplateValidationDifference[] = [];
  const suggestions: TemplateValidationSuggestion[] = [];

  for (const sectionRule of formatSpec.sectionRules) {
    if (!sectionRule.required) continue;

    const matchedSection = profile.sections.find(
      (item) => item.key === sectionRule.key
    );

    if (!matchedSection?.detected) {
      issues.push({
        level: "error",
        code: "MISSING_REQUIRED_SECTION",
        message: `模板缺少必需部分：${sectionRule.label}`,
        field: sectionRule.key,
      });
      differences.push({
        key: `section:${sectionRule.key}`,
        expected: "必须识别",
        actual: "未识别",
        message: `${sectionRule.label} 未从模板中稳定识别。`,
      });
      suggestions.push({
        target: sectionRule.label,
        message:
          "优先上传包含该部分的完整样稿，或在低置信度确认中手动确认该部分。",
      });
      continue;
    }

    if (matchedSection.confidence < 0.75) {
      issues.push({
        level: "warning",
        code: "LOW_CONFIDENCE_SECTION",
        message: `${sectionRule.label} 已识别，但置信度较低，建议导出前确认。`,
        field: sectionRule.key,
      });
      differences.push({
        key: `section:${sectionRule.key}`,
        expected: "高置信度识别",
        actual: `置信度 ${Math.round(matchedSection.confidence * 100)}%`,
        message: `${sectionRule.label} 已识别，但识别稳定性不足。`,
      });
    }
  }

  const requiredFields: Array<TemplateFieldAnchor["key"]> = [
    "title",
    "college",
    "major",
    "studentName",
    "studentId",
    "advisor",
  ];

  for (const field of requiredFields) {
    if (!profile.fieldAnchors.some((item) => item.key === field)) {
      issues.push({
        level: "warning",
        code: "MISSING_FIELD_ANCHOR",
        message: `未稳定识别封面字段：${field}`,
        field,
      });
      differences.push({
        key: `field:${field}`,
        expected: "封面字段锚点可识别",
        actual: "未识别",
        message: `封面字段 ${field} 缺少稳定锚点。`,
      });
    }
  }

  const headingRoleCount = profile.styleRoles.filter((item) =>
    item.role.startsWith("heading-")
  ).length;

  if (headingRoleCount === 0) {
    issues.push({
      level: "warning",
      code: "MISSING_HEADING_ROLE",
      message:
        "尚未识别到正文标题层级样式，后续导出可能无法稳定映射目录与章节。",
      field: "styleRoles",
    });
    suggestions.push({
      target: "标题层级样式",
      message:
        "建议使用带样式定义的 DOCX 样稿，而不是纯文本模板，以便识别 Heading 1/2/3。",
    });
  }

  const unresolvedItems = profile.confirmationItems.filter((item) => !item.resolved);
  if (unresolvedItems.length > 0) {
    issues.push({
      level: "info",
      code: "PENDING_CONFIRMATION_ITEMS",
      message: "模板存在待确认项，建议在保存到模板库前完成关键确认。",
      field: "confirmationItems",
    });
    suggestions.push({
      target: "低置信度确认",
      message: `当前还有 ${unresolvedItems.length} 条待确认项，建议先完成确认再用于正式导出。`,
    });
  }

  const detectedSections = profile.sections.filter((item) => item.detected);
  const preview = templateValidationPreviewSchema.parse({
    layout: {
      paperSize: profile.pageRule.paperSize,
      marginsCm: profile.pageRule.marginsCm,
    },
    highlights: detectedSections.slice(0, 3).map((item) => ({
      heading: item.label,
      snippet: item.startAnchorText || `该模板识别出“${item.label}”。`,
    })),
    sectionCount: detectedSections.length,
    artifactCount: 0,
    keyPages: detectedSections.slice(0, 3).map((item, index) => ({
      pageNumber: index + 1,
      sectionKey: item.key,
      label: item.label,
      summary: item.startAnchorText || `识别到 ${item.label} 相关结构`,
      coverage: item.confidence,
      layout: {
        paperSize: profile.pageRule.paperSize,
        marginsCm: profile.pageRule.marginsCm,
      },
      anchorHighlights: profile.fieldAnchors.slice(0, 3).map((anchor) => ({
        key: anchor.key,
        label: anchor.label,
        confidence: anchor.confidence,
      })),
    })),
    anchorCoverage: {
      total: requiredFields.length,
      captured: profile.fieldAnchors.filter((item) =>
        requiredFields.includes(item.key)
      ).length,
    },
  });

  const detail = templateValidationDetailSchema.parse({
    formatSpecId: formatSpec.id,
    formatSpecName: formatSpec.name,
    differences,
    suggestions,
  });

  return {
    canExport: !issues.some((item) => item.level === "error"),
    issues,
    preview,
    detail,
  };
}
