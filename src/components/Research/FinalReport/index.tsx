"use client";
import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileText,
  FolderOpen,
  Signature,
  LoaderCircle,
  NotebookText,
  Waypoints,
  FileSpreadsheet,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/Internal/Button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import useAccurateTimer from "@/hooks/useAccurateTimer";
import useDeepResearch from "@/hooks/useDeepResearch";
import useKnowledge from "@/hooks/useKnowledge";
import useSubmitShortcut from "@/hooks/useSubmitShortcut";
import { useTaskStore } from "@/store/task";
import { useKnowledgeStore } from "@/store/knowledge";
import { useSettingStore } from "@/store/setting";
import { useTemplateStore } from "@/store/template";
import { parseDeepResearchPromptOverrides } from "@/constants/prompts";
import { getSystemPrompt } from "@/utils/deep-research/prompts";
import { downloadBlob, downloadFile } from "@/utils/file";
import {
  derivePaperDocument,
  generatePaperArtifacts,
  preparePaperDocumentForExport,
  serializePaperDocumentToMarkdown,
} from "@/utils/paper";
import { applyTemplateProfileToPaperDocument } from "@/utils/thesis-export/assemble";

const MagicDown = dynamic(() => import("@/components/MagicDown"));
const Artifact = dynamic(() => import("@/components/Artifact"));
const KnowledgeGraph = dynamic(() => import("./KnowledgeGraph"));
const PaperPreview = dynamic(() => import("./PaperPreview"));
const PaperLayoutDialog = dynamic(() => import("./PaperLayoutDialog"));
const PaperTemplateDialog = dynamic(() => import("./PaperTemplateDialog"));
const TemplateLibraryDialog = dynamic(() => import("./TemplateLibraryDialog"));
const FormatCheckPanel = dynamic(() => import("./FormatCheckPanel"));
const TemplateConfirmDialog = dynamic(() => import("./TemplateConfirmDialog"));
const TemplateEditDialog = dynamic(() => import("./TemplateEditDialog"));

const formSchema = z.object({
  requirement: z.string().optional(),
});

