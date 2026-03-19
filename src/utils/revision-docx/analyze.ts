import { createHash } from "node:crypto";
import { decodeArchiveBase64, encodeArchiveBase64, readDocxArchive } from "@/utils/revision-docx/archive";
import type {
  CommentAnchor,
  RevisionAnalysisSnapshot,
  RevisionComment,
  RevisionCommentAuthor,
  RevisionParagraph,
} from "@/utils/revision-docx/types";
import {
  extractCommentIdsFromParagraph,
  extractCommentQuotedTextByParagraph,
  extractParagraphXmls,
  extractTextFromParagraphXml,
} from "@/utils/revision-docx/xml";

function parseComments(commentsXml: string) {
  const comments: RevisionComment[] = [];
  const commentRegex = /<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g;

  for (const match of commentsXml.matchAll(commentRegex)) {
    const attrs = match[1];
    const body = match[2];
    const id = attrs.match(/\bw:id="([^"]+)"/)?.[1] || "";
    if (!id) continue;
    const author = attrs.match(/\bw:author="([^"]*)"/)?.[1] || "Unknown";
    const initials = attrs.match(/\bw:initials="([^"]*)"/)?.[1] || "";
    const date = attrs.match(/\bw:date="([^"]*)"/)?.[1] || "";
    const textRuns = body.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g) || [];
    const content = textRuns
      .map((run) => run.replace(/^<w:t\b[^>]*>/, "").replace(/<\/w:t>$/, ""))
      .join("")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    comments.push({
      id,
      author,
      initials,
      date,
      content,
    });
  }

  return comments;
}

function buildAuthorStats(comments: RevisionComment[]) {
  const map = new Map<string, number>();
  for (const comment of comments) {
    map.set(comment.author, (map.get(comment.author) || 0) + 1);
  }
  const authors: RevisionCommentAuthor[] = Array.from(map.entries()).map(
    ([name, count]) => ({ name, count })
  );
  authors.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return authors;
}

export async function analyzeRevisionDocx(params: {
  fileName: string;
  arrayBuffer: ArrayBuffer;
}) {
  const archiveEntries = await readDocxArchive(params.arrayBuffer);
  const entryMap = new Map(archiveEntries.map((entry) => [entry.name, entry.data]));
  const decoder = new TextDecoder("utf-8");
  const documentXml = entryMap.get("word/document.xml")
    ? decoder.decode(entryMap.get("word/document.xml"))
    : "";
  const commentsXml = entryMap.get("word/comments.xml")
    ? decoder.decode(entryMap.get("word/comments.xml"))
    : "";

  if (!documentXml) {
    throw new Error("DOCX 缺少 word/document.xml。");
  }
  if (!commentsXml) {
    throw new Error("DOCX 缺少 word/comments.xml，未检测到批注。");
  }

  const comments = parseComments(commentsXml);
  const paragraphXmls = extractParagraphXmls(documentXml);
  const paragraphs: RevisionParagraph[] = [];
  const commentToParagraph = new Map<string, number>();
  const commentToQuotedText = new Map<string, string>();

  for (let index = 0; index < paragraphXmls.length; index += 1) {
    const paragraphXml = paragraphXmls[index];
    const text = extractTextFromParagraphXml(paragraphXml);
    const commentIds = extractCommentIdsFromParagraph(paragraphXml);
    const quotedMap = extractCommentQuotedTextByParagraph(paragraphXml);

    for (const [commentId, quotedText] of Object.entries(quotedMap)) {
      if (!commentToQuotedText.get(commentId) && quotedText) {
        commentToQuotedText.set(commentId, quotedText);
      }
    }

    if (commentIds.length > 0) {
      for (const commentId of commentIds) {
        if (!commentToParagraph.has(commentId)) {
          commentToParagraph.set(commentId, index);
        }
      }
    }

    paragraphs.push({
      index,
      text,
      commentIds,
    });
  }

  const anchors: CommentAnchor[] = comments.map((comment) => {
    const paragraphIndex = commentToParagraph.get(comment.id);
    const paragraphText =
      paragraphIndex === undefined ? "" : paragraphs[paragraphIndex]?.text || "";
    const quotedText = commentToQuotedText.get(comment.id) || "";
    const contextBefore =
      paragraphIndex === undefined || paragraphIndex === 0
        ? ""
        : paragraphs[paragraphIndex - 1]?.text || "";
    const contextAfter =
      paragraphIndex === undefined
        ? ""
        : paragraphs[paragraphIndex + 1]?.text || "";

    return {
      commentId: comment.id,
      author: comment.author,
      content: comment.content,
      paragraphIndex: paragraphIndex === undefined ? null : paragraphIndex,
      paragraphText,
      quotedText: quotedText || paragraphText.slice(0, 220),
      contextBefore,
      contextAfter,
    };
  });

  const anchoredComments = anchors.filter(
    (item) => item.paragraphIndex !== null
  ).length;
  const paragraphsWithComments = paragraphs.filter(
    (item) => item.commentIds.length > 0
  ).length;

  const digest = createHash("sha256")
    .update(Buffer.from(params.arrayBuffer))
    .digest("hex")
    .slice(0, 16);

  const analysis: RevisionAnalysisSnapshot = {
    version: "v1",
    fileName: params.fileName,
    docHash: digest,
    createdAt: Date.now(),
    archive: {
      entries: encodeArchiveBase64(archiveEntries),
    },
    comments,
    paragraphs,
    anchors,
    authors: buildAuthorStats(comments),
    stats: {
      totalComments: comments.length,
      anchoredComments,
      totalParagraphs: paragraphs.length,
      paragraphsWithComments,
    },
  };

  return analysis;
}

export function readArchiveFromAnalysis(analysis: RevisionAnalysisSnapshot) {
  return decodeArchiveBase64(analysis.archive.entries);
}

