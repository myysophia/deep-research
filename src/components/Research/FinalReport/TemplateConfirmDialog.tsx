"use client";

import { Button } from "@/components/Internal/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplateConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: TemplateProfile;
  onResolve: (
    itemId: string,
    resolution: "confirmed" | "ignored"
  ) => void | Promise<void>;
};

function TemplateConfirmDialog(props: TemplateConfirmDialogProps) {
  const { open, onOpenChange, profile, onResolve } = props;
  const pendingItems =
    profile?.confirmationItems.filter((item) => !item.resolved) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>模板低置信度确认</DialogTitle>
          <DialogDescription>
            这里只处理系统识别不够确定的格式项。你确认后，模板画像和格式体检结果会同步更新。
          </DialogDescription>
        </DialogHeader>

        {profile ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <div className="font-medium">{profile.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              当前还有 {pendingItems.length} 条待确认项
            </div>
          </div>
        ) : null}

        {pendingItems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            当前模板没有待确认项，可以直接继续体检或导出。
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/70 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      识别置信度 {Math.round(item.confidence * 100)}%
                      {item.suggestedValue
                        ? ` · 当前建议：${item.suggestedValue}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        void onResolve(item.id, "confirmed");
                      }}
                    >
                      确认
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void onResolve(item.id, "ignored");
                      }}
                    >
                      忽略
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TemplateConfirmDialog;
