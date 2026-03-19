const paragraphRegex = /<w:p\b[\s\S]*?<\/w:p>/g;

export function decodeXml(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function extractParagraphXmls(documentXml: string) {
  return documentXml.match(paragraphRegex) || [];
}

export function extractTextFromParagraphXml(paragraphXml: string) {
  const textRuns = paragraphXml.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g) || [];
  const text = textRuns
    .map((run) => run.replace(/^<w:t\b[^>]*>/, "").replace(/<\/w:t>$/, ""))
    .map((item) => decodeXml(item))
    .join("");
  return text.replace(/\s+/g, " ").trim();
}

export function extractCommentIdsFromParagraph(paragraphXml: string) {
  const ids = new Set<string>();
  const collect = (regex: RegExp) => {
    for (const match of paragraphXml.matchAll(regex)) {
      const id = match[1];
      if (id) ids.add(id);
    }
  };
  collect(/<w:commentRangeStart\b[^>]*w:id="([^"]+)"[^>]*\/>/g);
  collect(/<w:commentRangeEnd\b[^>]*w:id="([^"]+)"[^>]*\/>/g);
  collect(/<w:commentReference\b[^>]*w:id="([^"]+)"[^>]*\/>/g);
  return Array.from(ids);
}

export function extractCommentQuotedTextByParagraph(paragraphXml: string) {
  const quotedMap: Record<string, string> = {};
  const activeCommentIds = new Set<string>();
  const tokenRegex =
    /<w:commentRangeStart\b[^>]*w:id="([^"]+)"[^>]*\/>|<w:commentRangeEnd\b[^>]*w:id="([^"]+)"[^>]*\/>|<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;

  for (const token of paragraphXml.matchAll(tokenRegex)) {
    if (token[1]) {
      activeCommentIds.add(token[1]);
      continue;
    }
    if (token[2]) {
      activeCommentIds.delete(token[2]);
      continue;
    }
    if (token[3]) {
      const text = decodeXml(token[3]);
      for (const commentId of activeCommentIds) {
        quotedMap[commentId] = `${quotedMap[commentId] || ""}${text}`;
      }
    }
  }

  for (const key of Object.keys(quotedMap)) {
    quotedMap[key] = quotedMap[key].replace(/\s+/g, " ").trim();
  }

  return quotedMap;
}

export function cleanCommentMarkersFromDocument(documentXml: string) {
  return documentXml
    .replace(/<w:commentRangeStart\b[^>]*\/>/g, "")
    .replace(/<w:commentRangeEnd\b[^>]*\/>/g, "")
    .replace(/<w:commentReference\b[^>]*\/>/g, "")
    .replace(
      /<w:r\b[^>]*>\s*(<w:rPr\b[\s\S]*?<\/w:rPr>\s*)?<\/w:r>/g,
      ""
    );
}

export function removeCommentRelationshipXml(relsXml: string) {
  return relsXml.replace(
    /<Relationship\b[^>]*Type="[^"]*\/comments[^"]*"[^>]*\/>/g,
    ""
  );
}

export function removeCommentContentTypes(contentTypesXml: string) {
  return contentTypesXml
    .replace(/<Override\b[^>]*PartName="\/word\/comments\.xml"[^>]*\/>/g, "")
    .replace(
      /<Override\b[^>]*PartName="\/word\/commentsExtended\.xml"[^>]*\/>/g,
      ""
    )
    .replace(/<Override\b[^>]*PartName="\/word\/people\.xml"[^>]*\/>/g, "");
}

function findPrimaryRunProperties(paragraphXml: string) {
  return paragraphXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0] || "";
}

export function replaceParagraphText(paragraphXml: string, revisedText: string) {
  const paragraphOpenTag = paragraphXml.match(/<w:p\b[^>]*>/)?.[0] || "<w:p>";
  const paragraphProps = paragraphXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] || "";
  const runProps = findPrimaryRunProperties(paragraphXml);
  const escapedText = escapeXml(revisedText);
  const textTag =
    escapedText.startsWith(" ") || escapedText.endsWith(" ")
      ? `<w:t xml:space="preserve">${escapedText}</w:t>`
      : `<w:t>${escapedText}</w:t>`;

  return [
    paragraphOpenTag,
    paragraphProps,
    "<w:r>",
    runProps,
    textTag,
    "</w:r>",
    "</w:p>",
  ].join("");
}
