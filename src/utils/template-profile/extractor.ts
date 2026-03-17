import { getDefaultFormatSpec } from "@/utils/template-spec/builtin-specs";

const SECTION_CUES: Array<{
  key: TemplateSectionKey;
  label: string;
  patterns: RegExp[];
}> = [
  {
    key: "cover",
    label: "封面",
    patterns: [/毕\s*业\s*论\s*文/u, /论文题目/u, /指导教师/u],
  },
  {
    key: "declaration",
    label: "独创性声明",
    patterns: [/独创性声明/u, /原创性声明/u, /学术诚信声明/u],
  },
  {
    key: "authorization",
    label: "授权书",
    patterns: [/授权书/u, /使用授权/u],
  },
  {
    key: "abstract-zh",
    label: "中文摘要",
    patterns: [/摘\s*要/u, /内容提要/u],
  },
  {
    key: "abstract-en",
    label: "英文摘要",
    patterns: [/abstract/i],
  },
  {
    key: "toc",
    label: "目录",
    patterns: [/目\s*录/u],
  },
  {
    key: "body",
    label: "正文",
    patterns: [/绪论/u, /前言/u, /^\s*1[.、\s]/m],
  },
  {
    key: "references",
    label: "参考文献",
    patterns: [/参考文献/u],
  },
  {
    key: "acknowledgements",
    label: "致谢",
    patterns: [/致谢/u, /谢辞/u],
  },
  {
    key: "appendix",
    label: "附录",
    patterns: [/附录/u],
  },
];

const FIELD_CUES: Array<{
  key: TemplateFieldAnchor["key"];
  label: string;
  anchors: string[];
}> = [
  { key: "title", label: "题目", anchors: ["题目：", "论文题目："] },
  { key: "subtitle", label: "副标题", anchors: ["副标题："] },
  { key: "college", label: "学院", anchors: ["学院：", "学    院："] },
  { key: "major", label: "专业", anchors: ["专业：", "专    业："] },
  { key: "className", label: "班级", anchors: ["班级：", "班    级："] },
  { key: "studentId", label: "学号", anchors: ["学号：", "学    号："] },
  { key: "studentName", label: "姓名", anchors: ["姓名：", "姓    名："] },
  { key: "advisor", label: "指导教师", anchors: ["指导教师：", "导师："] },
  { key: "completionDate", label: "完成日期", anchors: ["日期：", "完成日期："] },
];

function normalizeText(text: string) {
  return text.replace(/\r/g, "").replace(/\u200f/g, "").trim();
}

function toTemplateId(fileName: string) {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `template-${base || Date.now()}`;
}

