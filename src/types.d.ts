interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  status: "unprocessed" | "processing" | "completed" | "failed";
}

interface FileMeta {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface Knowledge {
  id: string;
  title: string;
  content: string;
  type: "file" | "url" | "knowledge";
  fileMeta?: FileMeta;
  url?: string;
  createdAt: number;
  updatedAt: number;
}

interface ImageSource {
  url: string;
  description?: string;
}

interface Source {
  title?: string;
  content?: string;
  url: string;
  images?: ImageSource[];
}

interface SearchTask {
  state: "unprocessed" | "processing" | "completed" | "failed";
  query: string;
  researchGoal: string;
  learning: string;
  sources: Source[];
  images: ImageSource[];
}

interface PaperLayoutConfig {
  paperSize: "A4";
  pageMargins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  bindingSide: "left";
  titleFontFamily: string;
  titleFontSize: number;
  bodyFontFamily: string;
  bodyFontSize: number;
  lineSpacing: number;
  letterSpacing: number;
  paragraphSpacingBefore: number;
  paragraphSpacingAfter: number;
  firstLineIndentChars: number;
  headerTextLeft: string;
  headerTextRight: string;
  footerText: string;
  showPageNumber: boolean;
  pageNumberPosition: "left" | "center" | "right";
  frontMatterPageNumberStyle: "roman" | "decimal";
  bodyPageNumberStyle: "decimal";
  styleOverrides?: TemplateDocumentStyleOverrides;
  templatePageRule?: TemplatePageRule;
}

interface TemplateStyleOverride {
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  alignment?: string;
}

interface TemplateDocumentStyleOverrides {
  abstractTitleZh?: TemplateStyleOverride;
  abstractTitleEn?: TemplateStyleOverride;
  tocTitle?: TemplateStyleOverride;
  heading1?: TemplateStyleOverride;
  heading2?: TemplateStyleOverride;
  heading3?: TemplateStyleOverride;
  referenceTitle?: TemplateStyleOverride;
  referenceItem?: TemplateStyleOverride;
  bodyText?: TemplateStyleOverride;
  keywordsText?: TemplateStyleOverride;
  acknowledgementsTitle?: TemplateStyleOverride;
}

interface PaperSection {
  id: string;
  level: 1 | 2 | 3;
  numbering: string;
  heading: string;
  markdown: string;
}

interface PaperArtifact {
  id: string;
  type: "table" | "mermaid";
  title: string;
  placementSectionId: string;
  content: string;
  isSyntheticData: boolean;
  note?: string;
  renderedSvg?: string;
}

interface ThesisTemplateMeta {
  subtitle: string;
  college: string;
  major: string;
  className: string;
  studentName: string;
  studentId: string;
  advisor: string;
  completionDate: string;
  acknowledgements: string;
}

interface PaperDocument {
  title: string;
  abstractZh: string;
  abstractEn: string;
  keywordsZh: string[];
  keywordsEn: string[];
  sections: PaperSection[];
  references: Source[];
  artifacts: PaperArtifact[];
  layoutConfig: PaperLayoutConfig;
  templateMeta: ThesisTemplateMeta;
}

type ThesisType = "graduation-thesis" | "course-paper" | "proposal";

type EducationLevel = "undergraduate" | "master" | "general";

type TemplateSource = "platform" | "user-uploaded" | "user-curated";

type TemplateDocumentKind = "blank-template" | "sample-paper";

type TemplateSectionKey =
  | "cover"
  | "declaration"
  | "authorization"
  | "abstract-zh"
  | "abstract-en"
  | "toc"
  | "body"
  | "references"
  | "acknowledgements"
  | "appendix";

type TemplateRole =
  | "cover-title"
  | "cover-field"
  | "abstract-title-zh"
  | "abstract-title-en"
  | "toc-title"
  | "body-text"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "reference-title"
  | "reference-item"
  | "acknowledgements-title"
  | "caption-table"
  | "caption-figure";

type TemplateValidationLevel = "error" | "warning" | "info";

interface FormatSpecSectionRule {
  key: TemplateSectionKey;
  label: string;
  required: boolean;
  repeatable: boolean;
  order: number;
}

interface FormatSpec {
  id: string;
  name: string;
  description: string;
  thesisType: ThesisType;
  educationLevel: EducationLevel;
  locale: string;
  sectionRules: FormatSpecSectionRule[];
  abstractZhMinLength?: number;
  abstractZhMaxLength?: number;
  abstractEnMinLength?: number;
  abstractEnMaxLength?: number;
  keywordMinCount: number;
  keywordMaxCount: number;
  referenceMinCount?: number;
  foreignReferenceMinCount?: number;
  titleMaxLevel: 1 | 2 | 3 | 4 | 5;
  pageNumberPosition?: "left" | "center" | "right";
}

interface TemplateFieldAnchor {
  key:
    | "title"
    | "subtitle"
    | "college"
    | "major"
    | "className"
    | "studentName"
    | "studentId"
    | "advisor"
    | "completionDate";
  label: string;
  anchorText: string;
  confidence: number;
}

interface TemplateStyleRole {
  role: TemplateRole;
  styleId?: string;
  styleName?: string;
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  alignment?: string;
  confidence: number;
}

interface TemplateSectionProfile {
  key: TemplateSectionKey;
  label: string;
  detected: boolean;
  order: number;
  startAnchorText?: string;
  confidence: number;
}

interface TemplatePageRule {
  paperSize: "A4";
  marginsCm: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  hasDifferentFirstPage: boolean;
  pageNumberStart?: number;
  pageNumberFormat?: "decimal" | "roman";
  headerTextLeft?: string;
  headerTextRight?: string;
  footerText?: string;
  pageNumberPosition?: "left" | "center" | "right";
}

interface TemplateConfirmationItem {
  id: string;
  type: "section" | "field" | "style" | "page-rule";
  label: string;
  description: string;
  confidence: number;
  resolved: boolean;
  resolution?: "confirmed" | "ignored";
  targetKey?: string;
  suggestedValue?: string;
}

interface TemplateValidationIssue {
  level: TemplateValidationLevel;
  code: string;
  message: string;
  field?: string;
}

interface TemplatePreviewAnchor {
  key: TemplateFieldAnchor["key"];
  label: string;
  confidence: number;
}

interface TemplatePreviewSnapshot {
  pageNumber: number;
  sectionKey: TemplateSectionKey;
  label: string;
  summary: string;
  coverage: number;
  layout: {
    paperSize: "A4";
    marginsCm: TemplatePageRule["marginsCm"];
  };
  anchorHighlights?: TemplatePreviewAnchor[];
}

interface TemplateValidationHighlight {
  heading: string;
  snippet: string;
}

interface TemplateValidationDifference {
  key: string;
  expected: string;
  actual?: string;
  message: string;
}

interface TemplateValidationSuggestion {
  target: string;
  message: string;
}

interface TemplateValidationDetail {
  formatSpecId: string;
  formatSpecName?: string;
  differences: TemplateValidationDifference[];
  suggestions: TemplateValidationSuggestion[];
}

interface TemplateValidationPreview {
  layout: {
    paperSize: "A4";
    marginsCm: TemplatePageRule["marginsCm"];
  };
  highlights: TemplateValidationHighlight[];
  sectionCount: number;
  artifactCount: number;
  keyPages?: TemplatePreviewSnapshot[];
  anchorCoverage?: {
    total: number;
    captured: number;
  };
}

interface TemplateValidationResult {
  canExport: boolean;
  issues: TemplateValidationIssue[];
  preview?: TemplateValidationPreview;
  detail?: TemplateValidationDetail;
}

interface TemplateEditablePageRuleFields {
  headerTextLeft?: string;
  headerTextRight?: string;
  footerText?: string;
  pageNumberPosition?: "left" | "center" | "right";
}

interface TemplateEditableSectionField {
  key: TemplateSectionKey;
  detected: boolean;
  confidence: number;
  startAnchorText?: string;
}

interface TemplateProfileEditableFields {
  name: string;
  schoolName?: string;
  formatSpecId: string;
  pageRule: TemplateEditablePageRuleFields;
  sections: TemplateEditableSectionField[];
  fieldAnchors: TemplateFieldAnchor[];
  revisionNote?: string;
  tags?: string[];
}

interface TemplateProfile {
  id: string;
  name: string;
  source: TemplateSource;
  documentKind: TemplateDocumentKind;
  formatSpecId: string;
  thesisType: ThesisType;
  educationLevel: EducationLevel;
  originalFileName?: string;
  sections: TemplateSectionProfile[];
  fieldAnchors: TemplateFieldAnchor[];
  styleRoles: TemplateStyleRole[];
  pageRule: TemplatePageRule;
  confirmationItems: TemplateConfirmationItem[];
  version?: number;
  originTemplateId?: string;
  revisionNote?: string;
  schoolName?: string;
  tags?: string[];
  lastEditedAt?: number;
  confidenceScore: number;
  createdAt: number;
  updatedAt: number;
}

interface TemplateLibraryItem {
  id: string;
  name: string;
  source: TemplateSource;
  formatSpecId: string;
  thesisType: ThesisType;
  educationLevel: EducationLevel;
  confidenceScore: number;
  updatedAt: number;
}

interface PartialJson {
  value: JSONValue | undefined;
  state:
    | "undefined-input"
    | "successful-parse"
    | "repaired-parse"
    | "failed-parse";
}

interface WebSearchResult {
  content: string;
  url: string;
  title?: string;
}
