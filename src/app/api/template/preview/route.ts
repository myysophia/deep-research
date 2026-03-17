import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { templateProfileSchema } from "@/utils/template-profile/schema";
import { validateTemplateProfile } from "@/utils/template-profile/validate";

export const runtime = "nodejs";

const requestSchema = z.object({
  profile: templateProfileSchema,
  formatSpecId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    const validation = validateTemplateProfile(
      parsed.data.profile,
      parsed.data.formatSpecId
    );

    return jsonOk({
      preview: validation.preview,
      detail: validation.detail,
      canExport: validation.canExport,
      issues: validation.issues,
    });
  } catch (error) {
    return jsonError("TEMPLATE_PREVIEW_FAILED", parseError(error), 500);
  }
}
