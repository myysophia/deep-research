import { generateText } from "ai";
import { customAlphabet } from "nanoid";
import { createAIProvider } from "@/utils/deep-research/provider";
import type {
  CommentDecision,
  RevisionAnalysisSnapshot,
  RevisionApplySummary,
  RevisionPatch,
  RevisionReportItem,
} from "@/utils/revision-docx/types";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function applyRuleRewrite(params: { text: string; hints: string[] }) {
  let output = normalizeText(params.text);

  if (params.hints.some((hint) => hint.includes("转折"))) {
    const transitionPrefix = "在上述背景下，";
    if (!output.startsWith(transitionPrefix)) {
      output = `${transitionPrefix}${output}`;
    }
  }

  if (
    params.hints.some((hint) =>
      /护理教育有什么关系|护理教育|临床思维/.test(hint)
    ) &&
    !output.includes("护理教育")
  ) {
    output = `${output} 这一过程与护理教育场景密切相关，直接影响护生的临床判断与决策质量。`;
  }

  output = output.replace(/。{2,}/g, "。").replace(/，{2,}/g, "，");
  return output;
}

async function rewriteWithLLM(params: {
  paragraphText: string;
  commentHints: string[];
  llm?: {
    provider: string;
    model: string;
    baseURL: string;
    apiKey?: string;
  };
}) {
  const llm = params.llm;
  if (!llm) return null;

  const model = await createAIProvider({
    provider: llm.provider,
    model: llm.model,
    baseURL: llm.baseURL,
    apiKey: llm.apiKey,
  });

  const prompt = [
    "你是医学论文修改助手，请根据审稿批注改写段落。",
    "硬性约束：",
    "1. 只改写当前段落，不扩展新章节。",
    "2. 不编造参考文献、统计数值、研究结论。",
    "3. 保持学术表达与原段语义一致。",
    "4. 只输出改写后的段落正文，不要解释。",
    "",
    `原段落：${params.paragraphText}`,
    `批注：${params.commentHints.join("；")}`,
  ].join("\n");

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.2,
  });

  return normalizeText(text);
}

function buildMarkdownReport(params: {
  fileName: string;
  summary: RevisionApplySummary;
  items: RevisionReportItem[];
}) {
  const lines = [
    `# 论文批注自动修改说明`,
    ``,
    `- 文档：${params.fileName}`,
    `- 处理时间：${new Date().toLocaleString("zh-CN")}`,
    `- 选中批注数：${params.summary.selectedCommentCount}`,
    `- 自动修改数：${params.summary.patchCount}`,
    `- 需人工确认：${params.summary.manualReviewCount}`,
    `- 跳过数：${params.summary.skippedCount}`,
    ``,
    `## 逐条处理结果`,
    ``,
  ];

  for (const item of params.items) {
    lines.push(`### 批注 ${item.commentId}（${item.author}）`);
    lines.push(`- 批注内容：${item.commentContent || "（空）"}`);
    lines.push(`- 命中原文：${item.originalExcerpt || "（未定位）"}`);
    lines.push(`- 处理状态：${item.status}`);
    lines.push(`- 结果说明：${item.resultSummary}`);
    lines.push(
      `- 是否需要人工处理：${item.manualActionNeeded ? "是" : "否"}`
    );
    lines.push("");
  }

  return lines.join("\n");
}

export async function applyRevisionPlan(params: {
  analysis: RevisionAnalysisSnapshot;
  decisions: CommentDecision[];
  llm?: {
    provider: string;
    model: string;
    baseURL: string;
    apiKey?: string;
  };
}) {
  const paragraphMap = new Map(
    params.analysis.paragraphs.map((paragraph) => [paragraph.index, paragraph])
  );
  const anchorMap = new Map(
    params.analysis.anchors.map((anchor) => [anchor.commentId, anchor])
  );

  const groupedByParagraph = new Map<number, CommentDecision[]>();
  for (const decision of params.decisions) {
    if (
      decision.action !== "rewrite_paragraph" ||
      decision.requiresHumanReview ||
      decision.paragraphIndex === null
    ) {
      continue;
    }
    const list = groupedByParagraph.get(decision.paragraphIndex) || [];
    list.push(decision);
    groupedByParagraph.set(decision.paragraphIndex, list);
  }

  const patches: RevisionPatch[] = [];
  for (const [paragraphIndex, paragraphDecisions] of groupedByParagraph.entries()) {
    const paragraph = paragraphMap.get(paragraphIndex);
    if (!paragraph) continue;
    const commentHints = paragraphDecisions.map((decision) => decision.content);
    const originalText = paragraph.text;
    let revisedText = originalText;
    let method: "llm" | "rule-fallback" = "rule-fallback";

    try {
      const llmText = await rewriteWithLLM({
        paragraphText: originalText,
        commentHints,
        llm: params.llm,
      });
      if (llmText) {
        revisedText = llmText;
        method = "llm";
      } else {
        revisedText = applyRuleRewrite({ text: originalText, hints: commentHints });
      }
    } catch {
      revisedText = applyRuleRewrite({ text: originalText, hints: commentHints });
      method = "rule-fallback";
    }

    if (!revisedText || revisedText === originalText) {
      continue;
    }

    patches.push({
      patchId: `patch_${nanoid()}`,
      paragraphIndex,
      originalText,
      revisedText,
      relatedCommentIds: paragraphDecisions.map((decision) => decision.commentId),
      method,
      confidence: method === "llm" ? 0.82 : 0.65,
      applyMode: "replace",
      changeSummary:
        method === "llm"
          ? "根据批注进行了语义改写。"
          : "按规则补充了衔接与学术表达。",
    });
  }

  const appliedCommentIdSet = new Set<string>(
    patches.flatMap((patch) => patch.relatedCommentIds)
  );

  const reportItems: RevisionReportItem[] = params.decisions.map((decision) => {
    const anchor = anchorMap.get(decision.commentId);
    const originalExcerpt = anchor?.quotedText || anchor?.paragraphText || "";

    if (appliedCommentIdSet.has(decision.commentId)) {
      return {
        commentId: decision.commentId,
        author: decision.author,
        commentContent: decision.content,
        originalExcerpt,
        status: "已自动修改",
        resultSummary: "该批注所在段落已自动改写并纳入导出补丁。",
        manualActionNeeded: false,
      };
    }

    if (decision.requiresHumanReview) {
      return {
        commentId: decision.commentId,
        author: decision.author,
        commentContent: decision.content,
        originalExcerpt,
        status: "需人工确认",
        resultSummary: decision.reason,
        manualActionNeeded: true,
      };
    }

    return {
      commentId: decision.commentId,
      author: decision.author,
      commentContent: decision.content,
      originalExcerpt,
      status: "跳过并说明原因",
      resultSummary: "自动改写未产出稳定差异，已跳过。",
      manualActionNeeded: false,
    };
  });

  const summary: RevisionApplySummary = {
    selectedCommentCount: params.decisions.length,
    patchCount: patches.length,
    manualReviewCount: reportItems.filter((item) => item.manualActionNeeded).length,
    skippedCount: reportItems.filter(
      (item) => item.status === "跳过并说明原因"
    ).length,
  };

  const markdownReport = buildMarkdownReport({
    fileName: params.analysis.fileName,
    summary,
    items: reportItems,
  });

  return {
    patches,
    reportItems,
    summary,
    markdownReport,
    exportPayload: {
      analysis: params.analysis,
      patches,
    },
  };
}

