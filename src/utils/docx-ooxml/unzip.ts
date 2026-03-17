import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";

function toBlob(input: ArrayBuffer | Uint8Array) {
  if (input instanceof Uint8Array) {
    return new Blob([input]);
  }
  return new Blob([new Uint8Array(input)]);
}

export async function readDocxXmlEntries(input: ArrayBuffer | Uint8Array) {
  const reader = new ZipReader(new BlobReader(toBlob(input)));

  try {
    const entries = await reader.getEntries();
    const xmlEntries: Record<string, string> = {};

    for (const entry of entries) {
      if (!entry.filename.endsWith(".xml")) continue;
      xmlEntries[entry.filename] = await entry.getData!(new TextWriter());
    }

    return xmlEntries;
  } finally {
    await reader.close();
  }
}
