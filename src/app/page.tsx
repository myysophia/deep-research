"use client";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { getSupabaseBrowserClient } from "@/libs/supabase/client";
import { applySaaSClientDefaults } from "@/libs/saas/client-defaults";
import { useGlobalStore } from "@/store/global";
import { useSettingStore } from "@/store/setting";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "AI论文撰写智能体";
const APP_FOOTER = process.env.NEXT_PUBLIC_APP_FOOTER;

const Header = dynamic(() => import("@/components/Internal/Header"));
const Setting = dynamic(() => import("@/components/Setting"));
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

function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const [authReady, setAuthReady] = useState(false);
  const {
    openSetting,
    setOpenSetting,
    openHistory,
    setOpenHistory,
    openKnowledge,
    setOpenKnowledge,
  } = useGlobalStore();

  const { theme } = useSettingStore();
  const { setTheme } = useTheme();

  useLayoutEffect(() => {
    const settingStore = useSettingStore.getState();
    setTheme(settingStore.theme);
  }, [theme, setTheme]);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    const redirectToLogin = () => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        redirectToLogin();
        return;
      }
      applySaaSClientDefaults();
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        redirectToLogin();
        return;
      }
      applySaaSClientDefaults();
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(214,199,171,0.18),_transparent_35%),linear-gradient(180deg,#f5f1e8_0%,#f8f6f1_42%,#f2ede2_100%)] px-6 dark:bg-[radial-gradient(circle_at_top,_rgba(84,95,125,0.16),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#111827_48%,#0b1120_100%)]">
        <div className="rounded-3xl border border-stone-200 bg-white/80 px-6 py-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-sm font-medium text-stone-700 dark:text-slate-200">
            {t("auth.gate.checking")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4">
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
        <Setting open={openSetting} onClose={() => setOpenSetting(false)} />
        <History open={openHistory} onClose={() => setOpenHistory(false)} />
        <Knowledge
          open={openKnowledge}
          onClose={() => setOpenKnowledge(false)}
        />
      </aside>
    </div>
  );
}

export default Home;
