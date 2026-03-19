import { type NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { applyRevisionPlan, revisionApplyRequestSchema } from "@/utils/revision-docx";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = revisionApplyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("INVALID_PARAMS", parsed.error.message, 400);
    }

    const result = await applyRevisionPlan({
      analysis: parsed.data.analysis,
      decisions: parsed.data.decisions,
      llm: parsed.data.llm,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError("REVISION_APPLY_FAILED", parseError(error), 500);
  }
}

