"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateLibraryItem[];
  profiles: Record<string, TemplateProfile>;
  formatSpecs: FormatSpec[];
  selectedTemplateId: string;
  isUploading: boolean;
  onSelect: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onUpload: (file: File, documentKind: TemplateDocumentKind) => void;
};

type TemplateViewModel = {
  item: TemplateLibraryItem;
  profile?: TemplateProfile;
  specName: string;
  pendingCount: number;
  recommendationScore: number;
  recommendationReasons: string[];
  searchText: string;
};

function buildRecommendation(
  item: TemplateLibraryItem,
  profile: TemplateProfile | undefined
) {
  const pendingCount =
    profile?.confirmationItems.filter((entry) => !entry.resolved).length || 0;
  const headingCoverage = profile?.styleRoles.filter((entry) =>
    entry.role.startsWith("heading-")
  ).length;
  const score = Math.round(
    item.confidenceScore * 100 +
      (item.source === "platform" ? 8 : 0) +
      (profile?.schoolName ? 6 : 0) +
      (pendingCount === 0 ? 6 : Math.max(0, 6 - pendingCount * 2)) +
      Math.min(headingCoverage || 0, 3) * 4
  );

  const reasons: string[] = [];
  if (item.confidenceScore >= 0.9) reasons.push("识别置信度高");
  if (profile?.schoolName) reasons.push(`已识别学校：${profile.schoolName}`);
  if (pendingCount === 0) reasons.push("无需额外确认");
  if ((headingCoverage || 0) >= 2) reasons.push("标题层级覆盖较完整");
  if (item.source === "platform") reasons.push("平台沉淀模板");

  if (reasons.length === 0) {
    reasons.push("结构相对完整，可作为兜底模板");
  }

  return {
    recommendationScore: score,
    recommendationReasons: reasons.slice(0, 3),
  };
}

function renderMetaBadge(content: string) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
      {content}
    </span>
  );
}

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
    onEdit,
    onUpload,
  } = props;
  const [searchValue, setSearchValue] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | TemplateSource>("all");
  const [specFilter, setSpecFilter] = useState<string>("all");

  const templateViewModels = useMemo(() => {
    return templates
      .map((item) => {
        const profile = profiles[item.id];
        const specName =
          formatSpecs.find((spec) => spec.id === item.formatSpecId)?.name ?? "通用规范";
        const pendingCount =
          profile?.confirmationItems.filter((entry) => !entry.resolved).length || 0;
        const recommendation = buildRecommendation(item, profile);

        return {
          item,
          profile,
          specName,
          pendingCount,
          recommendationScore: recommendation.recommendationScore,
          recommendationReasons: recommendation.recommendationReasons,
          searchText: [
            item.name,
            profile?.schoolName,
            specName,
            item.source === "platform" ? "平台模板" : "用户模板",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        } satisfies TemplateViewModel;
      })
      .sort((left, right) => {
        if (right.recommendationScore !== left.recommendationScore) {
          return right.recommendationScore - left.recommendationScore;
        }
        return right.item.updatedAt - left.item.updatedAt;
      });
  }, [formatSpecs, profiles, templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return templateViewModels.filter((entry) => {
      if (sourceFilter !== "all" && entry.item.source !== sourceFilter) {
        return false;
      }
      if (specFilter !== "all" && entry.item.formatSpecId !== specFilter) {
        return false;
      }
      if (normalizedSearch && !entry.searchText.includes(normalizedSearch)) {
        return false;
      }
      return true;
    });
  }, [searchValue, sourceFilter, specFilter, templateViewModels]);

  const recommendedIds = useMemo(() => {
    return new Set(
      filteredTemplates
        .filter((entry) => entry.recommendationScore >= 88)
        .slice(0, 3)
        .map((entry) => entry.item.id)
    );
  }, [filteredTemplates]);

  const groupedTemplates = useMemo(() => {
    return [
      {
        key: "recommended",
        title: "推荐模板",
        description: "优先使用这些模板做正式导出，稳定性更高。",
        items: filteredTemplates.filter((entry) => recommendedIds.has(entry.item.id)),
      },
      {
        key: "platform",
        title: "平台模板",
        description: "平台内置或沉淀的高复用模板。",
        items: filteredTemplates.filter(
          (entry) =>
            entry.item.source === "platform" && !recommendedIds.has(entry.item.id)
        ),
      },
      {
        key: "user",
        title: "我的模板",
        description: "你上传、修正并沉淀下来的模板。",
        items: filteredTemplates.filter(
          (entry) =>
            entry.item.source !== "platform" && !recommendedIds.has(entry.item.id)
        ),
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredTemplates, recommendedIds]);

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

  function renderTemplateCard(entry: TemplateViewModel) {
    const active = entry.item.id === selectedTemplateId;
    const isRecommended = recommendedIds.has(entry.item.id);

    return (
      <div
        key={entry.item.id}
        className={`rounded-xl border p-4 transition-colors ${
          active
            ? "border-primary bg-primary/5"
            : "border-border hover:bg-accent/40"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            className="flex-1 text-left"
            onClick={() => onSelect(entry.item.id)}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="font-medium">{entry.item.name}</div>
                {entry.profile?.version ? (
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    v{entry.profile.version}
                  </span>
                ) : null}
                {isRecommended ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                    推荐优先
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.specName} · {entry.item.thesisType} · {entry.item.educationLevel}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {renderMetaBadge(
                  entry.item.source === "platform" ? "平台模板" : "用户模板"
                )}
                {entry.profile?.schoolName
                  ? renderMetaBadge(entry.profile.schoolName)
                  : null}
                {renderMetaBadge(
                  `置信度 ${Math.round(entry.item.confidenceScore * 100)}%`
                )}
                {renderMetaBadge(`待确认 ${entry.pendingCount}`)}
                {renderMetaBadge(`推荐分 ${entry.recommendationScore}`)}
              </div>
              <div className="text-xs text-muted-foreground">
                推荐理由：{entry.recommendationReasons.join(" · ")}
              </div>
              <div className="text-xs text-muted-foreground">
                最近更新 {new Date(entry.item.updatedAt).toLocaleString("zh-CN")}
              </div>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onEdit(entry.item.id)}
            >
              修正模板
            </Button>
            {active ? (
              <span className="text-xs font-medium text-primary">当前使用</span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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

        <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="搜索模板名、学校名或规范"
          />
          <Select
            value={sourceFilter}
            onValueChange={(value: "all" | TemplateSource) =>
              setSourceFilter(value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="模板来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              <SelectItem value="platform">平台模板</SelectItem>
              <SelectItem value="user-uploaded">用户上传</SelectItem>
              <SelectItem value="user-curated">用户修正</SelectItem>
            </SelectContent>
          </Select>
          <Select value={specFilter} onValueChange={setSpecFilter}>
            <SelectTrigger>
              <SelectValue placeholder="格式规范" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部规范</SelectItem>
              {formatSpecs.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchValue("");
              setSourceFilter("all");
              setSpecFilter("all");
            }}
          >
            重置筛选
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              还没有可复用模板，先上传一份高校样稿或空白模板。
            </CardContent>
          </Card>
        ) : groupedTemplates.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              当前筛选条件下没有模板，可尝试清空搜索词或切换来源/规范。
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {groupedTemplates.map((group) => (
              <div key={group.key} className="space-y-3">
                <div>
                  <div className="text-sm font-medium">{group.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.description}
                  </div>
                </div>
                <div className="grid gap-3">
                  {group.items.map((entry) => renderTemplateCard(entry))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TemplateLibraryDialog;