function FinalReport() {
  const { t } = useTranslation();
  const taskStore = useTaskStore();
  const { deepResearchPromptOverrides } = useSettingStore();
  const { status, writeFinalReport } = useDeepResearch();
  const { generateId } = useKnowledge();
  const {
    formattedTime,
    start: accurateTimerStart,
    stop: accurateTimerStop,
  } = useAccurateTimer();
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [openKnowledgeGraph, setOpenKnowledgeGraph] = useState<boolean>(false);
  const [openLayoutDialog, setOpenLayoutDialog] = useState<boolean>(false);
  const [openTemplateDialog, setOpenTemplateDialog] = useState<boolean>(false);
  const [openTemplateLibraryDialog, setOpenTemplateLibraryDialog] =
    useState<boolean>(false);
  const [openTemplateConfirmDialog, setOpenTemplateConfirmDialog] =
    useState<boolean>(false);
  const [openTemplateEditDialog, setOpenTemplateEditDialog] =
    useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string>("");
  const [templateHistory, setTemplateHistory] = useState<
    Array<{ version: number; updatedAt: number; revisionNote?: string }>
  >([]);
  const [isSavingTemplateEdit, setIsSavingTemplateEdit] =
    useState<boolean>(false);
  const [isIdentifyingTemplate, setIsIdentifyingTemplate] =
    useState<boolean>(false);
  const [isValidatingTemplate, setIsValidatingTemplate] =
    useState<boolean>(false);
  const templateLibrary = useTemplateStore((state) => state.library);
  const templateProfiles = useTemplateStore((state) => state.profiles);
  const formatSpecs = useTemplateStore((state) => state.formatSpecs);
  const selectedTemplateId = useTemplateStore((state) => state.selectedTemplateId);
  const hydrateTemplateLibrary = useTemplateStore((state) => state.hydrateLibrary);
  const latestTemplateValidation = useTemplateStore(
    (state) => state.latestValidation
  );
  const saveTemplateProfile = useTemplateStore((state) => state.saveProfile);
  const applyProfileReplacement = useTemplateStore(
    (state) => state.applyProfileReplacement
  );
  const selectTemplate = useTemplateStore((state) => state.selectTemplate);
  const updateCurrentTemplateEditableFields = useTemplateStore(
    (state) => state.updateCurrentTemplateEditableFields
  );
  const setTemplateValidation = useTemplateStore((state) => state.setValidation);
  const resolveConfirmationItem = useTemplateStore(
    (state) => state.resolveConfirmationItem
  );
  const promptOverrides = useMemo(() => {
    try {
      return parseDeepResearchPromptOverrides(deepResearchPromptOverrides);
    } catch {
      return {};
    }
  }, [deepResearchPromptOverrides]);
  const taskFinished = useMemo(() => {
    const unfinishedTasks = taskStore.tasks.filter(
      (task) => task.state !== "completed"
    );
    return taskStore.tasks.length > 0 && unfinishedTasks.length === 0;
  }, [taskStore.tasks]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requirement: taskStore.requirement,
    },
  });
  const handleFinalReportSubmitShortcut = useSubmitShortcut(() => {
    void form.handleSubmit(handleSubmit)();
  });
  const selectedTemplateProfile = useMemo(() => {
    if (!selectedTemplateId) return undefined;
    return templateProfiles[selectedTemplateId];
  }, [selectedTemplateId, templateProfiles]);
  const editingTemplateProfile = useMemo(() => {
    if (!editingTemplateId) return undefined;
    return templateProfiles[editingTemplateId];
  }, [editingTemplateId, templateProfiles]);
  const previewPaperDocument = useMemo(
    () =>
      applyTemplateProfileToPaperDocument(
        taskStore.paperDocument,
        selectedTemplateProfile
      ),
    [selectedTemplateProfile, taskStore.paperDocument]
  );

  const persistTemplateProfile = useCallback(async (profile: TemplateProfile) => {
    const response = await fetch("/api/template/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || "模板保存失败");
    }

    return payload.data as TemplateProfile;
  }, []);

  const fetchTemplateDetail = useCallback(
    async (templateId: string) => {
      const cachedProfile = useTemplateStore.getState().profiles[templateId];
      if (cachedProfile) {
        return cachedProfile;
      }

      const response = await fetch(
        `/api/template/detail/${encodeURIComponent(templateId)}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "模板详情加载失败");
      }

      const profile = payload.data as TemplateProfile;
      saveTemplateProfile(profile);
      return profile;
    },
    [saveTemplateProfile]
  );

  const loadTemplateLibrary = useCallback(async () => {
    const response = await fetch("/api/template/list");
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || "模板库加载失败");
    }

    const items = (payload.data?.items || []) as TemplateLibraryItem[];
    hydrateTemplateLibrary(items);
    return items;
  }, [hydrateTemplateLibrary]);

  const loadTemplateHistory = useCallback(async (templateId: string) => {
    const response = await fetch(
      `/api/template/history/${encodeURIComponent(templateId)}`
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || "模板历史加载失败");
    }

    const history = (payload.data?.history || []) as Array<{
      version: number;
      updatedAt: number;
      revisionNote?: string;
    }>;
    setTemplateHistory(history);
    return history;
  }, []);

  const runTemplateValidation = useCallback(
    async (profile = selectedTemplateProfile) => {
      if (!profile) return;

      try {
        setIsValidatingTemplate(true);
        const response = await fetch("/api/template/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile,
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error?.message || "模板体检失败");
        }

        setTemplateValidation(payload.data);
        return payload.data as TemplateValidationResult;
      } finally {
        setIsValidatingTemplate(false);
      }
    },
    [selectedTemplateProfile, setTemplateValidation]
  );

  async function handleUploadTemplate(
    file: File,
    documentKind: TemplateDocumentKind
  ) {
    try {
      setIsIdentifyingTemplate(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentKind", documentKind);

      const response = await fetch("/api/template/identify", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "模板识别失败");
      }

      const identifiedProfile = payload.data.profile as TemplateProfile;
      const savedProfile = await persistTemplateProfile(identifiedProfile);
      saveTemplateProfile(savedProfile);
      await runTemplateValidation(savedProfile);
      toast.success(
        `模板识别完成：${savedProfile.name}（置信度 ${Math.round(
          savedProfile.confidenceScore * 100
        )}%）`
      );
      setOpenTemplateLibraryDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "模板识别失败");
    } finally {
      setIsIdentifyingTemplate(false);
    }
  }

  async function handleSelectTemplate(templateId: string) {
    selectTemplate(templateId);
    const profile = await fetchTemplateDetail(templateId);
    if (!profile) return;
    await runTemplateValidation(profile);
    setOpenTemplateLibraryDialog(false);
  }

  async function handleResolveConfirmation(
    itemId: string,
    resolution: "confirmed" | "ignored"
  ) {
    if (!selectedTemplateId) return;
    resolveConfirmationItem(selectedTemplateId, itemId, resolution);
    const nextProfile = useTemplateStore.getState().profiles[selectedTemplateId];
    if (nextProfile) {
      await persistTemplateProfile(nextProfile);
      await runTemplateValidation(nextProfile);
    }
  }

  async function handleOpenTemplateEdit(templateId: string) {
    try {
      selectTemplate(templateId);
      await fetchTemplateDetail(templateId);
      await loadTemplateHistory(templateId);
      setEditingTemplateId(templateId);
      setOpenTemplateEditDialog(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "模板详情加载失败");
    }
  }

  async function handleSaveTemplateEdit(fields: TemplateProfileEditableFields) {
    if (!editingTemplateId) return;

    try {
      setIsSavingTemplateEdit(true);
      if (selectedTemplateId !== editingTemplateId) {
        selectTemplate(editingTemplateId);
      }

      updateCurrentTemplateEditableFields(fields);
      const draftProfile = useTemplateStore.getState().profiles[editingTemplateId];
      if (!draftProfile) {
        throw new Error("模板修正草稿生成失败");
      }

      const savedProfile = await persistTemplateProfile(draftProfile);
      applyProfileReplacement(savedProfile);
      await loadTemplateHistory(editingTemplateId);
      await runTemplateValidation(savedProfile);
      setOpenTemplateEditDialog(false);
      toast.success("模板修正已保存，并已生成新版本");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "模板修正保存失败");
    } finally {
      setIsSavingTemplateEdit(false);
    }
  }

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    const { setRequirement } = useTaskStore.getState();
    try {
      accurateTimerStart();
      setIsWriting(true);
      if (values.requirement) setRequirement(values.requirement);
      await writeFinalReport();
    } finally {
      setIsWriting(false);
      accurateTimerStop();
    }
  }

  function getFinakReportContent() {
    const { finalReport, resources, sources, paperDocument, title } =
      useTaskStore.getState();
    const normalizedPaperDocument =
      paperDocument.sections.length > 0
        ? paperDocument
        : derivePaperDocument({
            title,
            markdown: finalReport,
            sources,
            artifacts: paperDocument.artifacts,
            layoutConfig: paperDocument.layoutConfig,
            templateMeta: paperDocument.templateMeta,
          });

    return [
      serializePaperDocumentToMarkdown(normalizedPaperDocument),
      resources.length > 0
        ? [
            "---",
            `## ${t("research.finalReport.localResearchedInfor", {
              total: resources.length,
            })}`,
            `${resources
              .map((source, idx) => `${idx + 1}. ${source.name}`)
              .join("\n")}`,
          ].join("\n")
        : "",
    ].join("\n\n");
  }

  function addToKnowledgeBase() {
    const { title } = useTaskStore.getState();
    const { save } = useKnowledgeStore.getState();
    const currentTime = Date.now();
    save({
      id: generateId("knowledge"),
      title,
      content: getFinakReportContent(),
      type: "knowledge",
      createdAt: currentTime,
      updatedAt: currentTime,
    });
    toast.message(t("research.common.addToKnowledgeBaseTip"));
  }

  function handleDownloadMarkdown() {
    downloadFile(
      getFinakReportContent(),
      `${taskStore.title}.md`,
      "text/markdown;charset=utf-8"
    );
  }

  async function renderMermaidArtifacts(artifacts: PaperArtifact[]) {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });

    return await Promise.all(
      artifacts.map(async (artifact) => {
        if (artifact.type !== "mermaid") return artifact;
        try {
          const result = await mermaid.render(
            `paper-export-${artifact.id}-${Date.now()}`,
            artifact.content
          );
          return {
            ...artifact,
            renderedSvg: result.svg,
          };
        } catch {
          return artifact;
        }
      })
    );
  }

  async function handleDownloadWord() {
    try {
      setIsExportingDocx(true);
      const currentTemplateValidation =
        selectedTemplateProfile &&
        (latestTemplateValidation ||
          (await runTemplateValidation(selectedTemplateProfile)));

      if (
        selectedTemplateProfile &&
        currentTemplateValidation &&
        !currentTemplateValidation.canExport
      ) {
        throw new Error("当前模板体检未通过，请先处理阻塞问题后再导出。");
      }
      const paperDocument =
        taskStore.paperDocument.sections.length > 0
          ? taskStore.paperDocument
          : derivePaperDocument({
              title: taskStore.title,
              markdown: taskStore.finalReport,
              sources: taskStore.sources,
              artifacts: taskStore.paperDocument.artifacts,
              layoutConfig: taskStore.paperDocument.layoutConfig,
              templateMeta: taskStore.paperDocument.templateMeta,
            });
      const { paperDocument: exportPaperDocument, warnings } =
        preparePaperDocumentForExport(paperDocument, taskStore.sources);
      const validationErrors: string[] = [];
      const { templateMeta } = exportPaperDocument;

      if (!exportPaperDocument.title.trim()) validationErrors.push("论文题目未填写");
      if (!templateMeta.college.trim()) validationErrors.push("学院未填写");
      if (!templateMeta.major.trim()) validationErrors.push("专业未填写");
      if (!templateMeta.className.trim()) validationErrors.push("班级未填写");
      if (!templateMeta.studentName.trim()) validationErrors.push("学生姓名未填写");
      if (!templateMeta.studentId.trim()) validationErrors.push("学号未填写");
      if (!templateMeta.advisor.trim()) validationErrors.push("指导教师未填写");
      if (!exportPaperDocument.abstractZh.trim()) validationErrors.push("中文摘要未完成");
      if (!exportPaperDocument.abstractEn.trim()) validationErrors.push("英文摘要未完成");

      if (validationErrors.length > 0) {
        throw new Error(
          `论文模板信息不完整：${validationErrors.slice(0, 6).join("、")}`
        );
      }
      if (warnings.length > 0) {
        toast.warning(warnings.join("；"));
      }

      const artifacts = await renderMermaidArtifacts(exportPaperDocument.artifacts);
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paperDocument: {
            ...exportPaperDocument,
            artifacts,
          },
          templateProfile: selectedTemplateProfile,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "DOCX 导出失败");
      }

      const arrayBuffer = await response.arrayBuffer();
      downloadBlob(
        arrayBuffer,
        `${taskStore.title || "论文"}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      toast.success("DOCX 导出成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "DOCX 导出失败");
    } finally {
      setIsExportingDocx(false);
    }
  }

  async function handleDownloadPDF() {
    const originalTitle = document.title;
    document.title = taskStore.title;
    window.print();
    document.title = originalTitle;
  }

  useEffect(() => {
    form.setValue("requirement", taskStore.requirement);
  }, [taskStore.requirement, form]);

  useEffect(() => {
    void loadTemplateLibrary().catch((error) => {
      toast.error(error instanceof Error ? error.message : "模板库加载失败");
    });
  }, [loadTemplateLibrary]);

  useEffect(() => {
    if (!selectedTemplateId || selectedTemplateProfile) {
      return;
    }

    void fetchTemplateDetail(selectedTemplateId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "模板详情加载失败");
    });
  }, [fetchTemplateDetail, selectedTemplateId, selectedTemplateProfile]);

  useEffect(() => {
    if (!selectedTemplateProfile) {
      setTemplateValidation(null);
      return;
    }

    void runTemplateValidation(selectedTemplateProfile);
  }, [runTemplateValidation, selectedTemplateProfile, setTemplateValidation]);

  useEffect(() => {
    if (taskStore.finalReport && taskStore.paperDocument.sections.length === 0) {
      taskStore.updatePaperDocument(
        derivePaperDocument({
          title: taskStore.title,
          markdown: taskStore.finalReport,
          sources: taskStore.sources,
          artifacts: taskStore.paperDocument.artifacts,
          layoutConfig: taskStore.paperDocument.layoutConfig,
        })
      );
    }
  }, [
    taskStore,
    taskStore.finalReport,
    taskStore.paperDocument.artifacts,
    taskStore.paperDocument.layoutConfig,
    taskStore.paperDocument.sections.length,
    taskStore.sources,
    taskStore.title,
  ]);

  function handleRegenerateArtifacts() {
    const paperDocument =
      taskStore.paperDocument.sections.length > 0
        ? taskStore.paperDocument
        : derivePaperDocument({
            title: taskStore.title,
            markdown: taskStore.finalReport,
            sources: taskStore.sources,
            layoutConfig: taskStore.paperDocument.layoutConfig,
          });
    taskStore.setPaperArtifacts(
      generatePaperArtifacts({
        title: paperDocument.title,
        tasks: taskStore.tasks,
        paperDocument,
      })
    );
    toast.success("图表已重新生成");
  }

  return (
    <>
      <section className="p-4 border rounded-md mt-4 print:border-none">
        <h3 className="font-semibold text-lg border-b mb-2 leading-10 print:hidden">
          {t("research.finalReport.title")}
        </h3>
        {taskStore.finalReport !== "" ? (
          <article>
            <MagicDown
              className="min-h-72"
              value={taskStore.finalReport}
              onChange={(value) => taskStore.updateFinalReport(value)}
              renderView={() => (
                <PaperPreview paperDocument={previewPaperDocument} />
              )}
              tools={
                <>
                  <div className="px-1">
                    <Separator className="dark:bg-slate-700" />
                  </div>
                  <Artifact
                    value={taskStore.finalReport}
                    systemInstruction={getSystemPrompt(promptOverrides)}
                    onChange={taskStore.updateFinalReport}
                    buttonClassName="float-menu-button"
                    dropdownMenuSideOffset={8}
                    tooltipSideOffset={8}
                  />
                  <div className="px-1">
                    <Separator className="dark:bg-slate-700" />
                  </div>
                  <Button
                    className="float-menu-button"
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={t("knowledgeGraph.action")}
                    side="left"
                    sideoffset={8}
                    onClick={() => setOpenKnowledgeGraph(true)}
                  >
                    <Waypoints />
                  </Button>
                  <Button
                    className="float-menu-button"
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={t("research.common.addToKnowledgeBase")}
                    side="left"
                    sideoffset={8}
                    onClick={() => addToKnowledgeBase()}
                  >
                    <NotebookText />
                  </Button>
                  <Button
                    className="float-menu-button"
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="模板库"
                    side="left"
                    sideoffset={8}
                    onClick={() => setOpenTemplateLibraryDialog(true)}
                  >
                    <FolderOpen />
                  </Button>
                  <Button
                    className="float-menu-button"
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="模板信息"
                    side="left"
                    sideoffset={8}
                    onClick={() => setOpenTemplateDialog(true)}
                  >
                    <FileText />
                  </Button>
                  <Button
                    className="float-menu-button"
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="一键排版"
                    side="left"
                    sideoffset={8}
                    onClick={() => setOpenLayoutDialog(true)}
                  >
                    <Settings2 />
                  </Button>
                  <Button
                    className="float-menu-button"
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="生成图表"
                    side="left"
                    sideoffset={8}
                    onClick={() => handleRegenerateArtifacts()}
                  >
                    <Sparkles />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="float-menu-button"
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={t("research.common.export")}
                        side="left"
                        sideoffset={8}
                      >
                        <Download />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="print:hidden"
                      side="left"
                      sideOffset={8}
                    >
                      <DropdownMenuItem
                        onClick={() => handleDownloadMarkdown()}
                      >
                        <FileText />
                        <span>Markdown</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadWord()}>
                        <FileSpreadsheet />
                        <span>
                          {isExportingDocx ? "导出 DOCX 中..." : "DOCX"}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="max-md:hidden"
                        onClick={() => handleDownloadPDF()}
                      >
                        <Signature />
                        <span>PDF</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              }
            />
            {taskStore.resources.length > 0 ? (
              <div className="prose prose-slate dark:prose-invert">
                <hr className="my-6" />
                <h2>
                  {t("research.finalReport.localResearchedInfor", {
                    total: taskStore.resources.length,
                  })}
                </h2>
                <ul>
                  {taskStore.resources.map((resource) => {
                    return <li key={resource.id}>{resource.name}</li>;
                  })}
                </ul>
              </div>
            ) : null}
            {taskStore.sources?.length > 0 ? (
              <div className="prose prose-slate dark:prose-invert">
                <hr className="my-6" />
                <h2>
                  {t("research.finalReport.researchedInfor", {
                    total: taskStore.sources.length,
                  })}
                </h2>
                <ol>
                  {taskStore.sources.map((source, idx) => {
                    return (
                      <li key={idx}>
                        <a href={source.url} target="_blank">
                          {source.title || source.url}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </article>
        ) : null}
        {taskFinished ? (
          <Form {...form}>
            <form
              className="mt-4 border-t pt-4 print:hidden"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <FormField
                control={form.control}
                name="requirement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-2 font-semibold">
                      {t("research.finalReport.writingRequirementLabel")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={t(
                          "research.finalReport.writingRequirementPlaceholder"
                        )}
                        disabled={isWriting}
                        onKeyDown={handleFinalReportSubmitShortcut}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t("research.common.submitShortcut")}
                    </p>
                  </FormItem>
                )}
              />
              <Button
                className="w-full mt-4"
                type="submit"
                disabled={isWriting}
              >
                {isWriting ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    <span>{status}</span>
                    <small className="font-mono">{formattedTime}</small>
                  </>
                ) : taskStore.finalReport === "" ? (
                  t("research.common.writeReport")
                ) : (
                  t("research.common.rewriteReport")
                )}
              </Button>
            </form>
          </Form>
        ) : null}
        {taskStore.finalReport === "" && !taskFinished ? (
          <div>{t("research.finalReport.emptyTip")}</div>
        ) : null}
        <FormatCheckPanel
          profile={selectedTemplateProfile}
          validation={latestTemplateValidation}
          onOpenLibrary={() => setOpenTemplateLibraryDialog(true)}
          onOpenConfirm={() => setOpenTemplateConfirmDialog(true)}
          onValidate={() => {
            void runTemplateValidation();
          }}
          validating={isValidatingTemplate}
        />
      </section>
      <PaperLayoutDialog
        open={openLayoutDialog}
        onOpenChange={setOpenLayoutDialog}
        layoutConfig={taskStore.paperDocument.layoutConfig}
        onSave={(layoutConfig) => taskStore.updatePaperLayoutConfig(layoutConfig)}
      />
      <PaperTemplateDialog
        open={openTemplateDialog}
        onOpenChange={setOpenTemplateDialog}
        templateMeta={taskStore.paperDocument.templateMeta}
        onSave={(templateMeta) => taskStore.updatePaperTemplateMeta(templateMeta)}
      />
      <TemplateLibraryDialog
        open={openTemplateLibraryDialog}
        onOpenChange={setOpenTemplateLibraryDialog}
        templates={templateLibrary}
        profiles={templateProfiles}
        formatSpecs={formatSpecs}
        selectedTemplateId={selectedTemplateId}
        isUploading={isIdentifyingTemplate}
        onSelect={(templateId) => {
          void handleSelectTemplate(templateId);
        }}
        onEdit={(templateId) => {
          void handleOpenTemplateEdit(templateId);
        }}
        onUpload={(file, documentKind) => {
          void handleUploadTemplate(file, documentKind);
        }}
      />
      <TemplateConfirmDialog
        open={openTemplateConfirmDialog}
        onOpenChange={setOpenTemplateConfirmDialog}
        profile={selectedTemplateProfile}
        onResolve={(itemId, resolution) => {
          void handleResolveConfirmation(itemId, resolution);
        }}
      />
      <TemplateEditDialog
        open={openTemplateEditDialog}
        onOpenChange={setOpenTemplateEditDialog}
        profile={editingTemplateProfile}
        formatSpecs={formatSpecs}
        history={templateHistory}
        saving={isSavingTemplateEdit}
        onSave={(fields) => {
          void handleSaveTemplateEdit(fields);
        }}
      />
      {openKnowledgeGraph ? (
        <KnowledgeGraph
          open={openKnowledgeGraph}
          onClose={() => setOpenKnowledgeGraph(false)}
        ></KnowledgeGraph>
      ) : null}
    </>
  );
}

export default FinalReport;