function detectSections(text: string, formatSpec: FormatSpec) {
  return formatSpec.sectionRules.map((rule) => {
    const cue = SECTION_CUES.find((item) => item.key === rule.key);
    const matchedPattern = cue?.patterns.find((pattern) => pattern.test(text));
    return {
      key: rule.key,
      label: rule.label,
      detected: Boolean(matchedPattern),
      order: rule.order,
      startAnchorText: matchedPattern?.source
        .replace(/\\/g, "")
        .replace(/\(\?:/g, "")
        .replace(/[.*+?^${}()|[\]]/g, ""),
      confidence: matchedPattern ? 0.9 : rule.required ? 0.2 : 0.5,
    };
  });
}

function detectFieldAnchors(text: string) {
  return FIELD_CUES.flatMap((cue) => {
    const matched = cue.anchors.find((anchor) => text.includes(anchor));
    if (!matched) return [];
    return [
      {
        key: cue.key,
        label: cue.label,
        anchorText: matched,
        confidence: 0.92,
      },
    ];
  });
}

function inferStyleRoles(text: string): TemplateStyleRole[] {
  const roles: TemplateStyleRole[] = [
    { role: "body-text", confidence: 0.35, fontFamily: "待识别" },
  ];

  if (/^\s*1(\.|\s|、)/m.test(text) || /绪论/u.test(text)) {
    roles.push({ role: "heading-1", confidence: 0.62 });
  }
  if (/^\s*1\.1(\.|\s)?/m.test(text) || /（一）/u.test(text)) {
    roles.push({ role: "heading-2", confidence: 0.56 });
  }
  if (/^\s*1\.1\.1(\.|\s)?/m.test(text) || /1、/u.test(text)) {
    roles.push({ role: "heading-3", confidence: 0.5 });
  }
  if (/摘\s*要/u.test(text)) {
    roles.push({ role: "abstract-title-zh", confidence: 0.82 });
  }
  if (/abstract/i.test(text)) {
    roles.push({ role: "abstract-title-en", confidence: 0.82 });
  }
  if (/目\s*录/u.test(text)) {
    roles.push({ role: "toc-title", confidence: 0.85 });
  }
  if (/参考文献/u.test(text)) {
    roles.push({ role: "reference-title", confidence: 0.85 });
  }

  return roles;
}

function buildConfirmationItems(
  sections: TemplateSectionProfile[],
  fieldAnchors: TemplateFieldAnchor[],
  styleRoles: TemplateStyleRole[]
) {
  const items: TemplateConfirmationItem[] = [];

  sections
    .filter((item) => item.confidence < 0.75)
    .forEach((item) => {
      items.push({
        id: `section-${item.key}`,
        type: "section",
        label: `${item.label}识别确认`,
        description: `系统对“${item.label}”区段识别置信度较低，请确认是否存在该部分。`,
        confidence: item.confidence,
        resolved: false,
        suggestedValue: item.detected ? item.label : "未识别",
      });
    });

  if (!fieldAnchors.some((item) => item.key === "title")) {
    items.push({
      id: "field-title",
      type: "field",
      label: "题目字段确认",
      description: "未稳定识别到封面题目字段，请确认题目锚点位置。",
      confidence: 0.2,
      resolved: false,
    });
  }

  styleRoles
    .filter((item) => item.role.startsWith("heading") && item.confidence < 0.7)
    .forEach((item) => {
      items.push({
        id: `style-${item.role}`,
        type: "style",
        label: `${item.role} 样式确认`,
        description: `系统初步推断了 ${item.role}，但置信度不足，建议在模板确认中校正。`,
        confidence: item.confidence,
        resolved: false,
      });
    });

  return items;
}

function calculateConfidenceScore(
  sections: TemplateSectionProfile[],
  fieldAnchors: TemplateFieldAnchor[],
  confirmationItems: TemplateConfirmationItem[]
) {
  const sectionAverage =
    sections.reduce((sum, item) => sum + item.confidence, 0) /
    Math.max(sections.length, 1);
  const fieldAverage =
    fieldAnchors.reduce((sum, item) => sum + item.confidence, 0) /
    Math.max(fieldAnchors.length, 1);
  const penalty = confirmationItems.length * 0.04;

  return Math.max(
    0.1,
    Math.min(0.99, Number((sectionAverage * 0.7 + fieldAverage * 0.3 - penalty).toFixed(2)))
  );
}

export function extractTemplateProfileFromText(params: {
  fileName: string;
  textContent: string;
  documentKind?: TemplateDocumentKind;
}) {
  const formatSpec = getDefaultFormatSpec();
  const text = normalizeText(params.textContent);
  const now = Date.now();
  const sections = detectSections(text, formatSpec);
  const fieldAnchors = detectFieldAnchors(text);
  const styleRoles = inferStyleRoles(text);
  const confirmationItems = buildConfirmationItems(
    sections,
    fieldAnchors,
    styleRoles
  );
  const confidenceScore = calculateConfidenceScore(
    sections,
    fieldAnchors,
    confirmationItems
  );

  const profile: TemplateProfile = {
    id: toTemplateId(params.fileName),
    name: params.fileName.replace(/\.[^.]+$/, "") || "未命名模板",
    source: "user-uploaded",
    documentKind: params.documentKind || "sample-paper",
    formatSpecId: formatSpec.id,
    thesisType: formatSpec.thesisType,
    educationLevel: formatSpec.educationLevel,
    originalFileName: params.fileName,
    sections,
    fieldAnchors,
    styleRoles,
    pageRule: {
      paperSize: "A4",
      marginsCm: {
        top: 2.54,
        right: 2.54,
        bottom: 2.54,
        left: 3.18,
      },
      hasDifferentFirstPage: true,
      pageNumberStart: 1,
      pageNumberFormat: "decimal",
    },
    confirmationItems,
    confidenceScore,
    createdAt: now,
    updatedAt: now,
  };

  return {
    formatSpec,
    profile,
  };
}
