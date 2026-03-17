"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Internal/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TemplateVersionHistoryItem = {
  version: number;
  updatedAt: number;
  revisionNote?: string;
};

type TemplateEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: TemplateProfile;
  formatSpecs: FormatSpec[];
  history: TemplateVersionHistoryItem[];
  saving: boolean;
  onSave: (fields: TemplateProfileEditableFields) => void | Promise<void>;
};

const anchorFieldOptions: Array<{
  key: TemplateFieldAnchor["key"];
  label: string;
}> = [
  { key: "title", label: "论文题目" },
  { key: "subtitle", label: "副标题" },
  { key: "college", label: "学院" },
  { key: "major", label: "专业" },
  { key: "className", label: "班级" },
  { key: "studentName", label: "学生姓名" },
  { key: "studentId", label: "学号" },
  { key: "advisor", label: "指导教师" },
  { key: "completionDate", label: "完成日期" },
];

const sectionLabelMap: Record<TemplateSectionKey, string> = {
  cover: "封面",
  declaration: "独创性声明",
  authorization: "授权书",
  "abstract-zh": "中文摘要",
  "abstract-en": "英文摘要",
  toc: "目录",
  body: "正文",
  references: "参考文献",
  acknowledgements: "致谢",
  appendix: "附录",
};

function createDraft(profile?: TemplateProfile): TemplateProfileEditableFields | null {
  if (!profile) return null;

  return {
    name: profile.name,
    schoolName: profile.schoolName || "",
    formatSpecId: profile.formatSpecId,
    pageRule: {
      headerTextLeft: profile.pageRule.headerTextLeft || "",
      headerTextRight: profile.pageRule.headerTextRight || "",
      footerText: profile.pageRule.footerText || "",
      pageNumberPosition: profile.pageRule.pageNumberPosition || "center",
    },
    sections: profile.sections.map((item) => ({
      key: item.key,
      detected: item.detected,
      confidence: item.confidence,
      startAnchorText: item.startAnchorText || "",
    })),
    fieldAnchors: profile.fieldAnchors.map((item) => ({ ...item })),
    revisionNote: profile.revisionNote || "",
    tags: profile.tags || [],
  };
}

