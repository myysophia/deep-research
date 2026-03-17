import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import * as templateRepo from "@/utils/template-repo";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 获取模板的历史版本列表
 * 返回: { history: Array<{ version: number; updatedAt: number; revisionNote?: string }> }
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  if (!id) {
    return jsonError("INVALID_PARAMS", "缺少模板 id。", 400);
  }

  try {
    const history = await templateRepo.getHistory(id);

    if (history === null) {
      return jsonError("TEMPLATE_NOT_FOUND", `未找到模板：${id}`, 404);
    }

    return jsonOk({ history });
  } catch (error) {
    return jsonError("TEMPLATE_HISTORY_FAILED", parseError(error), 500);
  }
}
