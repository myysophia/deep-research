"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  LoaderCircle,
  SquarePlus,
  FilePlus,
  BookText,
  Paperclip,
  Link,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ResourceList from "@/components/Knowledge/ResourceList";
import Crawler from "@/components/Knowledge/Crawler";
import { Button } from "@/components/Internal/Button";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useDeepResearch from "@/hooks/useDeepResearch";
import useAiProvider from "@/hooks/useAiProvider";
import useKnowledge from "@/hooks/useKnowledge";
import useAccurateTimer from "@/hooks/useAccurateTimer";
import useSubmitShortcut from "@/hooks/useSubmitShortcut";
import { useGlobalStore } from "@/store/global";
import { useSettingStore } from "@/store/setting";
import { useTaskStore } from "@/store/task";
import { useHistoryStore } from "@/store/history";
import {
  DEFAULT_THESIS_QUICK_PROMPT_ID,
  formatThesisQuickPrompt,
  type ThesisQuickPromptId,
} from "@/constants/thesis-quick-prompts";

const formSchema = z.object({
  title: z.string().trim().min(2),
  topic: z.string().trim().min(2),
  templateId: z.enum(["general-academic", "undergraduate", "master"]),
});

const TOPIC_FIELD_ID = "research-topic-field";
const RESOURCE_TRIGGER_ID = "knowledge-resource-trigger";
const DEFAULT_TEMPLATE_ID = DEFAULT_THESIS_QUICK_PROMPT_ID;

