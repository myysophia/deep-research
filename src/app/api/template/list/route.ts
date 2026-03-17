import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";
import * as templateRepo from "@/utils/template-repo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await templateRepo.list();
    return jsonOk({ items });
  } catch (error) {
    return jsonError("TEMPLATE_LIST_FAILED", parseError(error), 500);
  }
}
