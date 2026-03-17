import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDefaultFormatSpec } from "@/utils/template-spec/builtin-specs";

interface TemplateStore {
  formatSpecs: FormatSpec[];
  library: TemplateLibraryItem[];
  profiles: Record<string, TemplateProfile>;
  selectedTemplateId: string;
  selectedFormatSpecId: string;
  latestValidation: TemplateValidationResult | null;
}

interface TemplateActions {
  hydrateBuiltinSpecs: (specs?: FormatSpec[]) => void;
  saveProfile: (profile: TemplateProfile) => void;
  selectTemplate: (templateId: string) => void;
  selectFormatSpec: (formatSpecId: string) => void;
  setValidation: (result: TemplateValidationResult | null) => void;
  resolveConfirmationItem: (
    templateId: string,
    itemId: string,
    resolution: "confirmed" | "ignored"
  ) => void;
  removeTemplate: (templateId: string) => void;
  reset: () => void;
}

const defaultSpec = getDefaultFormatSpec();

const defaultValues: TemplateStore = {
  formatSpecs: [defaultSpec],
  library: [],
  profiles: {},
  selectedTemplateId: "",
  selectedFormatSpecId: defaultSpec.id,
  latestValidation: null,
};

export const useTemplateStore = create(
  persist<TemplateStore & TemplateActions>(
    (set) => ({
      ...defaultValues,
      hydrateBuiltinSpecs: (specs) =>
        set((state) => ({
          formatSpecs: specs && specs.length > 0 ? specs : state.formatSpecs,
          selectedFormatSpecId:
            state.selectedFormatSpecId ||
            specs?.[0]?.id ||
            defaultValues.selectedFormatSpecId,
        })),
      saveProfile: (profile) =>
        set((state) => {
          const nextLibrary = state.library.filter((item) => item.id !== profile.id);
          nextLibrary.unshift({
            id: profile.id,
            name: profile.name,
            source: profile.source,
            formatSpecId: profile.formatSpecId,
            thesisType: profile.thesisType,
            educationLevel: profile.educationLevel,
            confidenceScore: profile.confidenceScore,
            updatedAt: profile.updatedAt,
          });

          return {
            profiles: {
              ...state.profiles,
              [profile.id]: profile,
            },
            library: nextLibrary,
            selectedTemplateId: profile.id,
            selectedFormatSpecId: profile.formatSpecId,
          };
        }),
      selectTemplate: (templateId) =>
        set((state) => ({
          selectedTemplateId: templateId,
          selectedFormatSpecId:
            state.profiles[templateId]?.formatSpecId || state.selectedFormatSpecId,
        })),
      selectFormatSpec: (formatSpecId) => set(() => ({ selectedFormatSpecId: formatSpecId })),
      setValidation: (result) => set(() => ({ latestValidation: result })),
      resolveConfirmationItem: (templateId, itemId, resolution) =>
        set((state) => {
          const currentProfile = state.profiles[templateId];
          if (!currentProfile) return state;

          const nextConfirmationItems = currentProfile.confirmationItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  resolved: true,
                  resolution,
                }
              : item
          );
          const resolvedItem = nextConfirmationItems.find((item) => item.id === itemId);
          let nextSections = currentProfile.sections;
          let nextFieldAnchors = currentProfile.fieldAnchors;
          let nextStyleRoles = currentProfile.styleRoles;

          if (resolution === "confirmed" && resolvedItem?.targetKey) {
            if (resolvedItem.type === "section") {
              nextSections = currentProfile.sections.map((section) =>
                section.key === resolvedItem.targetKey
                  ? {
                      ...section,
                      detected: true,
                      confidence: Math.max(section.confidence, 0.92),
                    }
                  : section
              );
            }

            if (resolvedItem.type === "field") {
              const hasAnchor = currentProfile.fieldAnchors.some(
                (item) => item.key === resolvedItem.targetKey
              );
              if (!hasAnchor) {
                nextFieldAnchors = [
                  ...currentProfile.fieldAnchors,
                  {
                    key: resolvedItem.targetKey as TemplateFieldAnchor["key"],
                    label: resolvedItem.label.replace("字段确认", ""),
                    anchorText: resolvedItem.suggestedValue || resolvedItem.label,
                    confidence: 0.7,
                  },
                ];
              }
            }

            if (resolvedItem.type === "style") {
              const styleRole = resolvedItem.targetKey as TemplateRole;
              const hasRole = currentProfile.styleRoles.some(
                (item) => item.role === styleRole
              );
              nextStyleRoles = hasRole
                ? currentProfile.styleRoles.map((item) =>
                    item.role === styleRole
                      ? { ...item, confidence: Math.max(item.confidence, 0.85) }
                      : item
                  )
                : [
                    ...currentProfile.styleRoles,
                    {
                      role: styleRole,
                      confidence: 0.75,
                    },
                  ];
            }
          }

          const unresolvedCount = nextConfirmationItems.filter(
            (item) => !item.resolved
          ).length;
          const confidenceBoost = resolution === "confirmed" ? 0.03 : 0.01;
          const nextProfile: TemplateProfile = {
            ...currentProfile,
            sections: nextSections,
            fieldAnchors: nextFieldAnchors,
            styleRoles: nextStyleRoles,
            confirmationItems: nextConfirmationItems,
            confidenceScore: Number(
              Math.min(
                0.99,
                currentProfile.confidenceScore +
                  confidenceBoost -
                  Math.max(unresolvedCount - 1, 0) * 0.005
              ).toFixed(2)
            ),
            updatedAt: Date.now(),
          };

          return {
            profiles: {
              ...state.profiles,
              [templateId]: nextProfile,
            },
            library: state.library.map((item) =>
              item.id === templateId
                ? {
                    ...item,
                    confidenceScore: nextProfile.confidenceScore,
                    updatedAt: nextProfile.updatedAt,
                  }
                : item
            ),
          };
        }),
      removeTemplate: (templateId) =>
        set((state) => {
          const nextProfiles = { ...state.profiles };
          delete nextProfiles[templateId];
          return {
            profiles: nextProfiles,
            library: state.library.filter((item) => item.id !== templateId),
            selectedTemplateId:
              state.selectedTemplateId === templateId ? "" : state.selectedTemplateId,
          };
        }),
      reset: () => set(() => ({ ...defaultValues })),
    }),
    {
      name: "template-library",
      version: 1,
    }
  )
);
