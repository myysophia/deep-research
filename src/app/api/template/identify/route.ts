import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { extractTemplateProfileFromText } from "@/utils/template-profile/extractor";
import { extractTemplateProfileFromDocx } from "@/utils/template-profile/from-docx";

export const runtime = "nodejs";

const requestSchema = z.object({
  fileName: z.string().min(1),
  textContent: z.string().min(1),
  documentKind: z.enum(["blank-template", "sample-paper"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let result;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const documentKind = formData.get("documentKind");

      if (!(file instanceof File)) {
        return jsonError("INVALID_FILE", "未检测到可识别的模板文件。", 400);
      }

      const normalizedDocumentKind =
        documentKind === "blank-template" ? "blank-template" : "sample-paper";
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith(".docx")) {
        result = await extractTemplateProfileFromDocx({
          fileName: file.name,
          arrayBuffer: await file.arrayBuffer(),
          documentKind: normalizedDocumentKind,
        });
      } else {
        result = extractTemplateProfileFromText({
          fileName: file.name,
          textContent: await file.text(),
          documentKind: normalizedDocumentKind,
        });
      }
    } else {
      const body = await req.json().catch(() => null);
      const parsed = requestSchema.safeParse(body);

      if (!parsed.success) {
        return jsonError("INVALID_PARAMS", parsed.error.message, 400);
      }

      result = extractTemplateProfileFromText(parsed.data);
    }

    return jsonOk(result);
  } catch (error) {
    return jsonError("TEMPLATE_IDENTIFY_FAILED", parseError(error), 500);
  }
}
