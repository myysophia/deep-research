/**
 * Citation Manager for Academic Writing
 * Provides utilities for managing citations, BibTeX import/export, and Zotero integration
 */

export interface Citation {
  id: string;
  type: "article" | "book" | "conference" | "thesis" | "webpage" | "misc";
  title: string;
  author: string;
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  abstract?: string;
  keywords?: string[];
  notes?: string;
  bibtex?: string;
}

export interface BibTeXEntry {
  citationKey: string;
  entryType: string;
  fields: Record<string, string>;
}

/**
 * Parse BibTeX string into Citation objects
 */
export function parseBibTeX(bibtex: string): Citation[] {
  const citations: Citation[] = [];
  const entries = bibtex.split(/\n@/).filter((e) => e.trim().length > 0);

  for (const entry of entries) {
    try {
      const parsed = parseBibTeXEntry("@" + entry);
      if (parsed) {
        citations.push(bibTeXToCitation(parsed));
      }
    } catch (error) {
      console.error("Failed to parse BibTeX entry:", error);
    }
  }

  return citations;
}

/**
 * Parse a single BibTeX entry
 */
function parseBibTeXEntry(entry: string): BibTeXEntry | null {
  const match = entry.match(/@(\w+)\s*\{([^,]+),\s*([\s\S]+)\}/);
  if (!match) return null;

  const [, entryType, citationKey, fieldsStr] = match;

  const fields: Record<string, string> = {};
  const fieldMatches = fieldsStr.matchAll(/(\w+)\s*=\s*\{([^}]*)\}/g);

  for (const field of fieldMatches) {
    const [, key, value] = field;
    fields[key] = value;
  }

  return {
    citationKey,
    entryType,
    fields,
  };
}

/**
 * Convert BibTeX entry to Citation
 */
function bibTeXToCitation(entry: BibTeXEntry): Citation {
  const { entryType, fields, citationKey } = entry;

  return {
    id: citationKey,
    type: mapBibTeXTypeToCitationType(entryType),
    title: fields.title || "",
    author: fields.author || "",
    year: parseInt(fields.year || "0"),
    journal: fields.journal || fields.journaltitle,
    volume: fields.volume,
    issue: fields.number,
    pages: fields.pages,
    doi: fields.doi,
    url: fields.url || fields.eprint,
    publisher: fields.publisher,
    abstract: fields.abstract,
    keywords: fields.keywords?.split(",").map((k) => k.trim()),
    notes: fields.note,
    bibtex: formatBibTeXEntry(entry),
  };
}

/**
 * Map BibTeX entry type to Citation type
 */
function mapBibTeXTypeToCitationType(bibType: string): Citation["type"] {
  const typeMap: Record<string, Citation["type"]> = {
    article: "article",
    book: "book",
    inproceedings: "conference",
    conference: "conference",
    phdthesis: "thesis",
    mastersthesis: "thesis",
    misc: "misc",
    online: "webpage",
    electronic: "webpage",
  };

  return typeMap[bibType.toLowerCase()] || "misc";
}

/**
 * Format citation to BibTeX
 */
export function formatCitationAsBibTeX(citation: Citation): string {
  const entryType = mapCitationTypeToBibTeX(citation.type);
  const citationKey = generateCitationKey(citation);

  const fields: string[] = [];
  if (citation.title) fields.push(`title={${citation.title}}`);
  if (citation.author) fields.push(`author={${citation.author}}`);
  if (citation.year) fields.push(`year={${citation.year}}`);
  if (citation.journal) fields.push(`journal={${citation.journal}}`);
  if (citation.volume) fields.push(`volume={${citation.volume}}`);
  if (citation.issue) fields.push(`number={${citation.issue}}`);
  if (citation.pages) fields.push(`pages={${citation.pages}}`);
  if (citation.doi) fields.push(`doi={${citation.doi}}`);
  if (citation.url) fields.push(`url={${citation.url}}`);
  if (citation.publisher) fields.push(`publisher={${citation.publisher}}`);
  if (citation.abstract) fields.push(`abstract={${citation.abstract}}`);

  return `@${entryType}{${citationKey},\n  ${fields.join(",\n  ")}\n}`;
}

