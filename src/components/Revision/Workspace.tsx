"use client";

import { useMemo, useRef } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, LoaderCircle, UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import MarkdownBlock from "@/components/MagicDown/View";
import { Button } from "@/components/Internal/Button";
import { useRevisionStore } from "@/store/revision";
import type {
  RevisionAnalysis,
  RevisionApplyResult,
  RevisionPlanResult,
  RevisionSummary,
} from "@/types/revision";
import { downloadBlob, downloadFile, formatSize } from "@/utils/file";
import { cn } from "@/utils/style";

const STEPS = [1, 2, 3, 4] as const;

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function toArray<T = unknown>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const data = toRecord(payload);
  const error = toRecord(data.error);
  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  return fallback;
}

function normalizeAuthors(raw: unknown) {
  return toArray(raw).map((item, index) => {
    const data = toRecord(item);
    return {
      author:
        toString(data.author) ||
        toString(data.name) ||
        toString(data.id) ||
        `author-${index + 1}`,
      count: toNumber(data.count),
      selected: false,
    };
  });
}

function normalizeSummary(raw: unknown): RevisionSummary {
  const data = toRecord(raw);
  return {
    totalComments:
      toNumber(data.totalComments) ||
      toNumber(data.selectedCommentCount) ||
      toNumber(data.anchoredComments),
    selectedComments:
      toNumber(data.selectedComments) || toNumber(data.selectedCommentCount),
    autoApplicableCount:
      toNumber(data.autoApplicableCount) ||
      toNumber(data.autoModified) ||
      toNumber(data.autoRewriteCount) ||
      toNumber(data.patchCount),
    skippedCount:
      toNumber(data.skippedCount) || toNumber(data.skipped) || toNumber(data.skipCount),
    manualReviewCount:
      toNumber(data.manualReviewCount) ||
      toNumber(data.manualReview) ||
      toNumber(data.manualReviewCount),
  };
}

function normalizePlanResult(raw: unknown): RevisionPlanResult {
  const data = toRecord(raw);
  return {
    decisions: toArray(data.decisions) as RevisionPlanResult["decisions"],
    summary: normalizeSummary(data.summary),
    manualReviewItems: toArray(data.manualReviewItems).map((item, index) => {
      const record = toRecord(item);
      return {
        commentId:
          toString(record.commentId) || toString(record.id) || `manual-${index + 1}`,
        author: toString(record.author),
        commentContent:
          toString(record.commentContent) || toString(record.content) || "未提供批注内容",
        originalExcerpt:
          toString(record.originalExcerpt) || toString(record.excerpt) || "",
        status: "需人工确认",
        resultSummary: toString(record.resultSummary) || toString(record.reason) || "需要人工确认",
        manualActionNeeded:
          toString(record.manualActionNeeded) || toString(record.reason) || "需要人工确认",
      };
    }),
  };
}

function normalizeApplyResult(raw: unknown, planSummary: RevisionSummary): RevisionApplyResult {
  const data = toRecord(raw);
  const reportItems = toArray(data.reportItems).map((item, index) => {
    const record = toRecord(item);
    return {
      commentId:
        toString(record.commentId) || toString(record.id) || `item-${index + 1}`,
      author: toString(record.author),
      commentContent:
        toString(record.commentContent) || toString(record.content) || "",
      originalExcerpt:
        toString(record.originalExcerpt) || toString(record.excerpt) || "",
      status:
        (toString(record.status, "跳过并说明原因") as
          | "已自动修改"
          | "跳过并说明原因"
          | "需人工确认"),
      resultSummary:
        toString(record.resultSummary) || toString(record.reason) || "已生成处理结果。",
      manualActionNeeded:
        typeof record.manualActionNeeded === "string"
          ? record.manualActionNeeded
          : record.manualActionNeeded
            ? "需要人工进一步处理。"
            : undefined,
    };
  });

  return {
    patches: toArray(data.patches) as RevisionApplyResult["patches"],
    summary: {
      totalComments: planSummary.totalComments,
      selectedComments:
        normalizeSummary(data.summary).selectedComments || planSummary.selectedComments,
      autoApplicableCount:
        normalizeSummary(data.summary).autoApplicableCount ||
        toArray(data.patches).length,
      skippedCount:
        normalizeSummary(data.summary).skippedCount ||
        reportItems.filter((item) => item.status === "跳过并说明原因").length,
      manualReviewCount:
        normalizeSummary(data.summary).manualReviewCount ||
        reportItems.filter((item) => item.status === "需人工确认").length,
    },
    reportItems,
    reportMarkdown:
      toString(data.reportMarkdown) || toString(data.markdownReport),
    exportPayload: toRecord(data.exportPayload),
  };
}

