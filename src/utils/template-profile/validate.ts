import { getBuiltinFormatSpecById, getDefaultFormatSpec } from "@/utils/template-spec/builtin-specs";

export function validateTemplateProfile(
  profile: TemplateProfile,
  formatSpecId?: string
): TemplateValidationResult {
  const formatSpec =
    getBuiltinFormatSpecById(formatSpecId || profile.formatSpecId) ||
    getDefaultFormatSpec();
  const issues: TemplateValidationIssue[] = [];

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
    } else if (matchedSection.confidence < 0.75) {
      issues.push({
        level: "warning",
        code: "LOW_CONFIDENCE_SECTION",
        message: `${sectionRule.label} 已识别，但置信度较低，建议导出前确认。`,
        field: sectionRule.key,
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
    }
  }

  const headingRoleCount = profile.styleRoles.filter((item) =>
    item.role.startsWith("heading-")
  ).length;

  if (headingRoleCount === 0) {
    issues.push({
      level: "warning",
      code: "MISSING_HEADING_ROLE",
      message: "尚未识别到正文标题层级样式，后续导出可能无法稳定映射目录与章节。",
      field: "styleRoles",
    });
  }

  if (profile.confirmationItems.some((item) => !item.resolved)) {
    issues.push({
      level: "info",
      code: "PENDING_CONFIRMATION_ITEMS",
      message: "模板存在待确认项，建议在保存到模板库前完成关键确认。",
      field: "confirmationItems",
    });
  }

  return {
    canExport: !issues.some((item) => item.level === "error"),
    issues,
  };
}