/**
 * Format BibTeX entry to string
 */
function formatBibTeXEntry(entry: BibTeXEntry): string {
  const fields = Object.entries(entry.fields)
    .map(([key, value]) => `  ${key}={${value}}`)
    .join(",\n");

  return `@${entry.entryType}{${entry.citationKey},\n${fields}\n}`;
}

/**
 * Map Citation type to BibTeX entry type
 */
function mapCitationTypeToBibTeX(type: Citation["type"]): string {
  const typeMap: Record<Citation["type"], string> = {
    article: "article",
    book: "book",
    conference: "inproceedings",
    thesis: "phdthesis",
    webpage: "online",
    misc: "misc",
  };

  return typeMap[type] || "misc";
}

/**
 * Generate citation key from citation
 */
function generateCitationKey(citation: Citation): string {
  const authorLastName = citation.author.split(",")[0].trim() || "unknown";
  const year = citation.year || "n.d.";
  const titleWords = citation.title.split(" ").slice(0, 3).join("");

  return `${authorLastName}${year}${titleWords}`.replace(/\s+/g, "");
}

/**
 * Export citations to BibTeX format
 */
export function exportCitationsToBibTeX(citations: Citation[]): string {
  return citations.map((c) => c.bibtex || formatCitationAsBibTeX(c)).join("\n\n");
}

/**
 * Format citation according to style
 */
export function formatCitation(citation: Citation, style: "apa" | "mla" | "chicago" | "ieee" | "gb7714"): string {
  switch (style) {
    case "apa":
      return formatAPA(citation);
    case "mla":
      return formatMLA(citation);
    case "chicago":
      return formatChicago(citation);
    case "ieee":
      return formatIEEE(citation);
    case "gb7714":
      return formatGB7714(citation);
    default:
      return formatAPA(citation);
  }
}

/**
 * Format citation in APA style
 */
function formatAPA(citation: Citation): string {
  const authors = formatAuthorsAPA(citation.author);
  const year = citation.year ? `(${citation.year})` : "(n.d.)";

  if (citation.type === "article" && citation.journal) {
    return `${authors} ${year}. ${citation.title}. *${citation.journal}*${citation.volume ? `, ${citation.volume}` : ""}${citation.issue ? `(${citation.issue})` : ""}${citation.pages ? `, ${citation.pages}` : ""}.`;
  } else if (citation.type === "book") {
    return `${authors} ${year}. *${citation.title}*${citation.publisher ? `. ${citation.publisher}` : ""}.`;
  } else {
    return `${authors} ${year}. ${citation.title}.`;
  }
}

/**
 * Format authors for APA style
 */
