"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import AuthenticatedAppShell from "@/components/Internal/AuthenticatedAppShell";
import { useGlobalStore } from "@/store/global";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "AI论文撰写智能体";
const APP_FOOTER = process.env.NEXT_PUBLIC_APP_FOOTER;

const Header = dynamic(() => import("@/components/Internal/Header"));
const WorkflowProgress = dynamic(
  () => import("@/components/Research/WorkflowProgress"),
);
const Topic = dynamic(() => import("@/components/Research/Topic"));
const Feedback = dynamic(() => import("@/components/Research/Feedback"));
const SearchResult = dynamic(
  () => import("@/components/Research/SearchResult"),
);
const FinalReport = dynamic(() => import("@/components/Research/FinalReport"));
const History = dynamic(() => import("@/components/History"));
const Knowledge = dynamic(() => import("@/components/Knowledge"));

function WritePage() {
  const { t } = useTranslation();
  const { openHistory, setOpenHistory, openKnowledge, setOpenKnowledge } =
    useGlobalStore();

  return (
    <AuthenticatedAppShell
      title={t("write.workspace.title", { defaultValue: "AI论文撰写" })}
      description={t("write.workspace.description", {
        defaultValue: "继续使用既有撰写流程，推进你的研究与终稿。",
      })}
    >
      <div className="mx-auto w-full max-w-screen-lg px-1">
        <Header />
        <main>
          <WorkflowProgress />
          <Topic />
          <Feedback />
          <SearchResult />
          <FinalReport />
        </main>
        <footer className="my-4 text-center text-sm text-gray-600 print:hidden">
          {APP_FOOTER ||
            t("copyright", {
              name: APP_NAME,
            })}
        </footer>
        <aside className="print:hidden">
          <History open={openHistory} onClose={() => setOpenHistory(false)} />
          <Knowledge
            open={openKnowledge}
            onClose={() => setOpenKnowledge(false)}
          />
        </aside>
      </div>
    </AuthenticatedAppShell>
  );
}

export default WritePage;
