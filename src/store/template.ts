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
  hydrateLibrary: (items: TemplateLibraryItem[]) => void;
  saveProfile: (profile: TemplateProfile) => void;
  applyProfileReplacement: (profile: TemplateProfile) => void;
  updateCurrentTemplateEditableFields: (
    fields: Partial<TemplateProfileEditableFields>
  ) => void;
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

function normalizeTemplateProfile(profile: TemplateProfile): TemplateProfile {
  const rawVersion = profile.version ?? 0;
  const normalizedTags =
    profile.tags
      ?.map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20) || undefined;

  return {
    ...profile,
    version: Number.isInteger(rawVersion) && rawVersion > 0 ? rawVersion : 1,
    originTemplateId: profile.originTemplateId || profile.id,
    tags: normalizedTags && normalizedTags.length > 0 ? normalizedTags : undefined,
  };
}

function toTemplateLibraryItem(profile: TemplateProfile): TemplateLibraryItem {
  return {
    id: profile.id,
    name: profile.name,
    source: profile.source,
    formatSpecId: profile.formatSpecId,
    thesisType: profile.thesisType,
    educationLevel: profile.educationLevel,
    confidenceScore: profile.confidenceScore,
    updatedAt: profile.updatedAt,
  };
}

function upsertProfileState(
  state: TemplateStore & TemplateActions,
  profile: TemplateProfile
) {
  const normalizedProfile = normalizeTemplateProfile(profile);
  const nextLibrary = state.library.filter(
    (item) => item.id !== normalizedProfile.id
  );
  nextLibrary.unshift(toTemplateLibraryItem(normalizedProfile));
  nextLibrary.sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    profiles: {
      ...state.profiles,
      [normalizedProfile.id]: normalizedProfile,
    },
    library: nextLibrary,
    selectedTemplateId: normalizedProfile.id,
    selectedFormatSpecId: normalizedProfile.formatSpecId,
  };
}

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
      hydrateLibrary: (items) =>
        set((state) => {
          const merged = new Map<string, TemplateLibraryItem>();
          for (const item of state.library) {
            merged.set(item.id, item);
          }
          for (const item of items) {
            merged.set(item.id, item);
          }
          const nextLibrary = Array.from(merged.values()).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
          const hasSelected = nextLibrary.some(
            (item) => item.id === state.selectedTemplateId
          );

          return {
            library: nextLibrary,
            selectedTemplateId: hasSelected
              ? state.selectedTemplateId
              : nextLibrary[0]?.id || "",
          };
        }),
      saveProfile: (profile) => set((state) => upsertProfileState(state, profile)),
      applyProfileReplacement: (profile) =>
        set((state) => upsertProfileState(state, profile)),
      updateCurrentTemplateEditableFields: (fields) =>
        set((state) => {
          const templateId = state.selectedTemplateId;
          const currentProfile = templateId ? state.profiles[templateId] : undefined;
          if (!currentProfile) return state;

          const sectionPatchMap = new Map(
            (fields.sections || []).map((item) => [item.key, item])
          );
          const nextSections = currentProfile.sections.map((section) => {
            const patch = sectionPatchMap.get(section.key);
            if (!patch) return section;
            return {
              ...section,
              detected: patch.detected,
              confidence: patch.confidence,
              startAnchorText:
                patch.startAnchorText !== undefined
                  ? patch.startAnchorText
                  : section.startAnchorText,
            };
          });

          const nextProfile: TemplateProfile = normalizeTemplateProfile({
            ...currentProfile,
            name: fields.name ?? currentProfile.name,
            schoolName: fields.schoolName ?? currentProfile.schoolName,
            formatSpecId: fields.formatSpecId ?? currentProfile.formatSpecId,
            pageRule: {
              ...currentProfile.pageRule,
              ...(fields.pageRule || {}),
            },
            sections: fields.sections ? nextSections : currentProfile.sections,
            fieldAnchors: fields.fieldAnchors ?? currentProfile.fieldAnchors,
            revisionNote:
              fields.revisionNote !== undefined
                ? fields.revisionNote
                : currentProfile.revisionNote,
            tags: fields.tags ?? currentProfile.tags,
            version: (currentProfile.version ?? 1) + 1,
            lastEditedAt: Date.now(),
            updatedAt: Date.now(),
          });

          return upsertProfileState(state, nextProfile);
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
