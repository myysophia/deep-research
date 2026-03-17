"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/Internal/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplatePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: TemplateProfile;
  loading: boolean;
  errorMessage: string;
  result: TemplateValidationResult | null;
  onRefresh: () => void;
};

function TemplatePreviewDialog(props: TemplatePreviewDialogProps) {
  const { open, onOpenChange, profile, loading, errorMessage, result, onRefresh } =
    props;
  const preview = result?.preview;
  const detail = result?.detail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>关键页试预览</DialogTitle>
          <DialogDescription>
            导出前先检查关键页结构与规范差异，降低最终 Word 格式返工风险。
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
          <div>
            <div className="font-medium">
              当前模板：{profile?.name || "未选择模板"}
            </div>
            {profile ? (
              <div className="mt-1 text-xs text-muted-foreground">
                置信度 {Math.round(profile.confidenceScore * 100)}%
                {profile.version ? ` · 版本 v${profile.version}` : ""}
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">
                请先在模板库中选择模板，再执行关键页试预览。
              </div>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={!profile || loading}
          >
            {loading ? "加载中..." : "刷新试预览"}
          </Button>
        </div>

        {!profile ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            当前没有可用于试预览的模板。
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-red-300/60 bg-red-50/60 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
            正在生成关键页试预览，请稍候...
          </div>
        ) : null}

        {!loading && profile && !errorMessage && !result ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            尚未获取试预览结果，请点击“刷新试预览”。
          </div>
        ) : null}

        {!loading && result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              {result.canExport ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="size-4 text-red-500" />
              )}
              <span>
                {result.canExport
                  ? "试预览判断：当前模板可导出"
                  : "试预览判断：当前模板仍有阻塞问题"}
              </span>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 p-4">
              <div className="font-medium text-sm">关键页列表</div>
              {preview?.keyPages?.length ? (
                <div className="space-y-2">
                  {preview.keyPages.map((item) => (
                    <div
                      key={`${item.sectionKey}-${item.pageNumber}`}
                      className="rounded-md border border-border/50 p-3"
                    >
                      <div className="text-sm font-medium">
                        第 {item.pageNumber} 页 · {item.label}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.summary}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        覆盖率 {Math.round(item.coverage * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  当前没有可展示的关键页数据，请先检查模板识别结果或重新上传模板。
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 p-4">
              <div className="font-medium text-sm">规范差异与建议</div>

              {detail?.differences?.length ? (
                <div className="space-y-2">
                  {detail.differences.map((item, index) => (
                    <div
                      key={`${item.key}-${index}`}
                      className="rounded-md bg-muted/30 p-3"
                    >
                      <div className="text-sm font-medium">{item.message}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        期望：{item.expected}
                        {item.actual ? ` · 当前：${item.actual}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  暂未发现可结构化展示的差异项。
                </div>
              )}

              {detail?.suggestions?.length ? (
                <div className="space-y-2">
                  {detail.suggestions.map((item, index) => (
                    <div
                      key={`${item.target}-${index}`}
                      className="rounded-md border border-border/50 p-3"
                    >
                      <div className="text-sm font-medium">{item.target}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="size-4 shrink-0" />
                  <span>当前没有额外建议项。</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default TemplatePreviewDialog;
