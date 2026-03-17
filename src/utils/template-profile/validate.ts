import {
  getBuiltinFormatSpecById,
  getDefaultFormatSpec,
} from "@/utils/template-spec/builtin-specs";
import {
  templateValidationDetailSchema,
  templateValidationPreviewSchema,
} from "./schema";

function getOptionalSpecValue<K extends keyof FormatSpec>(
  spec: FormatSpec,
  key: K
): FormatSpec[K] | undefined {
  return spec[key];
}

function calculateSectionCoverage(
  sections: TemplateSectionProfile[],
  formatSpec: FormatSpec
) {
  const required = formatSpec.sectionRules.filter((item) => item.required);
  const detected = required.filter((rule) =>
    sections.some((section) => section.key === rule.key && section.detected)
  );

  return {
    detected: detected.length,
    required: required.length,
    ratio:
      required.length > 0
        ? Math.round((detected.length / required.length) * 100)
        : 100,
  };
}

function calculateHeadingCoverage(styleRoles: TemplateStyleRole[]) {
  const level1 = styleRoles.some((item) => item.role === "heading-1");
  const level2 = styleRoles.some((item) => item.role === "heading-2");
  const level3 = styleRoles.some((item) => item.role === "heading-3");

  return {
    level1,
    level2,
    level3,
    coverage: [level1, level2, level3].filter(Boolean).length,
  };
}

function calculateFieldCoverage(fieldAnchors: TemplateFieldAnchor[]) {
  const required: Array<TemplateFieldAnchor["key"]> = [
    "title",
    "college",
    "major",
    "studentName",
    "studentId",
    "advisor",
  ];

  const captured = fieldAnchors.filter((item) => required.includes(item.key));
  const missing = required.filter(
    (key) => !fieldAnchors.some((item) => item.key === key)
  );

  return {
    captured: captured.length,
    total: required.length,
    ratio:
      required.length > 0
        ? Math.round((captured.length / required.length) * 100)
        : 100,
    missing,
  };
}

function buildFallbackDiagnostics(profile: TemplateProfile): TemplateProfileDiagnostics {
  const headingLevelCoverage = {
    level1: profile.styleRoles.some((item) => item.role === "heading-1"),
    level2: profile.styleRoles.some((item) => item.role === "heading-2"),
    level3: profile.styleRoles.some((item) => item.role === "heading-3"),
  };

  return {
    hasHeader: Boolean(profile.pageRule.headerTextLeft || profile.pageRule.headerTextRight),
    hasFooter: Boolean(profile.pageRule.footerText),
    hasPageNumberField: Boolean(profile.pageRule.pageNumberPosition),
    completenessMetrics: {
      hasMultipleSections:
        profile.sections.filter((item) => item.detected).length >= 3,
      hasCover: profile.sections.some(
        (item) => item.key === "cover" && item.detected
      ),
      hasAbstract: profile.sections.some(
        (item) =>
          (item.key === "abstract-zh" || item.key === "abstract-en") &&
          item.detected
      ),
      hasBody: profile.sections.some(
        (item) => item.key === "body" && item.detected
      ),
      hasReferences: profile.sections.some(
        (item) => item.key === "references" && item.detected
      ),
      headingLevelCoverage,
    },
  };
}

function mergeDiagnostics(
  profile: TemplateProfile,
  diagnostics?: TemplateProfileDiagnostics
) {
  const fallback = buildFallbackDiagnostics(profile);

  return {
    ...fallback,
    ...diagnostics,
    completenessMetrics: {
      ...fallback.completenessMetrics,
      ...diagnostics?.completenessMetrics,
      headingLevelCoverage: {
        ...fallback.completenessMetrics?.headingLevelCoverage,
        ...diagnostics?.completenessMetrics?.headingLevelCoverage,
      },
    },
  } satisfies TemplateProfileDiagnostics;
}

function pushSpecSuggestion(
  suggestions: TemplateValidationSuggestion[],
  target: string,
  message: string
) {
  const exists = suggestions.some(
    (item) => item.target === target && item.message === message
  );
  if (!exists) {
    suggestions.push({ target, message });
  }
}

