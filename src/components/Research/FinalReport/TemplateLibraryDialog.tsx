"use client";

import UploadWrapper from "@/components/Internal/UploadWrapper";
import { Button } from "@/components/Internal/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

type TemplateLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateLibraryItem[];
  profiles: Record<string, TemplateProfile>;
  formatSpecs: FormatSpec[];
  selectedTemplateId: string;
  isUploading: boolean;
  onSelect: (templateId: string) => void;
  onUpload: (file: File, documentKind: TemplateDocumentKind) => void;
};

function TemplateLibraryDialog(props: TemplateLibraryDialogProps) {
  const {
    open,
    onOpenChange,
    templates,
    profiles,
    formatSpecs,
    selectedTemplateId,
    isUploading,
    onSelect,
    onUpload,
  } = props;

  function renderUploadButton(
    label: string,
    documentKind: TemplateDocumentKind,
    description: string
  ) {
    return (
      <UploadWrapper
        accept=".docx,.txt,.md"
        onChange={(files) => {
          const file = files?.[0];
          if (!file) return;
          onUpload(file, documentKind);
        }}
      >
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          className="w-full justify-start"
        >
          <span>{label}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {description}
          </span>
        </Button>
      </UploadWrapper>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>论文模板库</DialogTitle>
          <DialogDescription>
            上传学校空白模板或完整样稿，系统会自动识别格式并沉淀为可复用模板。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {renderUploadButton("上传完整样稿", "sample-paper", "推荐优先使用")}
          {renderUploadButton("上传空白模板", "blank-template", "适合学校下发模板")}
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">我的模板</div>
          {templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                还没有可复用模板，先上传一份高校样稿或空白模板。
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {templates.map((item) => {
                const active = item.id === selectedTemplateId;
                const profile = profiles[item.id];
                const pendingCount =
                  profile?.confirmationItems.filter((entry) => !entry.resolved)
                    .length || 0;
                const specName =
                  formatSpecs.find((spec) => spec.id === item.formatSpecId)
                    ?.name ?? "通用规范";
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/40"
                    }`}
                    onClick={() => onSelect(item.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {specName} · {item.thesisType} · {item.educationLevel}
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                            {item.source === "platform" ? "平台模板" : "用户模板"}
                          </span>
                          <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                            置信度 {Math.round(item.confidenceScore * 100)}%
                          </span>
                          <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                            待确认 {pendingCount}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          最近更新{" "}
                          {new Date(item.updatedAt).toLocaleString("zh-CN")}
                        </div>
                      </div>
                      {active ? (
                        <span className="text-xs font-medium text-primary">
                          当前使用
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateLibraryDialog;
