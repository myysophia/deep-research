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
