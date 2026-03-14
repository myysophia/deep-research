import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/libs/saas/response";
import { buildTemplateThesisDocxBuffer } from "@/utils/thesis-template";
import { parseError } from "@/utils/error";
import { createDefaultThesisTemplateMeta } from "@/utils/paper";

export const runtime = "nodejs";

const paperLayoutSchema = z.object({
  paperSize: z.literal("A4"),
  pageMargins: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
  }),
  bindingSide: z.literal("left"),
  titleFontFamily: z.string(),
  titleFontSize: z.number(),
  bodyFontFamily: z.string(),
  bodyFontSize: z.number(),
  lineSpacing: z.number(),
  letterSpacing: z.number(),
  paragraphSpacingBefore: z.number(),
  paragraphSpacingAfter: z.number(),
  firstLineIndentChars: z.number(),
  headerTextLeft: z.string(),
  headerTextRight: z.string(),
  footerText: z.string(),
  showPageNumber: z.boolean(),
  pageNumberPosition: z.enum(["left", "center", "right"]),
  frontMatterPageNumberStyle: z.enum(["roman", "decimal"]),
  bodyPageNumberStyle: z.literal("decimal"),
});

const paperDocumentSchema = z.object({
  title: z.string(),
  abstractZh: z.string(),
  abstractEn: z.string(),
  keywordsZh: z.array(z.string()),
  keywordsEn: z.array(z.string()),
  references: z.array(
    z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      url: z.string(),
    })
  ),
  sections: z.array(
    z.object({
      id: z.string(),
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      numbering: z.string(),
      heading: z.string(),
      markdown: z.string(),
    })
  ),
  artifacts: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["table", "mermaid"]),
      title: z.string(),
      placementSectionId: z.string(),
      content: z.string(),
      isSyntheticData: z.boolean(),
      note: z.string().optional(),
      renderedSvg: z.string().optional(),
    })
  ),
  layoutConfig: paperLayoutSchema,
  templateMeta: z
    .object({
      subtitle: z.string(),
      college: z.string(),
      major: z.string(),
      className: z.string(),
      studentName: z.string(),
      studentId: z.string(),
      advisor: z.string(),
      completionDate: z.string(),
      acknowledgements: z.string(),
    })
    .optional(),
});

const requestSchema = z.object({
  paperDocument: paperDocumentSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    const buffer = await buildTemplateThesisDocxBuffer({
      ...parsed.data.paperDocument,
      templateMeta:
        parsed.data.paperDocument.templateMeta ||
        createDefaultThesisTemplateMeta(),
    });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          `${parsed.data.paperDocument.title || "论文"}.docx`
        )}"`,
      },
    });
  } catch (error) {
    return jsonError("EXPORT_FAILED", parseError(error), 500);
  }
}
