import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import { templateProfileSchema } from "@/utils/template-profile/schema";
import * as templateRepo from "@/utils/template-repo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = templateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    const saved = await templateRepo.save(parsed.data);
    return jsonOk(saved);
  } catch (error) {
    return jsonError("TEMPLATE_SAVE_FAILED", parseError(error), 500);
  }
}
