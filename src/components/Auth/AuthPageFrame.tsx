"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { FileSearch, LibraryBig, ScrollText, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/utils/style";

type Props = {
  badge: string;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

function AuthPageFrame({ badge, title, description, footer, children }: Props) {
  const { t } = useTranslation();
  const railSteps = [
    t("auth.layout.rail.topic"),
    t("auth.layout.rail.search"),
    t("auth.layout.rail.argument"),
    t("auth.layout.rail.draft"),
  ];
  const highlights = [
    {
      title: t("auth.layout.highlights.workspace.title"),
      description: t("auth.layout.highlights.workspace.description"),
      icon: LibraryBig,
    },
    {
      title: t("auth.layout.highlights.evidence.title"),
      description: t("auth.layout.highlights.evidence.description"),
      icon: FileSearch,
    },
    {
      title: t("auth.layout.highlights.output.title"),
      description: t("auth.layout.highlights.output.description"),
      icon: ScrollText,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(214,199,171,0.22),_transparent_38%),linear-gradient(180deg,#f5f1e8_0%,#f8f6f1_42%,#f2ede2_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(84,95,125,0.18),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#111827_48%,#0b1120_100%)]">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-6 lg:py-8">
        <section className="relative overflow-hidden rounded-[28px] border border-stone-300/70 bg-stone-50/85 p-6 shadow-[0_24px_80px_rgba(120,99,72,0.08)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/70 dark:shadow-[0_24px_80px_rgba(15,23,42,0.45)] lg:p-9">
          <div className="absolute inset-y-0 right-0 w-32 bg-[linear-gradient(180deg,rgba(130,166,198,0.08),rgba(230,198,129,0.06))] blur-2xl dark:bg-[linear-gradient(180deg,rgba(96,165,250,0.08),rgba(245,158,11,0.04))]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center rounded-full border border-stone-300/70 bg-stone-100/80 px-3 py-1 text-xs font-medium tracking-[0.18em] text-stone-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {t("auth.layout.brand")}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-500 dark:text-slate-400">
                  {badge}
                </p>
                <h1 className="max-w-xl text-3xl font-semibold leading-tight text-stone-900 dark:text-slate-50 lg:text-5xl">
                  {t("auth.layout.heroTitle")}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-stone-600 dark:text-slate-300 lg:text-base">
                  {t("auth.layout.heroDescription")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map(({ title: itemTitle, description: itemDescription, icon: Icon }) => (
                <div
                  key={itemTitle}
                  className="rounded-2xl border border-stone-200/80 bg-white/75 p-4 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-slate-950">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mb-1 text-sm font-semibold text-stone-900 dark:text-slate-100">
                    {itemTitle}
                  </p>
                  <p className="text-sm leading-6 text-stone-600 dark:text-slate-400">
                    {itemDescription}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-stone-200/80 bg-gradient-to-r from-white/80 via-stone-100/70 to-amber-50/70 p-5 dark:border-slate-800 dark:from-slate-950/80 dark:via-slate-900/70 dark:to-slate-950/60">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                    {t("auth.layout.trackTitle")}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-slate-400">
                    {t("auth.layout.trackDescription")}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {railSteps.map((step, index) => (
                  <div
                    key={step}
                    className={cn(
                      "rounded-2xl border px-4 py-3",
                      index === 0
                        ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-slate-950"
                        : "border-stone-200 bg-white/80 text-stone-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300",
                    )}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] opacity-70">
                      0{index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Card className="border-stone-300/80 bg-white/90 shadow-[0_28px_80px_rgba(122,95,68,0.12)] dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-[0_28px_80px_rgba(15,23,42,0.45)]">
          <CardHeader className="space-y-3 p-7 pb-5">
            <CardDescription className="text-xs font-medium uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">
              {badge}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-stone-950 dark:text-slate-50">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-stone-600 dark:text-slate-400">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-7 pt-0">
            {children}
            <div className="rounded-2xl border border-dashed border-stone-300/80 bg-stone-50/70 px-4 py-3 text-sm text-stone-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
              {t("auth.layout.noSso")}
            </div>
            <div className="flex items-center justify-between text-sm text-stone-500 dark:text-slate-400">
              <Link href="/" className="underline underline-offset-4">
                {t("auth.actions.backHome")}
              </Link>
              {footer}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AuthPageFrame;
