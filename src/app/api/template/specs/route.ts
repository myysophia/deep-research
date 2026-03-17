import { jsonOk } from "@/libs/saas/response";
import { builtinFormatSpecs } from "@/utils/template-spec/builtin-specs";

export const runtime = "nodejs";

export async function GET() {
  return jsonOk({
    items: builtinFormatSpecs,
    defaultId: builtinFormatSpecs[0]?.id || "",
  });
}
