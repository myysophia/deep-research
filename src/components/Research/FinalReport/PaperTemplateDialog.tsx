"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDefaultThesisTemplateMeta } from "@/utils/paper";

type PaperTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateMeta: ThesisTemplateMeta;
  onSave: (templateMeta: ThesisTemplateMeta) => void;
};

function PaperTemplateDialog(props: PaperTemplateDialogProps) {
  const { open, onOpenChange, templateMeta, onSave } = props;
  const [draft, setDraft] = useState<ThesisTemplateMeta>(templateMeta);

  useEffect(() => {
    setDraft({
      ...createDefaultThesisTemplateMeta(),
      ...templateMeta,
    });
  }, [templateMeta, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>论文模板信息</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>副标题</span>
            <Input
              value={draft.subtitle}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  subtitle: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>学院</span>
            <Input
              value={draft.college}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  college: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>专业</span>
            <Input
              value={draft.major}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  major: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>班级</span>
            <Input
              value={draft.className}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  className: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>学生姓名</span>
            <Input
              value={draft.studentName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  studentName: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>学号</span>
            <Input
              value={draft.studentId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  studentId: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>指导教师</span>
            <Input
              value={draft.advisor}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  advisor: event.target.value,
                }))
              }
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>完成日期</span>
            <Input
              placeholder="例如：2026年3月"
              value={draft.completionDate}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  completionDate: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <label className="space-y-2 text-sm block">
          <span>致谢</span>
          <Textarea
            rows={6}
            value={draft.acknowledgements}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                acknowledgements: event.target.value,
              }))
            }
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PaperTemplateDialog;
