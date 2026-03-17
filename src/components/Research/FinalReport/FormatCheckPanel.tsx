"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/Internal/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormatCheckPanelProps = {
  profile?: TemplateProfile;
  validation: TemplateValidationResult | null;
  onOpenLibrary: () => void;
  onOpenConfirm: () => void;
  onOpenPreview: () => void;
  onValidate: () => void;
  previewing: boolean;
  validating: boolean;
};

function getIssueIcon(level: TemplateValidationLevel) {
  if (level === "error") return <AlertTriangle className="size-4 text-red-500" />;
  if (level === "warning") return <AlertTriangle className="size-4 text-amber-500" />;
  return <Info className="size-4 text-sky-500" />;
}

function formatMargins(margins: TemplatePageRule["marginsCm"]) {
  return `上 ${margins.top} / 下 ${margins.bottom} / 左 ${margins.left} / 右 ${margins.right} cm`;
}

function FormatCheckPanel(props: FormatCheckPanelProps) {
  const {
    profile,
    validation,
    onOpenLibrary,
    onOpenConfirm,
    onOpenPreview,
    onValidate,
    previewing,
    validating,
  } = props;
  const pendingCount =
    profile?.confirmationItems.filter((item) => !item.resolved).length || 0;

  return (
    <Card className="mt-4 print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>论文格式体检</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onOpenLibrary}>
              模板库
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenConfirm}
              disabled={!profile || pendingCount === 0}
            >
              {pendingCount > 0 ? `待确认 ${pendingCount}` : "无待确认项"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onValidate}
              disabled={!profile || validating}
            >
              {validating ? "体检中..." : "重新体检"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenPreview}
              disabled={!profile || previewing}
            >
              {previewing ? "试预览中..." : "关键页试预览"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <div className="font-medium">{profile.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              模板置信度 {Math.round(profile.confidenceScore * 100)}% · 待确认项{" "}
              {pendingCount} 条
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            当前还没有选择论文模板。你可以先上传真实样稿或空白模板，让系统识别学校格式。
          </div>
        )}

        {validation ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {validation.canExport ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="size-4 text-red-500" />
              )}
              <span>
                {validation.canExport
                  ? "当前模板可用于导出"
                  : "当前模板仍存在阻塞导出的问题"}
              </span>
            </div>
            {validation.issues.length > 0 ? (
              <div className="space-y-2">
                {validation.issues.map((issue, index) => (
                  <div
                    key={`${issue.code}-${index}`}
                    className="flex items-start gap-2 rounded-lg border border-border/60 p-3 text-sm"
                  >
                    {getIssueIcon(issue.level)}
                    <div>
                      <div className="font-medium">{issue.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {issue.code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {validation.preview ? (
              <div className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="font-medium">模板预览</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  版式：{validation.preview.layout.paperSize} · 页边距{" "}
                  {formatMargins(validation.preview.layout.marginsCm)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  已识别结构 {validation.preview.sectionCount} 项 · 图表{" "}
                  {validation.preview.artifactCount} 项
                  {validation.preview.anchorCoverage
                    ? ` · 字段锚点 ${validation.preview.anchorCoverage.captured}/${validation.preview.anchorCoverage.total}`
                    : ""}
                </div>
                {validation.preview.highlights.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {validation.preview.highlights.map((highlight, index) => (
                      <div
                        key={`${highlight.heading}-${index}`}
                        className="rounded-md bg-muted/30 p-2"
                      >
                        <div className="text-xs font-medium">{highlight.heading}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {highlight.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {validation.preview.keyPages?.length ? (
                  <div className="mt-3 space-y-2">
                    {validation.preview.keyPages.map((item) => (
                      <div
                        key={`${item.sectionKey}-${item.pageNumber}`}
                        className="rounded-md border border-border/50 p-2"
                      >
                        <div className="text-xs font-medium">
                          第 {item.pageNumber} 页 · {item.label}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.summary} · 覆盖率 {Math.round(item.coverage * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {validation.detail ? (
              <div className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="font-medium">规范差异与建议</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  当前对照规范：
                  {validation.detail.formatSpecName || validation.detail.formatSpecId}
                </div>
                {validation.detail.differences.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {validation.detail.differences.map((item, index) => (
                      <div
                        key={`${item.key}-${index}`}
                        className="rounded-md bg-muted/30 p-2"
                      >
                        <div className="text-xs font-medium">{item.message}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          期望：{item.expected}
                          {item.actual ? ` · 当前：${item.actual}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-muted-foreground">
                    暂未发现可结构化展示的规范差异。
                  </div>
                )}
                {validation.detail.suggestions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {validation.detail.suggestions.map((item, index) => (
                      <div
                        key={`${item.target}-${index}`}
                        className="rounded-md border border-border/50 p-2"
                      >
                        <div className="text-xs font-medium">{item.target}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.message}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : profile ? (
          <div className="text-sm text-muted-foreground">
            已识别模板，但还没有执行格式体检。
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default FormatCheckPanel;
