import { createDefaultPaperLayoutConfig } from "@/utils/paper";

function pickHighestConfidenceRole(
  profile: TemplateProfile,
  role: TemplateRole
) {
  return profile.styleRoles
    .filter((item) => item.role === role)
    .sort((a, b) => b.confidence - a.confidence)[0];
}

export function applyTemplateProfileToPaperDocument(
  paperDocument: PaperDocument,
  templateProfile?: TemplateProfile
) {
  if (!templateProfile) return paperDocument;

  const nextLayout = {
    ...createDefaultPaperLayoutConfig(),
    ...paperDocument.layoutConfig,
    pageMargins: {
      ...paperDocument.layoutConfig.pageMargins,
      ...templateProfile.pageRule.marginsCm,
    },
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