function TemplateEditDialog(props: TemplateEditDialogProps) {
  const { open, onOpenChange, profile, formatSpecs, history, saving, onSave } = props;
  const [draft, setDraft] = useState<TemplateProfileEditableFields | null>(null);
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    const nextDraft = createDraft(profile);
    setDraft(nextDraft);
    setTagsText(nextDraft?.tags?.join(", ") || "");
  }, [profile, open]);

  const missingAnchorOptions = useMemo(() => {
    if (!draft) return anchorFieldOptions;
    const existing = new Set(draft.fieldAnchors.map((item) => item.key));
    return anchorFieldOptions.filter((item) => !existing.has(item.key));
  }, [draft]);

  if (!draft) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>模板修正</DialogTitle>
            <DialogDescription>当前没有可编辑的模板。</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>模板修正</DialogTitle>
          <DialogDescription>
            修正模板画像中的关键信息，保存后会生成新的模板版本，并重新执行格式体检。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="text-sm font-medium">基础信息</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span>模板名称</span>
                  <Input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              name: event.target.value,
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>学校名称</span>
                  <Input
                    value={draft.schoolName || ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              schoolName: event.target.value,
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>适用规范</span>
                  <Select
                    value={draft.formatSpecId}
                    onValueChange={(value) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              formatSpecId: value,
                            }
                          : current
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择格式规范" />
                    </SelectTrigger>
                    <SelectContent>
                      {formatSpecs.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-2 text-sm">
                  <span>标签</span>
                  <Input
                    placeholder="例如：本科, 商学院, 毕业论文"
                    value={tagsText}
                    onChange={(event) => setTagsText(event.target.value)}
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm block">
                <span>修订说明</span>
                <Textarea
                  rows={3}
                  placeholder="例如：修正目录识别、调整页脚与页码位置"
                  value={draft.revisionNote || ""}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            revisionNote: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </label>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-medium">页眉页脚与页码</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span>页眉左侧</span>
                  <Input
                    value={draft.pageRule.headerTextLeft || ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              pageRule: {
                                ...current.pageRule,
                                headerTextLeft: event.target.value,
                              },
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>页眉右侧</span>
                  <Input
                    value={draft.pageRule.headerTextRight || ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              pageRule: {
                                ...current.pageRule,
                                headerTextRight: event.target.value,
                              },
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>页脚文本</span>
                  <Input
                    value={draft.pageRule.footerText || ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              pageRule: {
                                ...current.pageRule,
                                footerText: event.target.value,
                              },
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>页码位置</span>
                  <Select
                    value={draft.pageRule.pageNumberPosition || "center"}
                    onValueChange={(value: "left" | "center" | "right") =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              pageRule: {
                                ...current.pageRule,
                                pageNumberPosition: value,
                              },
                            }
                          : current
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择页码位置" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">左侧</SelectItem>
                      <SelectItem value="center">居中</SelectItem>
                      <SelectItem value="right">右侧</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-medium">章节识别修正</div>
              <div className="space-y-3">
                {draft.sections.map((section, index) => (
                  <div
                    key={section.key}
                    className="rounded-lg border border-border/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          {sectionLabelMap[section.key] || section.key}
                        </div>
                        <div className="text-xs text-muted-foreground">{section.key}</div>
                      </div>
                      <Button
                        type="button"
                        variant={section.detected ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  sections: current.sections.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          detected: !item.detected,
                                        }
                                      : item
                                  ),
                                }
                              : current
                          )
                        }
                      >
                        {section.detected ? "已识别" : "未识别"}
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span>置信度</span>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          value={section.confidence}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    sections: current.sections.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            confidence: Number(event.target.value || 0),
                                          }
                                        : item
                                    ),
                                  }
                                : current
                            )
                          }
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span>起始锚点</span>
                        <Input
                          value={section.startAnchorText || ""}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    sections: current.sections.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            startAnchorText: event.target.value,
                                          }
                                        : item
                                    ),
                                  }
                                : current
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">字段锚点修正</div>
                {missingAnchorOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {missingAnchorOptions.slice(0, 4).map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  fieldAnchors: [
                                    ...current.fieldAnchors,
                                    {
                                      key: item.key,
                                      label: item.label,
                                      anchorText: "",
                                      confidence: 0.6,
                                    },
                                  ],
                                }
                              : current
                          )
                        }
                      >
                        添加{item.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="space-y-3">
                {draft.fieldAnchors.map((anchor, index) => (
                  <div
                    key={`${anchor.key}-${index}`}
                    className="rounded-lg border border-border/70 p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_120px]">
                      <div className="text-sm">
                        <div className="font-medium">{anchor.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {anchor.key}
                        </div>
                      </div>
                      <label className="space-y-2 text-sm">
                        <span>锚点文本</span>
                        <Input
                          value={anchor.anchorText}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    fieldAnchors: current.fieldAnchors.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            anchorText: event.target.value,
                                          }
                                        : item
                                    ),
                                  }
                                : current
                            )
                          }
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span>置信度</span>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          value={anchor.confidence}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    fieldAnchors: current.fieldAnchors.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            confidence: Number(event.target.value || 0),
                                          }
                                        : item
                                    ),
                                  }
                                : current
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="text-sm font-medium">版本历史</div>
            {profile ? (
              <div className="rounded-lg border border-border/60 bg-background p-3 text-xs">
                <div>当前版本 v{profile.version || 1}</div>
                <div className="mt-1 text-muted-foreground">
                  最近更新 {new Date(profile.updatedAt).toLocaleString("zh-CN")}
                </div>
              </div>
            ) : null}
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={`${item.version}-${item.updatedAt}`}
                    className="rounded-lg border border-border/60 bg-background p-3 text-xs"
                  >
                    <div className="font-medium">v{item.version}</div>
                    <div className="mt-1 text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString("zh-CN")}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {item.revisionNote || "无修订说明"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                当前还没有历史版本，保存后会自动沉淀版本记录。
              </div>
            )}
          </aside>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={saving || !draft.name.trim()}
            onClick={() => {
              void onSave({
                ...draft,
                name: draft.name.trim(),
                schoolName: draft.schoolName?.trim(),
                revisionNote: draft.revisionNote?.trim(),
                tags: tagsText
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
                fieldAnchors: draft.fieldAnchors.filter(
                  (item) => item.anchorText.trim() || item.confidence > 0
                ),
              });
            }}
          >
            {saving ? "保存中..." : "保存模板修正"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateEditDialog;
