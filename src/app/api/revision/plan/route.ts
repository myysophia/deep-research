import { type NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { createRevisionPlan, revisionPlanRequestSchema } from "@/utils/revision-docx";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = revisionPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("INVALID_PARAMS", parsed.error.message, 400);
    }

    const result = createRevisionPlan({
      analysis: parsed.data.analysis,
      selectedAuthors: parsed.data.selectedAuthors,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError("REVISION_PLAN_FAILED", parseError(error), 500);
  }
}

