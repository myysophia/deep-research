import { type NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { analyzeRevisionDocx } from "@/utils/revision-docx";

export const runtime = "nodejs";

function isDocxFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("INVALID_PARAMS", "请上传 docx 文件。", 400);
    }
    if (!isDocxFile(file)) {
      return jsonError("INVALID_FILE_TYPE", "当前仅支持 .docx 文件。", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const analysis = await analyzeRevisionDocx({
      fileName: file.name,
      arrayBuffer,
    });

    return jsonOk({
      analysis,
      authors: analysis.authors,
      anchors: analysis.anchors,
      stats: analysis.stats,
    });
  } catch (error) {
    return jsonError("REVISION_ANALYZE_FAILED", parseError(error), 500);
  }
}

