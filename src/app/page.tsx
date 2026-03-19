"use client";

import Link from "next/link";
import { FilePenLine, PencilLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthenticatedAppShell from "@/components/Internal/AuthenticatedAppShell";

function Home() {
  const { t } = useTranslation();

  return (
    <AuthenticatedAppShell
      title={t("home.overview.title", { defaultValue: "工作台首页" })}
      description={t("home.overview.description", {
        defaultValue: "选择一个工作台继续你的论文工作流程。",
      })}
    >
      <div className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2">
        <Link
          href="/write"
          className="group rounded-3xl border border-stone-300/80 bg-white/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/65"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-slate-950">
            <PencilLine className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-slate-100">
            {t("home.overview.cards.write.title", { defaultValue: "AI论文撰写" })}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-400">
            {t("home.overview.cards.write.description", {
              defaultValue: "从选题、研究到生成终稿，沿用现有完整撰写工作流。",
            })}
          </p>
          <p className="mt-4 text-sm font-medium text-stone-700 group-hover:text-stone-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            {t("home.overview.cards.write.action", { defaultValue: "进入撰写" })}
          </p>
        </Link>

        <Link
          href="/revise"
          className="group rounded-3xl border border-stone-300/80 bg-white/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/65"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-slate-950">
            <FilePenLine className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-slate-100">
            {t("home.overview.cards.revise.title", { defaultValue: "AI论文修改" })}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-400">
            {t("home.overview.cards.revise.description", {
              defaultValue: "上传带批注论文，自动解析审阅意见并生成修订结果。",
            })}
          </p>
          <p className="mt-4 text-sm font-medium text-stone-700 group-hover:text-stone-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            {t("home.overview.cards.revise.action", { defaultValue: "进入修改" })}
          </p>
        </Link>
      </div>
    </AuthenticatedAppShell>
  );
}

export default Home;
