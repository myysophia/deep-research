import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RevisionAnalysis,
  RevisionApplyResult,
  RevisionCommentAuthor,
  RevisionPlanResult,
} from "@/types/revision";

interface RevisionStore {
  step: 1 | 2 | 3 | 4;
  fileMeta: {
    name: string;
    size: number;
    type: string;
  } | null;
  analyzing: boolean;
  planning: boolean;
  applying: boolean;
  exporting: boolean;
  analysis: RevisionAnalysis | null;
  authors: RevisionCommentAuthor[];
  planResult: RevisionPlanResult | null;
  applyResult: RevisionApplyResult | null;
  error: string;
}

interface RevisionActions {
  setStep: (step: RevisionStore["step"]) => void;
  setFileMeta: (fileMeta: RevisionStore["fileMeta"]) => void;
  setAnalyzing: (value: boolean) => void;
  setPlanning: (value: boolean) => void;
  setApplying: (value: boolean) => void;
  setExporting: (value: boolean) => void;
  setAnalysis: (analysis: RevisionAnalysis | null) => void;
  setAuthors: (authors: RevisionCommentAuthor[]) => void;
  setPlanResult: (result: RevisionPlanResult | null) => void;
  setApplyResult: (result: RevisionApplyResult | null) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const defaultState: RevisionStore = {
  step: 1,
  fileMeta: null,
  analyzing: false,
  planning: false,
  applying: false,
  exporting: false,
  analysis: null,
  authors: [],
  planResult: null,
  applyResult: null,
  error: "",
};

export const useRevisionStore = create<RevisionStore & RevisionActions>()(
  persist(
    (set) => ({
      ...defaultState,
      setStep: (step) => set({ step }),
      setFileMeta: (fileMeta) => set({ fileMeta }),
      setAnalyzing: (analyzing) => set({ analyzing }),
      setPlanning: (planning) => set({ planning }),
      setApplying: (applying) => set({ applying }),
      setExporting: (exporting) => set({ exporting }),
      setAnalysis: (analysis) => set({ analysis }),
      setAuthors: (authors) => set({ authors }),
      setPlanResult: (planResult) => set({ planResult }),
      setApplyResult: (applyResult) => set({ applyResult }),
      setError: (error) => set({ error }),
      reset: () => set(defaultState),
    }),
    {
      name: "revision-workspace",
      partialize: (state) => ({
        step: state.step,
        fileMeta: state.fileMeta,
        analysis: state.analysis,
        authors: state.authors,
        planResult: state.planResult,
        applyResult: state.applyResult,
      }),
    },
  ),
);