function formatAuthorsAPA(authorStr: string): string {
  const authors = authorStr.split(" and ");
  if (authors.length === 1) {
    return authors[0];
  } else if (authors.length === 2) {
    return authors.join(" & ");
  } else {
    return `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
  }
}

/**
 * Format citation in MLA style
 */
function formatMLA(citation: Citation): string {
  const authors = citation.author;
  if (citation.type === "article" && citation.journal) {
    return `${authors}. "${citation.title}." *${citation.journal}*${citation.volume ? `, vol. ${citation.volume}` : ""}${citation.issue ? `, no. ${citation.issue}` : ""}${citation.year ? `, ${citation.year}` : ""}${citation.pages ? `, pp. ${citation.pages}` : ""}.`;
  }
  return `${authors}. "${citation.title}."`;
}

/**
 * Format citation in Chicago style
 */
function formatChicago(citation: Citation): string {
  const authors = citation.author;
  if (citation.type === "article" && citation.journal) {
    return `${authors}. "${citation.title}." ${citation.journal}${citation.volume ? ` ${citation.volume}` : ""}${citation.issue ? `, no. ${citation.issue}` : ""} (${citation.year})${citation.pages ? `: ${citation.pages}` : ""}.`;
  }
  return `${authors}. "${citation.title}." ${citation.year}.`;
}

/**
 * Format citation in IEEE style
 */
function formatIEEE(citation: Citation): string {
  const authors = formatAuthorsIEEE(citation.author);
  if (citation.type === "article" && citation.journal) {
    return `${authors}, "${citation.title}," *${citation.journal}*${citation.volume ? `, vol. ${citation.volume}` : ""}${citation.issue ? `, no. ${citation.issue}` : ""}${citation.pages ? `, pp. ${citation.pages}` : ""}${citation.year ? `, ${citation.year}` : ""}.`;
  }
  return `${authors}, "${citation.title}," ${citation.year}.`;
}

/**
 * Format authors for IEEE style
 */
function formatAuthorsIEEE(authorStr: string): string {
  const authors = authorStr.split(" and ");
  return authors.map((a) => {
    const parts = a.split(", ");
    if (parts.length >= 2) {
      return `${parts[1].split(" ").map((n) => n[0].toUpperCase()).join(".")} ${parts[0]}`;
    }
    return a;
  }).join(", ");
}

/**
 * Format citation in GB/T 7714-2015 style
 */
function formatGB7714(citation: Citation): string {
  const authors = citation.author.toUpperCase();
  if (citation.type === "article" && citation.journal) {
    return `${authors}. ${citation.title}[J]. ${citation.journal}${citation.year ? `, ${citation.year}` : ""}${citation.volume ? `, ${citation.volume}` : ""}${citation.issue ? `(${citation.issue})` : ""}${citation.pages ? `: ${citation.pages}` : ""}.`;
  }
  return `${authors}. ${citation.title}.`;
}

/**
 * Zotero integration utilities
 */
export class ZoteroIntegration {
  private apiKey: string;
  private userId: string;
  private baseUrl = "https://api.zotero.org";

  constructor(apiKey: string, userId: string) {
    this.apiKey = apiKey;
    this.userId = userId;
  }

  /**
   * Fetch all citations from Zotero library
   */
  async fetchCitations(): Promise<Citation[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/users/${this.userId}/items?format=json&include=bibtex`,
        {
          headers: {
            "Zotero-API-Key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zotero API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map((item: any) => this.zoteroItemToCitation(item));
    } catch (error) {
      console.error("Failed to fetch Zotero citations:", error);
      throw error;
    }
  }

  /**
   * Convert Zotero item to Citation
   */
  private zoteroItemToCitation(item: any): Citation {
    const data = item.data;
    return {
      id: item.key,
      type: this.mapZoteroType(data.itemType),
      title: data.title || "",
      author: this.formatZoteroCreators(data.creators),
      year: data.date ? parseInt(data.date.match(/\d{4}/)?.[0] || "0") : 0,
      journal: data.publicationTitle,
      volume: data.volume,
      issue: data.issue,
      pages: data.pages,
      doi: data.DOI,
      url: data.url,
      publisher: data.publisher,
      abstract: data.abstractNote,
      bibtex: item.bibtex || "",
    };
  }

  /**
   * Map Zotero item type to Citation type
   */
  private mapZoteroType(zoteroType: string): Citation["type"] {
    const typeMap: Record<string, Citation["type"]> = {
      journalArticle: "article",
      book: "book",
      conferencePaper: "conference",
      thesis: "thesis",
      webpage: "webpage",
    };
    return typeMap[zoteroType] || "misc";
  }

  /**
   * Format Zotero creators to author string
   */
  private formatZoteroCreators(creators: any[]): string {
    return creators
      .map((c) => {
        if (c.creatorType === "author") {
          return `${c.lastName || ""}, ${c.firstName || ""}`;
        }
        return null;
      })
      .filter(Boolean)
      .join(" and ");
  }
}

/**
 * Create Zotero integration instance
 */
export function createZoteroIntegration(apiKey?: string, userId?: string): ZoteroIntegration | null {
  if (!apiKey || !userId) {
    return null;
  }
  return new ZoteroIntegration(apiKey, userId);
}
