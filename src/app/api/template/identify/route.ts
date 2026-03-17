import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { extractTemplateProfileFromText } from "@/utils/template-profile/extractor";

export const runtime = "nodejs";

const requestSchema = z.object({
  fileName: z.string().min(1),
  textContent: z.string().min(1),
  documentKind: z.enum(["blank-template", "sample-paper"]).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    const result = extractTemplateProfileFromText(parsed.data);
    return jsonOk(result);
  } catch (error) {
    return jsonError("TEMPLATE_IDENTIFY_FAILED", parseError(error), 500);
  }
}
