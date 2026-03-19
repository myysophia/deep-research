import { generateText } from "ai";
import { getAIProviderApiKey, getAIProviderBaseURL } from "@/app/api/utils";
import { createAIProvider } from "@/utils/deep-research/provider";

const PROVIDER_CANDIDATES = [
  { provider: "openai", model: "gpt-5-mini" },
  { provider: "google", model: "gemini-2.5-flash" },
  { provider: "deepseek", model: "deepseek-chat" },
  { provider: "mistral", model: "mistral-large-latest" },
] as const;

async function createRevisionModel() {
  for (const candidate of PROVIDER_CANDIDATES) {
    const apiKey = getAIProviderApiKey(candidate.provider);
    if (!apiKey) continue;

    try {
      return await createAIProvider({
        provider: candidate.provider,
        apiKey,
        baseURL: getAIProviderBaseURL(candidate.provider),
        model: candidate.model,
      });
    } catch (error) {
      console.warn("[revision] 初始化模型失败，尝试下一候选提供商", {
        provider: candidate.provider,
        error,
      });
    }
  }

  return null;
}

export async function rewriteParagraphWithAi(input: {
  paragraphText: string;
  contextBefore: string;
  contextAfter: string;
  comments: string[];
}) {
  const model = await createRevisionModel();
  if (!model) return null;

  const { text } = await generateText({
    model,
    temperature: 0.3,
    system: [
      "你是一个中文论文修改助手。",
      "你只允许基于现有段落做安全改写，不能编造参考文献、统计结果、实验数据或不存在的结论。",
      "如果批注要求补充证据、文献、统计数值，你必须维持原意并采用更审慎表述，而不是虚构内容。",
      "输出仅返回修订后的单个段落正文，不要解释。",
    ].join(" "),
    prompt: [
      `上文：${input.contextBefore || "（无）"}`,
      `待修改段落：${input.paragraphText}`,
      `下文：${input.contextAfter || "（无）"}`,
      `批注意见：${input.comments.join("；")}`,
      "请输出一段适合论文正文的中文修订结果。",
    ].join("\n"),
  });

  return text.trim();
}
