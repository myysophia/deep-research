"use client";
import type { SettingStore } from "@/store/setting";
import { useSettingStore } from "@/store/setting";

export const saasClientEnabled =
  process.env.NEXT_PUBLIC_SAAS_MVP_ENABLED === "1";

export const saasClientDefaults: Partial<SettingStore> = {
  mode: "proxy",
  provider: "openaicompatible",
  openAICompatibleApiProxy: "https://dashscope.aliyuncs.com/compatible-mode",
  openAICompatibleThinkingModel: "qwen3.5-plus",
  openAICompatibleNetworkingModel: "qwen3.5-plus",
  searchProvider: "model",
  accessPassword: "",
};

export function applySaaSClientDefaults(force = false) {
  if (!saasClientEnabled) return;

  const store = useSettingStore.getState();
  const shouldApply =
    force ||
    store.mode !== "proxy" ||
    store.provider !== "openaicompatible" ||
    store.openAICompatibleApiProxy !==
      "https://dashscope.aliyuncs.com/compatible-mode" ||
    store.openAICompatibleThinkingModel !== "qwen3.5-plus" ||
    store.openAICompatibleNetworkingModel !== "qwen3.5-plus" ||
    store.accessPassword !== "";

  if (!shouldApply) return;

  store.update(saasClientDefaults);
}
