import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import { pick } from "radash";
import {
  createEmptyPaperDocument,
  createDefaultPaperLayoutConfig,
  createDefaultThesisTemplateMeta,
  syncPaperDocument,
  normalizePaperArtifacts,
} from "@/utils/paper";

export interface TaskStore {
  id: string;
  question: string;
  resources: Resource[];
  query: string;
  questions: string;
  feedback: string;
  reportPlan: string;
  suggestion: string;
  tasks: SearchTask[];
  requirement: string;
  title: string;
  finalReport: string;
  sources: Source[];
  images: ImageSource[];
  knowledgeGraph: string;
  paperDocument: PaperDocument;
}

interface TaskActions {
  update: (tasks: SearchTask[]) => void;
  setId: (id: string) => void;
  setTitle: (title: string) => void;
  setSuggestion: (suggestion: string) => void;
  setRequirement: (requirement: string) => void;
  setQuery: (query: string) => void;
  updateTask: (query: string, task: Partial<SearchTask>) => void;
  removeTask: (query: string) => boolean;
  setQuestion: (question: string) => void;
  addResource: (resource: Resource) => void;
  updateResource: (id: string, resource: Partial<Resource>) => void;
  removeResource: (id: string) => boolean;
  updateQuestions: (questions: string) => void;
  updateReportPlan: (plan: string) => void;
  updateFinalReport: (report: string) => void;
  setSources: (sources: Source[]) => void;
  setImages: (images: ImageSource[]) => void;
  setFeedback: (feedback: string) => void;
  updateKnowledgeGraph: (knowledgeGraph: string) => void;
  updatePaperDocument: (paperDocument: PaperDocument) => void;
  updatePaperLayoutConfig: (layoutConfig: Partial<PaperLayoutConfig>) => void;
  updatePaperTemplateMeta: (templateMeta: Partial<ThesisTemplateMeta>) => void;
  setPaperArtifacts: (artifacts: PaperArtifact[]) => void;
  clear: () => void;
  reset: () => void;
  backup: () => TaskStore;
  restore: (taskStore: TaskStore) => void;
}

const defaultValues: TaskStore = {
  id: "",
  question: "",
  resources: [],
  query: "",
  questions: "",
  feedback: "",
  reportPlan: "",
  suggestion: "",
  tasks: [],
  requirement: "",
  title: "",
  finalReport: "",
  sources: [],
  images: [],
  knowledgeGraph: "",
  paperDocument: createEmptyPaperDocument(),
};

export const useTaskStore = create(
  persist<TaskStore & TaskActions>(
    (set, get) => ({
      ...defaultValues,
      update: (tasks) => set(() => ({ tasks: [...tasks] })),
      setId: (id) => set(() => ({ id })),
      setTitle: (title) =>
        set((state) => ({
          title,
          paperDocument: {
            ...state.paperDocument,
            title,
          },
        })),
      setSuggestion: (suggestion) => set(() => ({ suggestion })),
      setRequirement: (requirement) => set(() => ({ requirement })),
      setQuery: (query) => set(() => ({ query })),
      updateTask: (query, task) => {
        const newTasks = get().tasks.map((item) => {
          return item.query === query ? { ...item, ...task } : item;
        });
        set(() => ({ tasks: [...newTasks] }));
      },
      removeTask: (query) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.query !== query),
        }));
        return true;
      },
      setQuestion: (question) => set(() => ({ question })),
      addResource: (resource) =>
        set((state) => ({ resources: [resource, ...state.resources] })),
      updateResource: (id, resource) => {
        const newResources = get().resources.map((item) => {
          return item.id === id ? { ...item, ...resource } : item;
        });
        set(() => ({ resources: [...newResources] }));
      },
      removeResource: (id) => {
        set((state) => ({
          resources: state.resources.filter((resource) => resource.id !== id),
        }));
        return true;
      },
      updateQuestions: (questions) => set(() => ({ questions })),
      updateReportPlan: (plan) => set(() => ({ reportPlan: plan })),
      updateFinalReport: (report) =>
        set((state) => ({
          finalReport: report,
          paperDocument: syncPaperDocument(state.paperDocument, {
            title: state.title,
            markdown: report,
            sources: state.sources,
          }),
        })),
      setSources: (sources) =>
        set((state) => ({
          sources,
          paperDocument: syncPaperDocument(state.paperDocument, {
            title: state.title,
            markdown: state.finalReport,
            sources,
          }),
        })),
      setImages: (images) => set(() => ({ images })),
      setFeedback: (feedback) => set(() => ({ feedback })),
      updateKnowledgeGraph: (knowledgeGraph) => set(() => ({ knowledgeGraph })),
      updatePaperDocument: (paperDocument) =>
        set(() => ({
          paperDocument,
          finalReport:
            paperDocument.sections.length > 0
              ? paperDocument.sections
                  .map((section) => {
                    const prefix = "#".repeat(section.level);
                    const heading = section.heading.trim();
                    return [heading ? `${prefix} ${heading}` : "", section.markdown]
                      .filter(Boolean)
                      .join("\n\n");
                  })
                  .join("\n\n")
              : "",
          title: paperDocument.title,
          sources: paperDocument.references,
        })),
      updatePaperLayoutConfig: (layoutConfig) =>
        set((state) => ({
          paperDocument: {
            ...state.paperDocument,
            layoutConfig: {
              ...state.paperDocument.layoutConfig,
              ...layoutConfig,
              pageMargins: {
                ...state.paperDocument.layoutConfig.pageMargins,
                ...layoutConfig.pageMargins,
              },
            },
          },
        })),
      updatePaperTemplateMeta: (templateMeta) =>
        set((state) => ({
          paperDocument: {
            ...state.paperDocument,
            templateMeta: {
              ...state.paperDocument.templateMeta,
              ...templateMeta,
            },
          },
        })),
      setPaperArtifacts: (artifacts) =>
        set((state) => ({
          paperDocument: {
            ...state.paperDocument,
            artifacts: normalizePaperArtifacts(
              artifacts,
              state.paperDocument.sections
            ),
          },
        })),
      clear: () => set(() => ({ tasks: [] })),
      reset: () => set(() => ({ ...defaultValues })),
      backup: () => {
        return {
          ...pick(get(), Object.keys(defaultValues) as (keyof TaskStore)[]),
        } as TaskStore;
      },
      restore: (taskStore) =>
        set(() => {
          const paperDocument = taskStore.paperDocument
            ? {
                ...taskStore.paperDocument,
                layoutConfig:
                  taskStore.paperDocument.layoutConfig ||
                  createDefaultPaperLayoutConfig(),
                templateMeta:
                  taskStore.paperDocument.templateMeta ||
                  createDefaultThesisTemplateMeta(),
              }
            : syncPaperDocument(undefined, {
                title: taskStore.title,
                markdown: taskStore.finalReport,
                sources: taskStore.sources,
              });
          return {
            ...taskStore,
            paperDocument,
          };
        }),
    }),
    {
      name: "research",
      version: 3,
      migrate: (persistedState: StorageValue<TaskStore & TaskActions> | any) => {
        const state = persistedState?.state || persistedState;
        if (!state) return defaultValues;

        const paperDocument = state.paperDocument
          ? {
              ...state.paperDocument,
              templateMeta:
                state.paperDocument.templateMeta ||
                createDefaultThesisTemplateMeta(),
            }
          : syncPaperDocument(undefined, {
              title: state.title || "",
              markdown: state.finalReport || "",
              sources: state.sources || [],
            });

        return {
          ...state,
          paperDocument,
        };
      },
    }
  )
);
