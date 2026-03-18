import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/libs/saas/response";
import { buildTemplateThesisDocxBuffer } from "@/utils/thesis-template";
import { parseError } from "@/utils/error";
import { createDefaultThesisTemplateMeta } from "@/utils/paper";
import { templateProfileSchema } from "@/utils/template-profile/schema";
import { applyTemplateProfileToPaperDocument } from "@/utils/thesis-export/assemble";

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
      renderedPngBase64: z.string().optional(),
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
  templateProfile: templateProfileSchema.optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    console.info("[docx-export] 接收到 DOCX 导出请求", {
      title: parsed.data.paperDocument.title,
      sectionCount: parsed.data.paperDocument.sections.length,
      artifactCount: parsed.data.paperDocument.artifacts.length,
      artifacts: parsed.data.paperDocument.artifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.type,
        hasRenderedSvg: Boolean(artifact.renderedSvg),
        renderedSvgLength: artifact.renderedSvg?.length || 0,
        hasRenderedPngBase64: Boolean(artifact.renderedPngBase64),
        renderedPngBase64Length: artifact.renderedPngBase64?.length || 0,
        contentPreview: artifact.content.slice(0, 120),
      })),
    });
    const exportPaperDocument = applyTemplateProfileToPaperDocument(
      {
        ...parsed.data.paperDocument,
        templateMeta:
          parsed.data.paperDocument.templateMeta ||
          createDefaultThesisTemplateMeta(),
      },
      parsed.data.templateProfile
    );
    const buffer = await buildTemplateThesisDocxBuffer({
      ...exportPaperDocument,
    });
    console.info("[docx-export] DOCX 构建完成", {
      title: parsed.data.paperDocument.title,
      bufferSize: buffer.byteLength,
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
    console.error("[docx-export] DOCX 导出失败", error);
    return jsonError("EXPORT_FAILED", parseError(error), 500);
  }
}
