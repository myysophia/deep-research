"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { FilePenLine, Home, Menu, PencilLine, Settings, X } from "lucide-react";
import { Button } from "@/components/Internal/Button";
import { getSupabaseBrowserClient } from "@/libs/supabase/client";
import { applySaaSClientDefaults } from "@/libs/saas/client-defaults";
import { useGlobalStore } from "@/store/global";
import { useSettingStore } from "@/store/setting";
import { cn } from "@/utils/style";

const Setting = dynamic(() => import("@/components/Setting"));

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "AI论文撰写智能体";

type AuthenticatedAppShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

function AuthenticatedAppShell({
  title,
  description,
  children,
}: AuthenticatedAppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [authReady, setAuthReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openSetting, setOpenSetting } = useGlobalStore();
  const { theme } = useSettingStore();
  const { setTheme } = useTheme();

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        href: "/",
        label: t("home.overview.nav.home", { defaultValue: "首页" }),
        icon: Home,
      },
      {
        href: "/write",
        label: t("home.overview.nav.write", { defaultValue: "AI论文撰写" }),
        icon: PencilLine,
      },
      {
        href: "/revise",
        label: t("home.overview.nav.revise", { defaultValue: "AI论文修改" }),
        icon: FilePenLine,
      },
    ],
    [t],
  );

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(214,199,171,0.18),_transparent_35%),linear-gradient(180deg,#f5f1e8_0%,#f8f6f1_42%,#f2ede2_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(84,95,125,0.16),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#111827_48%,#0b1120_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-stone-300/70 bg-white/55 p-5 backdrop-blur xl:flex xl:flex-col dark:border-slate-800 dark:bg-slate-950/50">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-slate-400">
              {t("home.overview.brand", { defaultValue: "Workspace" })}
            </p>
            <p className="mt-2 text-lg font-semibold text-stone-900 dark:text-slate-100">
              {APP_NAME}
            </p>
          </div>
          <nav className="space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                    active
                      ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-slate-950"
                      : "border-stone-200 bg-white/70 text-stone-700 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-700",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto">
            <Button
              className="w-full justify-start gap-2 rounded-2xl border border-stone-300 bg-white/70 text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
              variant="ghost"
              onClick={() => setOpenSetting(true)}
              title={t("setting.title")}
            >
              <Settings className="h-4 w-4" />
              <span>{t("setting.title")}</span>
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-stone-300/70 bg-white/70 px-4 py-3 backdrop-blur xl:px-8 dark:border-slate-800 dark:bg-slate-950/65">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <Button
                  className="h-9 w-9 xl:hidden"
                  variant="ghost"
                  size="icon"
                  title={t("home.overview.nav.openMenu", {
                    defaultValue: "打开菜单",
                  })}
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold text-stone-900 dark:text-slate-100">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-1 truncate text-sm text-stone-600 dark:text-slate-400">
                      {description}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                className="h-9 w-9"
                variant="ghost"
                size="icon"
                title={t("setting.title")}
                onClick={() => setOpenSetting(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 xl:px-8 xl:py-6">{children}</main>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t("home.overview.nav.closeMenu", { defaultValue: "关闭菜单" })}
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-stone-300 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                {APP_NAME}
              </p>
              <Button
                className="h-8 w-8"
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                title={t("home.overview.nav.closeMenu", { defaultValue: "关闭菜单" })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-1">
              {navItems.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                      active
                        ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-slate-950"
                        : "border-stone-200 bg-white text-stone-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      <Setting open={openSetting} onClose={() => setOpenSetting(false)} />
    </div>
  );
}

export default AuthenticatedAppShell;
