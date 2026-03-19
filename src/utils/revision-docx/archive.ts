import {
  BlobReader,
  BlobWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";

export interface BinaryArchiveEntry {
  name: string;
  data: Uint8Array;
}

function toBlob(input: ArrayBuffer | Uint8Array) {
  if (input instanceof Uint8Array) {
    return new Blob([input]);
  }
  return new Blob([new Uint8Array(input)]);
}

export async function readDocxArchive(input: ArrayBuffer | Uint8Array) {
  const reader = new ZipReader(new BlobReader(toBlob(input)));
  const entries: BinaryArchiveEntry[] = [];

  try {
    const zipEntries = await reader.getEntries();
    for (const entry of zipEntries) {
      if (entry.directory) continue;
      if (!("getData" in entry) || typeof entry.getData !== "function") continue;
      const data = await entry.getData(new Uint8ArrayWriter());
      entries.push({
        name: entry.filename,
        data,
      });
    }
    return entries;
  } finally {
    await reader.close();
  }
}

export async function writeDocxArchive(entries: BinaryArchiveEntry[]) {
  const writer = new ZipWriter(new BlobWriter("application/zip"));

  for (const entry of entries) {
    await writer.add(entry.name, new Uint8ArrayReader(entry.data));
  }

  const blob = await writer.close();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export function encodeArchiveBase64(entries: BinaryArchiveEntry[]) {
  return entries.map((entry) => ({
    name: entry.name,
    base64: Buffer.from(entry.data).toString("base64"),
  }));
}

export function decodeArchiveBase64(
  entries: Array<{ name: string; base64: string }>
) {
  return entries.map((entry) => ({
    name: entry.name,
    data: new Uint8Array(Buffer.from(entry.base64, "base64")),
  }));
}

