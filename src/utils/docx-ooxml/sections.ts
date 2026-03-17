function twipToCm(value?: string) {
  if (!value) return undefined;
  return Number((Number(value) / 567).toFixed(2));
}

function readAttr(xml: string, attrName: string) {
  const matched = new RegExp(`${attrName}="([^"]*)"`, "i").exec(xml);
  return matched?.[1];
}

export function extractSectionRules(documentXml: string) {
  const sections = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];

  return sections.map((sectionXml, index) => {
    const marginXml = /<w:pgMar[^>]+>/i.exec(sectionXml)?.[0] || "";
    const pageNumXml = /<w:pgNumType[^>]+>/i.exec(sectionXml)?.[0] || "";

    return {
      index: index + 1,
      marginsCm: {
        top: twipToCm(readAttr(marginXml, "w:top")) || 2.54,
        right: twipToCm(readAttr(marginXml, "w:right")) || 2.54,
        bottom: twipToCm(readAttr(marginXml, "w:bottom")) || 2.54,
        left: twipToCm(readAttr(marginXml, "w:left")) || 2.54,
      },
      hasDifferentFirstPage: /<w:titlePg\/?>/i.test(sectionXml),
      pageNumberStart: pageNumXml
        ? Number(readAttr(pageNumXml, "w:start") || "1")
        : undefined,
      pageNumberFormat:
        readAttr(pageNumXml, "w:fmt") === "roman" ? "roman" : "decimal",
    };
  });
}
