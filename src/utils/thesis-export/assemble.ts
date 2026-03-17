import { createDefaultPaperLayoutConfig } from "@/utils/paper";

export type TemplateStyleOverride = {
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  alignment?: string;
};

export type TemplateDocumentStyleOverrides = {
  abstractTitleZh?: TemplateStyleOverride;
  abstractTitleEn?: TemplateStyleOverride;
  tocTitle?: TemplateStyleOverride;
  heading1?: TemplateStyleOverride;
  heading2?: TemplateStyleOverride;
  heading3?: TemplateStyleOverride;
  referenceTitle?: TemplateStyleOverride;
  referenceItem?: TemplateStyleOverride;
};

type LayoutWithOverrides = PaperLayoutConfig & {
  styleOverrides?: TemplateDocumentStyleOverrides;
  templatePageRule?: TemplatePageRule;
};

function pickHighestConfidenceRole(
  profile: TemplateProfile,
  role: TemplateRole
) {
  return profile.styleRoles
    .filter((item) => item.role === role)
    .sort((a, b) => b.confidence - a.confidence)[0];
}

function toStyleOverride(role?: TemplateStyleRole): TemplateStyleOverride | undefined {
  if (!role) return undefined;
  const { fontFamily, fontSizePt, bold, alignment } = role;
  if (!fontFamily && !fontSizePt && bold === undefined && !alignment) {
    return undefined;
  }
  return { fontFamily, fontSizePt, bold, alignment };
}

function collectStyleOverrides(profile: TemplateProfile): TemplateDocumentStyleOverrides {
  return {
    abstractTitleZh: toStyleOverride(
      pickHighestConfidenceRole(profile, "abstract-title-zh")
    ),
    abstractTitleEn: toStyleOverride(
      pickHighestConfidenceRole(profile, "abstract-title-en")
    ),
    tocTitle: toStyleOverride(pickHighestConfidenceRole(profile, "toc-title")),
    heading1: toStyleOverride(pickHighestConfidenceRole(profile, "heading-1")),
    heading2: toStyleOverride(pickHighestConfidenceRole(profile, "heading-2")),
    heading3: toStyleOverride(pickHighestConfidenceRole(profile, "heading-3")),
    referenceTitle: toStyleOverride(
      pickHighestConfidenceRole(profile, "reference-title")
    ),
    referenceItem: toStyleOverride(
      pickHighestConfidenceRole(profile, "reference-item")
    ),
  };
}

export function applyTemplateProfileToPaperDocument(
  paperDocument: PaperDocument,
  templateProfile?: TemplateProfile
) {
  if (!templateProfile) return paperDocument;

  const nextLayout: LayoutWithOverrides = {
    ...createDefaultPaperLayoutConfig(),
    ...paperDocument.layoutConfig,
    pageMargins: {
      ...paperDocument.layoutConfig.pageMargins,
      ...templateProfile.pageRule.marginsCm,
    },
    headerTextLeft:
      templateProfile.pageRule.headerTextLeft ||
      paperDocument.layoutConfig.headerTextLeft,
    headerTextRight:
      templateProfile.pageRule.headerTextRight ||
      paperDocument.layoutConfig.headerTextRight,
    footerText:
      templateProfile.pageRule.footerText ||
      paperDocument.layoutConfig.footerText,
    pageNumberPosition:
      templateProfile.pageRule.pageNumberPosition ||
      paperDocument.layoutConfig.pageNumberPosition,
    frontMatterPageNumberStyle:
      templateProfile.pageRule.pageNumberFormat === "roman"
        ? "roman"
        : paperDocument.layoutConfig.frontMatterPageNumberStyle,
    styleOverrides: collectStyleOverrides(templateProfile),
    templatePageRule: templateProfile.pageRule,
  };
  const bodyRole = pickHighestConfidenceRole(templateProfile, "body-text");
  const headingRole = pickHighestConfidenceRole(templateProfile, "heading-1");

  if (bodyRole?.fontFamily) {
    nextLayout.bodyFontFamily = bodyRole.fontFamily;
  }
  if (bodyRole?.fontSizePt) {
    nextLayout.bodyFontSize = bodyRole.fontSizePt;
  }
  if (headingRole?.fontFamily) {
    nextLayout.titleFontFamily = headingRole.fontFamily;
  }
  if (headingRole?.fontSizePt) {
    nextLayout.titleFontSize = headingRole.fontSizePt;
  }

  return {
    ...paperDocument,
    layoutConfig: nextLayout,
  };
}