function Workspace() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    step,
    setStep,
    fileMeta,
    setFileMeta,
    analyzing,
    setAnalyzing,
    planning,
    setPlanning,
    applying,
    setApplying,
    exporting,
    setExporting,
    analysis,
    setAnalysis,
    authors,
    setAuthors,
    planResult,
    setPlanResult,
    applyResult,
    setApplyResult,
    error,
    setError,
    reset,
  } = useRevisionStore();

  const selectedAuthors = useMemo(
    () => authors.filter((item) => item.selected).map((item) => item.author),
    [authors],
  );

  async function handleAnalyze(nextFile: File) {
    setAnalyzing(true);
    setError("");
    setPlanResult(null);
    setApplyResult(null);

    try {
      const formData = new FormData();
      formData.append("file", nextFile);
      const response = await fetch("/api/revision/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            t("revise.messages.analyzeFailed", {
              defaultValue: "批注解析失败，请稍后重试。",
            }),
          ),
        );
      }

      const analysisPayload = payload.data.analysis as RevisionAnalysis;
      setFileMeta({
        name: nextFile.name,
        size: nextFile.size,
        type: nextFile.type,
      });
      setAnalysis(analysisPayload);
      setAuthors(normalizeAuthors(payload.data.authors));
      setStep(2);
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : t("revise.messages.analyzeFailed", {
              defaultValue: "批注解析失败，请稍后重试。",
            }),
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handlePlan() {
    if (!analysis || selectedAuthors.length === 0) return;
    setPlanning(true);
    setError("");

    try {
      const response = await fetch("/api/revision/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          selectedAuthors,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            t("revise.messages.planFailed", {
              defaultValue: "修改方案生成失败，请稍后重试。",
            }),
          ),
        );
      }

      setPlanResult(normalizePlanResult(payload.data));
      setStep(3);
    } catch (planError) {
      setError(
        planError instanceof Error
          ? planError.message
          : t("revise.messages.planFailed", {
              defaultValue: "修改方案生成失败，请稍后重试。",
            }),
      );
    } finally {
      setPlanning(false);
    }
  }

  async function handleApply() {
    if (!analysis || !planResult) return;
    setApplying(true);
    setError("");

    try {
      const response = await fetch("/api/revision/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          decisions: planResult.decisions,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            t("revise.messages.applyFailed", {
              defaultValue: "自动修改执行失败，请稍后重试。",
            }),
          ),
        );
      }

      setApplyResult(normalizeApplyResult(payload.data, planResult.summary));
      setStep(4);
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : t("revise.messages.applyFailed", {
              defaultValue: "自动修改执行失败，请稍后重试。",
            }),
      );
    } finally {
      setApplying(false);
    }
  }

  async function handleExportDocx() {
    if (!applyResult || !fileMeta) return;
    setExporting(true);
    setError("");

    try {
      const response = await fetch("/api/revision/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...applyResult.exportPayload,
          fileName: fileMeta.name,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          getErrorMessage(
            payload,
            t("revise.messages.exportFailed", {
              defaultValue: "修订文档导出失败，请稍后重试。",
            }),
          ),
        );
      }

      const blob = await response.blob();
      downloadBlob(
        blob,
        `${fileMeta.name.replace(/\.docx$/i, "")}-修订稿.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : t("revise.messages.exportFailed", {
              defaultValue: "修订文档导出失败，请稍后重试。",
            }),
      );
    } finally {
      setExporting(false);
    }
  }

  function handleMarkdownDownload() {
    if (!applyResult) return;
    downloadFile(
      applyResult.reportMarkdown,
      `${fileMeta?.name?.replace(/\.docx$/i, "") || "论文修订"}-修改说明.md`,
      "text/markdown;charset=utf-8",
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <section className="rounded-3xl border border-stone-300/80 bg-white/75 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/65">
        <div className="grid gap-3 md:grid-cols-4">
          {STEPS.map((item) => (
            <div
              key={item}
              className={cn(
                "rounded-2xl border px-4 py-3",
                step >= item
                  ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-slate-950"
                  : "border-stone-200 bg-stone-50/80 text-stone-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400",
              )}
            >
              <p className="text-xs uppercase tracking-[0.22em] opacity-70">0{item}</p>
              <p className="mt-2 text-sm font-semibold">
                {t(`revise.steps.${item}`, {
                  defaultValue:
                    item === 1
                      ? "上传文档"
                      : item === 2
                        ? "勾选作者"
                        : item === 3
                          ? "方案总览"
                          : "导出结果",
                })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-stone-300/80 bg-white/75 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/65">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-slate-100">
              {t("revise.workspace.panelTitle", { defaultValue: "AI论文修改工作台" })}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-slate-400">
              {t("revise.workspace.panelDescription", {
                defaultValue: "上传带批注 docx，选择审阅者，系统会自动处理安全可改项，并把高风险内容保留为人工确认。",
              })}
            </p>
          </div>
              <Button
                variant="ghost"
                className="rounded-2xl"
                onClick={() => {
                  reset();
                }}
              >
            {t("revise.workspace.reset", { defaultValue: "重新开始" })}
          </Button>
        </div>

        {step === 1 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/80 p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-slate-950">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-stone-900 dark:text-slate-100">
              {t("revise.upload.title", { defaultValue: "上传带批注的 docx 论文" })}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-400">
              {t("revise.upload.description", {
                defaultValue: "当前版本仅支持 docx，并会在导出时清除批注侧栏，生成干净稿与修改说明。",
              })}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button
                className="rounded-2xl"
                onClick={() => inputRef.current?.click()}
                disabled={analyzing}
              >
                {analyzing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {t("revise.upload.selectFile", { defaultValue: "选择文档" })}
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={async (event) => {
                const nextFile = event.target.files?.[0];
                if (!nextFile) return;
                await handleAnalyze(nextFile);
                event.currentTarget.value = "";
              }}
            />
          </div>
        ) : null}

        {step >= 2 && fileMeta ? (
          <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <p className="font-medium text-stone-900 dark:text-slate-100">{fileMeta.name}</p>
            <p className="mt-1">
              {t("revise.upload.fileMeta", {
                defaultValue: "文件大小：{{size}}",
                size: formatSize(fileMeta.size),
              })}
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-slate-100">
                {t("revise.authors.title", { defaultValue: "选择要处理的批注作者" })}
              </h3>
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
                {t("revise.authors.description", {
                  defaultValue: "建议只勾选老师或审阅者，忽略“改了改了”等回复性批注作者。",
                })}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {authors.map((authorItem) => (
                <label
                  key={authorItem.author}
                  className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(authorItem.selected)}
                    onChange={(event) =>
                      setAuthors(
                        authors.map((item) =>
                          item.author === authorItem.author
                            ? { ...item, selected: event.target.checked }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-stone-300"
                  />
                  <div>
                    <p className="font-medium text-stone-900 dark:text-slate-100">
                      {authorItem.author || t("revise.authors.unknown", { defaultValue: "未命名作者" })}
                    </p>
                    <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
                      {t("revise.authors.commentCount", {
                        defaultValue: "共 {{count}} 条批注",
                        count: authorItem.count,
                      })}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                className="rounded-2xl"
                disabled={planning || selectedAuthors.length === 0}
                onClick={handlePlan}
              >
                {planning ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t("revise.authors.generatePlan", { defaultValue: "生成修改方案" })}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 && planResult ? (
          <div className="space-y-5">
            <SummaryCards
              title={t("revise.plan.title", { defaultValue: "修改方案总览" })}
              summary={planResult.summary}
            />
            <ManualReviewList items={planResult.manualReviewItems} />
            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" className="rounded-2xl" onClick={() => setStep(2)}>
                {t("revise.actions.back", { defaultValue: "返回作者选择" })}
              </Button>
              <Button className="rounded-2xl" disabled={applying} onClick={handleApply}>
                {applying ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {t("revise.plan.apply", { defaultValue: "执行自动修改" })}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 && applyResult ? (
          <div className="space-y-5">
            <SummaryCards
              title={t("revise.result.title", { defaultValue: "自动修改结果" })}
              summary={applyResult.summary}
            />
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" disabled={exporting} onClick={handleExportDocx}>
                {exporting ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {t("revise.result.downloadDocx", { defaultValue: "下载修订稿 docx" })}
              </Button>
              <Button variant="ghost" className="rounded-2xl" onClick={handleMarkdownDownload}>
                <Download className="mr-2 h-4 w-4" />
                {t("revise.result.downloadMarkdown", { defaultValue: "下载修改说明 Markdown" })}
              </Button>
            </div>
            <ManualReviewList items={applyResult.reportItems.filter((item) => item.status === "需人工确认")} />
            <div className="rounded-3xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="mb-3 text-sm font-semibold text-stone-900 dark:text-slate-100">
                {t("revise.result.preview", { defaultValue: "修改对照说明预览" })}
              </p>
              <div className="prose prose-stone max-w-none dark:prose-invert">
                <MarkdownBlock>{applyResult.reportMarkdown}</MarkdownBlock>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryCards({
  title,
  summary,
}: {
  title: string;
  summary: {
    totalComments: number;
    selectedComments: number;
    autoApplicableCount: number;
    skippedCount: number;
    manualReviewCount: number;
  };
}) {
  const items = [
    { label: "识别批注", value: summary.totalComments },
    { label: "本次处理", value: summary.selectedComments },
    { label: "已自动修改", value: summary.autoApplicableCount },
    { label: "需人工确认", value: summary.manualReviewCount },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900 dark:text-slate-100">{title}</h3>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
          系统会自动处理低风险项，并把高风险项保留给你人工核对。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70"
          >
            <p className="text-sm text-stone-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-slate-100">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualReviewList({
  items,
}: {
  items: Array<{
    commentId: string;
    author?: string;
    commentContent: string;
    originalExcerpt: string;
    resultSummary: string;
    manualActionNeeded?: string;
    status?: string;
  }>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-stone-900 dark:text-slate-100">
          需人工确认
        </h3>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
          下列内容涉及证据、参考文献或统计结果，系统不会直接写入正文。
        </p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.commentId}-${item.commentContent}`}
            className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 dark:border-amber-400/20 dark:bg-amber-500/10"
          >
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              批注 {item.commentId} {item.author ? `· ${item.author}` : ""}
            </p>
            <p className="mt-2 text-sm text-amber-950 dark:text-amber-100">
              {item.commentContent}
            </p>
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
              原文摘录：{item.originalExcerpt || "（无）"}
            </p>
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
              处理说明：{item.resultSummary}
            </p>
            {item.manualActionNeeded ? (
              <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                建议：{item.manualActionNeeded}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Workspace;
