"use client";
import { useLayoutEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import i18n, { detectLanguage } from "@/utils/i18n";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "AI论文撰写智能体";
const APP_DEFAULT_TITLE = process.env.NEXT_PUBLIC_APP_TITLE || APP_NAME;

function I18Provider({ children }: { children: React.ReactNode }) {
  const { language } = useSettingStore();

  useLayoutEffect(() => {
    const settingStore = useSettingStore.getState();
    if (settingStore.language === "") {
      const browserLang = detectLanguage();
      settingStore.update({ language: browserLang });
      i18n.changeLanguage(browserLang);
    } else {
      i18n.changeLanguage(language);
    }
    document.documentElement.setAttribute(
      "lang",
      language || i18n.language || "en-US",
    );
    document.title = APP_DEFAULT_TITLE;
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default I18Provider;
