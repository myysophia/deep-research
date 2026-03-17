"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/Internal/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormatCheckPanelProps = {
  profile?: TemplateProfile;
  validation: TemplateValidationResult | null;
  onOpenLibrary: () => void;
  onOpenConfirm: () => void;
  onValidate: () => void;
  validating: boolean;
};

function getIssueIcon(level: TemplateValidationLevel) {
  if (level === "error") return <AlertTriangle className="size-4 text-red-500" />;
  if (level === "warning") return <AlertTriangle className="size-4 text-amber-500" />;
  return <Info className="size-4 text-sky-500" />;
}

function FormatCheckPanel(props: FormatCheckPanelProps) {
  const {
    profile,
    validation,
    onOpenLibrary,
    onOpenConfirm,
    onValidate,
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
