function decodeXmlAttribute(text: string) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readAttr(xml: string, attrName: string) {
  const matched = new RegExp(`${attrName}="([^"]*)"`, "i").exec(xml);
  return matched ? decodeXmlAttribute(matched[1]) : undefined;
}

export function extractStyleSummaries(stylesXml: string) {
  const styles = stylesXml.match(/<w:style[\s\S]*?<\/w:style>/g) || [];

  return styles.map((styleXml) => {
    const nameMatch = /<w:name[^>]*w:val="([^"]+)"/i.exec(styleXml);
    const sizeMatch = /<w:sz[^>]*w:val="([^"]+)"/i.exec(styleXml);
    const eastAsiaMatch = /<w:rFonts[^>]*w:eastAsia="([^"]+)"/i.exec(styleXml);
    const alignMatch = /<w:jc[^>]*w:val="([^"]+)"/i.exec(styleXml);

    return {
      styleId: readAttr(styleXml, "w:styleId"),
      type: readAttr(styleXml, "w:type"),
      name: nameMatch?.[1],
      fontFamily: eastAsiaMatch?.[1],
      fontSizePt: sizeMatch?.[1] ? Number(sizeMatch[1]) / 2 : undefined,
      alignment: alignMatch?.[1],
      bold: /<w:b[\s/>]/i.test(styleXml),
    };
  });
}
