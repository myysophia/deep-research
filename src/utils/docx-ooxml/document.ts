function decodeXml(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(text: string) {
  return decodeXml(text.replace(/<[^>]+>/g, ""));
}

export function extractDocumentParagraphTexts(documentXml: string) {
  const paragraphs = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];

  return paragraphs
    .map((paragraphXml) => {
      const textRuns = paragraphXml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [];
      return stripTags(textRuns.join("")).trim();
    })
    .filter(Boolean);
}

export function extractDocumentTableCount(documentXml: string) {
  return (documentXml.match(/<w:tbl[\s>]/g) || []).length;
}

export function hasTableOfContentsField(documentXml: string) {
  return /TOC\\o\s+"1-3"/i.test(documentXml) || /TOC/i.test(documentXml);
}