function Topic() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskStore = useTaskStore();
  const { askQuestions } = useDeepResearch();
  const { hasApiKey } = useAiProvider();
  const { getKnowledgeFromFile } = useKnowledge();
  const {
    formattedTime,
    start: accurateTimerStart,
    stop: accurateTimerStop,
  } = useAccurateTimer();
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [openCrawler, setOpenCrawler] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      topic: taskStore.question,
      templateId: DEFAULT_TEMPLATE_ID,
    },
  });
  const topicPresets: Array<{ id: ThesisQuickPromptId; label: string }> = [
    {
      id: "general-academic",
      label: t("research.topic.presets.generalAcademicLabel"),
    },
    {
      id: "undergraduate",
      label: t("research.topic.presets.undergraduateLabel"),
    },
    {
      id: "master",
      label: t("research.topic.presets.masterLabel"),
    },
  ];
  const handleTopicSubmitShortcut = useSubmitShortcut(() => {
    void form.handleSubmit(handleSubmit)();
  });
  const selectedTemplateId = form.watch("templateId");
  const titleValue = form.watch("title");
  const topicValue = form.watch("topic");

  function selectTopicPreset(templateId: ThesisQuickPromptId): void {
    const title = form.getValues("title").trim();
    const nextPrompt = formatThesisQuickPrompt(title, templateId);

    form.setValue("templateId", templateId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (title.length >= 2) {
      form.setValue("topic", nextPrompt, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }

  function handleCheck(): boolean {
    const { mode } = useSettingStore.getState();
    if ((mode === "local" && hasApiKey()) || mode === "proxy") {
      return true;
    } else {
      const { setOpenSetting } = useGlobalStore.getState();
      setOpenSetting(true);
      return false;
    }
  }

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    if (handleCheck()) {
      const { id, setQuestion } = useTaskStore.getState();
      const finalPrompt = formatThesisQuickPrompt(
        values.title,
        values.templateId
      );
      const promptContent = values.topic.trim() || finalPrompt;
      try {
        setIsThinking(true);
        accurateTimerStart();
        if (id !== "") {
          createNewResearch();
          form.setValue("title", values.title);
          form.setValue("topic", promptContent);
          form.setValue("templateId", values.templateId);
        }
        setQuestion(promptContent);
        await askQuestions();
      } finally {
        setIsThinking(false);
        accurateTimerStop();
      }
    }
  }

  function createNewResearch() {
    const { id, backup, reset } = useTaskStore.getState();
    const { update } = useHistoryStore.getState();
    if (id) update(id, backup());
    reset();
    form.reset({
      title: "",
      topic: "",
      templateId: DEFAULT_TEMPLATE_ID,
    });
  }

  function openKnowledgeList() {
    const { setOpenKnowledge } = useGlobalStore.getState();
    setOpenKnowledge(true);
  }

  async function handleFileUpload(files: FileList | null) {
    if (files) {
      for await (const file of files) {
        await getKnowledgeFromFile(file);
      }
      // Clear the input file to avoid processing the previous file multiple times
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  useEffect(() => {
    if (taskStore.question && taskStore.question !== form.getValues("topic")) {
      form.setValue("topic", taskStore.question);
    }
  }, [form, taskStore.question]);

  return (
    <section className="p-4 border rounded-md mt-4 print:hidden">
      <div className="flex justify-between items-center border-b mb-2">
        <h3 className="font-semibold text-lg leading-10">
          {t("research.topic.title")}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => createNewResearch()}
            title={t("research.common.newResearch")}
          >
            <SquarePlus />
          </Button>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <div className="space-y-2">
                <label
                  className="mb-2 block text-base font-semibold"
                  htmlFor={TOPIC_FIELD_ID}
                >
                  {t("research.topic.topicLabel")}
                </label>
                <Input
                  id={TOPIC_FIELD_ID}
                  placeholder={t("research.topic.topicPlaceholder")}
                  onKeyDown={handleTopicSubmitShortcut}
                  {...field}
                />
                <p className="text-xs text-muted-foreground">
                  {t("research.common.submitShortcut")}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {topicPresets.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant={
                        selectedTemplateId === preset.id ? "default" : "outline"
                      }
                      disabled={titleValue.trim().length < 2}
                      onClick={() => selectTopicPreset(preset.id)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <div className="mt-4 space-y-2">
                <label
                  className="mb-2 block text-base font-semibold"
                  htmlFor="research-topic-prompt-field"
                >
                  {t("research.topic.promptLabel")}
                </label>
                <Textarea
                  id="research-topic-prompt-field"
                  rows={10}
                  placeholder={t("research.topic.promptPlaceholder")}
                  onKeyDown={handleTopicSubmitShortcut}
                  {...field}
                />
              </div>
            )}
          />
          <div className="mt-2 space-y-2">
            <label
              className="mb-2 block text-base font-semibold"
              htmlFor={RESOURCE_TRIGGER_ID}
            >
              {t("knowledge.localResourceTitle")}
            </label>
            <div>
              {taskStore.resources.length > 0 ? (
                <ResourceList
                  className="pb-2 mb-2 border-b"
                  resources={taskStore.resources}
                  onRemove={taskStore.removeResource}
                />
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    id={RESOURCE_TRIGGER_ID}
                    className="inline-flex items-center border p-2 rounded-md text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    type="button"
                  >
                    <FilePlus className="w-5 h-5" />
                    <span className="ml-1">{t("knowledge.addResource")}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => openKnowledgeList()}>
                    <BookText />
                    <span>{t("knowledge.knowledge")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleCheck() && fileInputRef.current?.click()
                    }
                  >
                    <Paperclip />
                    <span>{t("knowledge.localFile")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCheck() && setOpenCrawler(true)}
                  >
                    <Link />
                    <span>{t("knowledge.webPage")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            disabled={isThinking || topicValue.trim().length < 2}
            type="submit"
          >
            {isThinking ? (
              <>
                <LoaderCircle className="animate-spin" />
                <span>{t("research.common.thinkingQuestion")}</span>
                <small className="font-mono">{formattedTime}</small>
              </>
            ) : taskStore.questions === "" ? (
              t("research.common.startThinking")
            ) : (
              t("research.common.rethinking")
            )}
          </Button>
        </form>
      </Form>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(ev) => handleFileUpload(ev.target.files)}
      />
      <Crawler
        open={openCrawler}
        onClose={() => setOpenCrawler(false)}
      ></Crawler>
    </section>
  );
}

export default Topic;
