import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import * as templateRepo from "@/utils/template-repo";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  if (!id) {
    return jsonError("INVALID_PARAMS", "缺少模板 id。", 400);
  }

  try {
    const profile = await templateRepo.getById(id);

    if (!profile) {
      return jsonError("TEMPLATE_NOT_FOUND", `未找到模板：${id}`, 404);
    }

    return jsonOk(profile);
  } catch (error) {
    return jsonError("TEMPLATE_DETAIL_FAILED", parseError(error), 500);
  }
}
