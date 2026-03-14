"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDefaultPaperLayoutConfig } from "@/utils/paper";

type PaperLayoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutConfig: PaperLayoutConfig;
  onSave: (layoutConfig: PaperLayoutConfig) => void;
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function PaperLayoutDialog(props: PaperLayoutDialogProps) {
  const { open, onOpenChange, layoutConfig, onSave } = props;
  const [draft, setDraft] = useState<PaperLayoutConfig>(layoutConfig);

  useEffect(() => {
    setDraft(layoutConfig);
  }, [layoutConfig, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>论文排版设置</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>标题字号（pt）</span>
            <Input
              type="number"
              value={draft.titleFontSize}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  titleFontSize: toNumber(event.target.value, current.titleFontSize),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>正文字号（pt）</span>
            <Input
              type="number"
              value={draft.bodyFontSize}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  bodyFontSize: toNumber(event.target.value, current.bodyFontSize),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>标题字体</span>
            <Input
              value={draft.titleFontFamily}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  titleFontFamily: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>正文字体</span>
            <Input
              value={draft.bodyFontFamily}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  bodyFontFamily: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>行间距</span>
            <Input
              type="number"
              step="0.1"
              value={draft.lineSpacing}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  lineSpacing: toNumber(event.target.value, current.lineSpacing),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>字间距（px）</span>
            <Input
              type="number"
              step="0.1"
              value={draft.letterSpacing}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  letterSpacing: toNumber(event.target.value, current.letterSpacing),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>段前距（pt）</span>
            <Input
              type="number"
              value={draft.paragraphSpacingBefore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  paragraphSpacingBefore: toNumber(
                    event.target.value,
                    current.paragraphSpacingBefore
                  ),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>段后距（pt）</span>
            <Input
              type="number"
              value={draft.paragraphSpacingAfter}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  paragraphSpacingAfter: toNumber(
                    event.target.value,
                    current.paragraphSpacingAfter
                  ),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>首行缩进（字符）</span>
            <Input
              type="number"
              value={draft.firstLineIndentChars}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  firstLineIndentChars: toNumber(
                    event.target.value,
                    current.firstLineIndentChars
                  ),
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>页眉左侧</span>
            <Input
              value={draft.headerTextLeft}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  headerTextLeft: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>页眉右侧</span>
            <Input
              value={draft.headerTextRight}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  headerTextRight: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>页脚文本</span>
            <Input
              value={draft.footerText}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  footerText: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2 text-sm">
            <span>上边距（cm）</span>
            <Input
              type="number"
              step="0.1"
              value={draft.pageMargins.top}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  pageMargins: {
                    ...current.pageMargins,
                    top: toNumber(event.target.value, current.pageMargins.top),
                  },
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>右边距（cm）</span>
            <Input
              type="number"
              step="0.1"
              value={draft.pageMargins.right}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  pageMargins: {
                    ...current.pageMargins,
                    right: toNumber(event.target.value, current.pageMargins.right),
                  },
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>下边距（cm）</span>
            <Input
              type="number"
              step="0.1"
              value={draft.pageMargins.bottom}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  pageMargins: {
                    ...current.pageMargins,
                    bottom: toNumber(event.target.value, current.pageMargins.bottom),
                  },
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>左边距（cm）</span>
            <Input
              type="number"
              step="0.1"
              value={draft.pageMargins.left}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  pageMargins: {
                    ...current.pageMargins,
                    left: toNumber(event.target.value, current.pageMargins.left),
                  },
                }))
              }
            />
          </label>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setDraft(createDefaultPaperLayoutConfig())}
          >
            恢复默认
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                onSave(draft);
                onOpenChange(false);
              }}
            >
              应用排版
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PaperLayoutDialog;
