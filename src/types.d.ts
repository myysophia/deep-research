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
