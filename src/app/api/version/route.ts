import pkg from "../../../../package.json";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonOk({
      version: pkg.version,
    });
  } catch (error) {
    return jsonError("VERSION_READ_FAILED", parseError(error), 500);
  }
}
