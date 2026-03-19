import { type NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { exportRevisedDocx, revisionExportRequestSchema } from "@/utils/revision-docx";

export const runtime = "nodejs";

function toOutputFileName(inputName: string) {
  const name = inputName.replace(/\.docx$/i, "");
  const safeName = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "论文";
  return `${safeName}-自动修改稿.docx`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = revisionExportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("INVALID_PARAMS", parsed.error.message, 400);
    }

    const fileBuffer = await exportRevisedDocx({
      analysis: parsed.data.analysis,
      patches: parsed.data.patches,
    });
    const fileName = toOutputFileName(parsed.data.analysis.fileName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    return jsonError("REVISION_EXPORT_FAILED", parseError(error), 500);
  }
}

