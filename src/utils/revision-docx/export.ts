import { decodeArchiveBase64, writeDocxArchive } from "@/utils/revision-docx/archive";
import type { RevisionAnalysisSnapshot, RevisionPatch } from "@/utils/revision-docx/types";
import {
  cleanCommentMarkersFromDocument,
  extractParagraphXmls,
  removeCommentContentTypes,
  removeCommentRelationshipXml,
  replaceParagraphText,
} from "@/utils/revision-docx/xml";

function removeCommentFiles(entries: Array<{ name: string; data: Uint8Array }>) {
  const ignored = new Set([
    "word/comments.xml",
    "word/commentsExtended.xml",
    "word/people.xml",
  ]);
  return entries.filter((entry) => !ignored.has(entry.name));
}

function toStableUint8Array(value: Uint8Array) {
  return new Uint8Array(Array.from(value));
}

export async function exportRevisedDocx(params: {
  analysis: RevisionAnalysisSnapshot;
  patches: RevisionPatch[];
}) {
  const archiveEntries = decodeArchiveBase64(params.analysis.archive.entries);
  const entryMap = new Map(archiveEntries.map((entry) => [entry.name, entry.data]));
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  const documentData = entryMap.get("word/document.xml");
  if (!documentData) {
    throw new Error("导出失败：文档缺少 word/document.xml。");
  }

  let documentXml = decoder.decode(documentData);
  const paragraphXmls = extractParagraphXmls(documentXml);
  const patchMap = new Map(params.patches.map((patch) => [patch.paragraphIndex, patch]));
  const replacedParagraphs = paragraphXmls.map((paragraphXml, index) => {
    const patch = patchMap.get(index);
    if (!patch || patch.applyMode !== "replace") {
      return paragraphXml;
    }
    return replaceParagraphText(paragraphXml, patch.revisedText);
  });

  let cursor = 0;
  documentXml = documentXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => {
    const next = replacedParagraphs[cursor];
    cursor += 1;
    return next;
  });

  documentXml = cleanCommentMarkersFromDocument(documentXml);
  entryMap.set("word/document.xml", toStableUint8Array(encoder.encode(documentXml)));

  const relsData = entryMap.get("word/_rels/document.xml.rels");
  if (relsData) {
    const relsXml = decoder.decode(relsData);
    entryMap.set(
      "word/_rels/document.xml.rels",
      toStableUint8Array(encoder.encode(removeCommentRelationshipXml(relsXml)))
    );
  }

  const contentTypesData = entryMap.get("[Content_Types].xml");
  if (contentTypesData) {
    const contentTypesXml = decoder.decode(contentTypesData);
    entryMap.set(
      "[Content_Types].xml",
      toStableUint8Array(encoder.encode(removeCommentContentTypes(contentTypesXml)))
    );
  }

  const nextEntries = removeCommentFiles(
    Array.from(entryMap.entries()).map(([name, data]) => ({ name, data }))
  );

  return writeDocxArchive(nextEntries);
}