export function validateTemplateProfile(
  profile: TemplateProfile,
  formatSpecId?: string,
  diagnostics?: TemplateProfileDiagnostics
): TemplateValidationResult {
  const formatSpec =
    getBuiltinFormatSpecById(formatSpecId || profile.formatSpecId) ||
    getDefaultFormatSpec();
  const mergedDiagnostics = mergeDiagnostics(profile, diagnostics);
  const issues: TemplateValidationIssue[] = [];
  const differences: TemplateValidationDifference[] = [];
  const suggestions: TemplateValidationSuggestion[] = [];

  const sectionCoverage = calculateSectionCoverage(profile.sections, formatSpec);
  const fieldCoverage = calculateFieldCoverage(profile.fieldAnchors);
  const headingCoverage = calculateHeadingCoverage(profile.styleRoles);
  const requiredFields: Array<TemplateFieldAnchor["key"]> = [
    "title",
    "college",
    "major",
    "studentName",
    "studentId",
    "advisor",
  ];

  if (sectionCoverage.ratio < 100) {
    const missingSections = formatSpec.sectionRules
      .filter(
        (rule) =>
          rule.required &&
          !profile.sections.some(
            (section) => section.key === rule.key && section.detected
          )
      )
      .map((rule) => rule.label);

    differences.push({
      key: "section:coverage",
      expected: `检测全部必需章节（${sectionCoverage.required} 个）`,
      actual: `当前识别 ${sectionCoverage.detected}/${sectionCoverage.required}`,
      message: `模板仍缺少必需章节：${missingSections.join("、") || "未识别"}`,
    });
  } else {
    pushSpecSuggestion(
      suggestions,
      "章节完整性",
      "所有必需章节均已识别，模板结构完整度较好。"
    );
  }

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
      pushSpecSuggestion(
        suggestions,
        sectionRule.label,
        "优先上传包含该部分的完整样稿，或在模板修正中手动确认章节起点。"
      );
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

    if (matchedSection.confidence < 0.6) {
      pushSpecSuggestion(
        suggestions,
        sectionRule.label,
        `${sectionRule.label} 识别偏弱，建议在模板编辑里补充起始锚点文本。`
      );
    }
  }

  if (fieldCoverage.ratio < 100) {
    differences.push({
      key: "field:coverage",
      expected: `检测全部封面字段（${fieldCoverage.total} 个）`,
      actual: `当前识别 ${fieldCoverage.captured}/${fieldCoverage.total}`,
      message: `封面字段仍缺少：${fieldCoverage.missing.join("、")}`,
    });
  }

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

  if (headingCoverage.coverage === 0) {
    issues.push({
      level: "warning",
      code: "MISSING_HEADING_ROLE",
      message:
        "尚未识别到正文标题层级样式，后续导出可能无法稳定映射目录与章节。",
      field: "styleRoles",
    });
    differences.push({
      key: "style:heading-coverage",
      expected: "至少检测到一个标题层级样式",
      actual: "未识别到任何标题样式",
      message: "无法识别 Heading 1/2/3 样式，目录与章节映射会偏弱。",
    });
    pushSpecSuggestion(
      suggestions,
      "标题层级样式",
      "建议使用带 Heading 样式定义的 DOCX 样稿，以提高目录与章节映射稳定性。"
    );
  } else if (headingCoverage.coverage === 1) {
    issues.push({
      level: "info",
      code: "LIMITED_HEADING_LEVELS",
      message: "仅识别到一个标题层级，目录层次可能不够完整。",
      field: "styleRoles",
    });
    pushSpecSuggestion(
      suggestions,
      "标题层级完整性",
      "建议至少补齐 Heading 1/2/3 三个层级中的主要样式。"
    );
  } else {
    pushSpecSuggestion(
      suggestions,
      "标题层级样式",
      `已识别 ${headingCoverage.coverage} 个标题层级样式，目录映射基础较好。`
    );
  }

  if (!mergedDiagnostics.hasHeader && !mergedDiagnostics.hasFooter) {
    issues.push({
      level: "info",
      code: "NO_HEADER_FOOTER",
      message: "模板未检测到页眉或页脚配置。",
      field: "pageRule",
    });
    pushSpecSuggestion(
      suggestions,
      "页眉页脚配置",
      "建议在页眉或页脚中保留学校名、章节名或页码等稳定元素。"
    );
  }

  if (!mergedDiagnostics.hasPageNumberField) {
    issues.push({
      level: "warning",
      code: "NO_PAGE_NUMBER",
      message: "模板未检测到页码域配置。",
      field: "pageRule",
    });
    differences.push({
      key: "page:numbering",
      expected: "检测到页码域",
      actual: "未识别页码域",
      message: "页码是论文导出的关键元素，建议在页眉或页脚中加入 PAGE 域。",
    });
  }

  if (
    formatSpec.pageNumberPosition &&
    profile.pageRule.pageNumberPosition &&
    formatSpec.pageNumberPosition !== profile.pageRule.pageNumberPosition
  ) {
    differences.push({
      key: "page:number-position",
      expected: `页码位于${formatSpec.pageNumberPosition}`,
      actual: `当前识别为${profile.pageRule.pageNumberPosition}`,
      message: "模板页码位置与规范不一致，导出前建议确认分页规则。",
    });
  }

  const tocRequirePageNumbers = getOptionalSpecValue(
    formatSpec,
    "tocRequirePageNumbers"
  );
  if (tocRequirePageNumbers && !mergedDiagnostics.hasPageNumberField) {
    pushSpecSuggestion(
      suggestions,
      "目录页码",
      "当前规范要求目录页码可追踪，但模板尚未识别出页码域，建议优先修正。"
    );
  }

  const requireContinuousPageNumbers = getOptionalSpecValue(
    formatSpec,
    "requireContinuousPageNumbers"
  );
  if (requireContinuousPageNumbers && profile.pageRule.pageNumberStart && profile.pageRule.pageNumberStart > 1) {
    differences.push({
      key: "page:number-continuity",
      expected: "页码连续编排",
      actual: `当前起始页码为 ${profile.pageRule.pageNumberStart}`,
      message: "规范偏向页码连续，当前模板可能存在重新起编。",
    });
  }

  const allowFrontMatterPageNumberReset = getOptionalSpecValue(
    formatSpec,
    "allowFrontMatterPageNumberReset"
  );
  if (
    allowFrontMatterPageNumberReset === false &&
    profile.pageRule.pageNumberFormat === "roman"
  ) {
    differences.push({
      key: "page:front-matter-format",
      expected: "前置部分沿用正文页码体系",
      actual: "识别到罗马数字页码",
      message: "当前规范不鼓励前置部分单独重置页码格式。",
    });
  }

  const bodyMinLength = getOptionalSpecValue(formatSpec, "bodyMinLength");
  if (
    profile.documentKind === "sample-paper" &&
    bodyMinLength &&
    mergedDiagnostics.textLength
  ) {
    if (mergedDiagnostics.textLength < bodyMinLength) {
      differences.push({
        key: "body:length",
        expected: `正文字数不少于 ${bodyMinLength}`,
        actual: `当前样稿文本约 ${mergedDiagnostics.textLength}`,
        message: "样稿文本量低于规范下限，可能不是完整论文样稿。",
      });
    }
  } else if (bodyMinLength) {
    pushSpecSuggestion(
      suggestions,
      "正文字数",
      `当前规范建议正文字数不少于 ${bodyMinLength}，上传完整样稿时可进一步核验。`
    );
  }

  const titleMaxLength = getOptionalSpecValue(formatSpec, "titleMaxLength");
  const titleMinLength = getOptionalSpecValue(formatSpec, "titleMinLength");
  if (titleMaxLength || titleMinLength) {
    pushSpecSuggestion(
      suggestions,
      "题目长度",
      `规范建议题目长度${
        titleMinLength ? `不少于 ${titleMinLength}` : ""
      }${titleMinLength && titleMaxLength ? "，" : ""}${
        titleMaxLength ? `不超过 ${titleMaxLength}` : ""
      }，当前模板更多依赖导出时的实际题目内容再做最终校验。`
    );
  }

  const referenceMinCount = getOptionalSpecValue(formatSpec, "referenceMinCount");
  const foreignReferenceMinCount = getOptionalSpecValue(
    formatSpec,
    "foreignReferenceMinCount"
  );
  if (referenceMinCount || foreignReferenceMinCount) {
    pushSpecSuggestion(
      suggestions,
      "参考文献要求",
      `当前规范要求参考文献不少于 ${referenceMinCount || 0} 条${
        foreignReferenceMinCount
          ? `，其中外文文献不少于 ${foreignReferenceMinCount} 条`
          : ""
      }。`
    );
  }

  const keywordSeparator = getOptionalSpecValue(formatSpec, "keywordSeparator");
  const keywordSeparatorRequired = getOptionalSpecValue(
    formatSpec,
    "keywordSeparatorRequired"
  );
  if (keywordSeparator && keywordSeparatorRequired) {
    pushSpecSuggestion(
      suggestions,
      "关键词分隔符",
      `规范建议关键词使用“${keywordSeparator}”分隔，导出时会优先按该格式排版。`
    );
  }

  const referenceStyle = getOptionalSpecValue(formatSpec, "referenceStyle");
  const requireCitationStyleConsistency = getOptionalSpecValue(
    formatSpec,
    "requireCitationStyleConsistency"
  );
  if (referenceStyle) {
    pushSpecSuggestion(
      suggestions,
      "引用风格",
      `当前规范偏好 ${referenceStyle}${
        requireCitationStyleConsistency ? "，并要求全文引用风格保持一致" : ""
      }。`
    );
  }

  const bodyChapterRules = getOptionalSpecValue(formatSpec, "bodyChapterRules");
  if (bodyChapterRules && bodyChapterRules.length > 0) {
    pushSpecSuggestion(
      suggestions,
      "正文章节颗粒度",
      `当前规范对正文重点章节有 ${bodyChapterRules.length} 条细化要求，建议结合真实样稿继续沉淀章节画像。`
    );
  }

  const unresolvedItems = profile.confirmationItems.filter((item) => !item.resolved);
  if (unresolvedItems.length > 0) {
    issues.push({
      level: "info",
      code: "PENDING_CONFIRMATION_ITEMS",
      message: `模板存在 ${unresolvedItems.length} 条待确认项，建议在保存到模板库前完成关键确认。`,
      field: "confirmationItems",
    });
    pushSpecSuggestion(
      suggestions,
      "低置信度确认",
      `当前仍有 ${unresolvedItems.length} 条待确认项，正式导出前建议先完成确认。`
    );
  }

  const detectedSections = profile.sections.filter((item) => item.detected);
  const qualityScore = {
    sectionCoverage: sectionCoverage.ratio,
    fieldCoverage: fieldCoverage.ratio,
    headingCoverage: Math.round((headingCoverage.coverage / 3) * 100),
    headerFooter: mergedDiagnostics.hasHeader || mergedDiagnostics.hasFooter ? 100 : 0,
    pageNumber: mergedDiagnostics.hasPageNumberField ? 100 : 0,
    confidence: Math.round(profile.confidenceScore * 100),
  };
  const overallQuality = Math.round(
    qualityScore.sectionCoverage * 0.3 +
      qualityScore.fieldCoverage * 0.25 +
      qualityScore.headingCoverage * 0.15 +
      qualityScore.headerFooter * 0.1 +
      qualityScore.pageNumber * 0.1 +
      qualityScore.confidence * 0.1
  );

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
    suggestions: [
      {
        target: "综合质量评分",
        message: `整体质量评分 ${overallQuality}/100，章节覆盖 ${sectionCoverage.ratio}% 、封面字段覆盖 ${fieldCoverage.ratio}% 、标题层级 ${headingCoverage.coverage}/3、模板置信度 ${qualityScore.confidence}%。`,
      },
      ...suggestions,
    ],
  });

  return {
    canExport: !issues.some((item) => item.level === "error"),
    issues,
    preview,
    detail,
  };
}
