"use client";
import dynamic from "next/dynamic";
import { cn } from "@/utils/style";
import { buildPaperToc, renderPaperArtifactMarkdown } from "@/utils/paper";

const MarkdownView = dynamic(() => import("@/components/MagicDown/View"));

type PaperPreviewProps = {
  paperDocument: PaperDocument;
  className?: string;
};

function PaperPreview({ paperDocument, className }: PaperPreviewProps) {
  const toc = buildPaperToc(paperDocument);
  const { layoutConfig } = paperDocument;

  return (
    <article
      className={cn(
        "magicdown-view mx-auto max-w-4xl rounded-xl border bg-background p-6 shadow-sm print:max-w-none print:border-none print:p-0",
        className
      )}
      style={{
        fontFamily: layoutConfig.bodyFontFamily,
        fontSize: `${layoutConfig.bodyFontSize}pt`,
        lineHeight: String(layoutConfig.lineSpacing),
        letterSpacing: `${layoutConfig.letterSpacing}px`,
      }}
    >
      <header className="mb-8 border-b pb-6 text-center">
        <p className="mb-2 text-xs tracking-[0.3em] text-muted-foreground">
          论文模式
        </p>
        <h1
          className="font-semibold leading-tight"
          style={{
            fontFamily: layoutConfig.titleFontFamily,
            fontSize: `${layoutConfig.titleFontSize}pt`,
          }}
        >
          {paperDocument.title || "未命名论文"}
        </h1>
        {layoutConfig.headerTextLeft || layoutConfig.headerTextRight ? (
          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>{layoutConfig.headerTextLeft}</span>
            <span>{layoutConfig.headerTextRight}</span>
          </div>
        ) : null}
      </header>

      {toc.length > 0 ? (
        <section className="mb-8 rounded-lg border bg-muted/30 p-4 print:break-after-page">
          <h2 className="mb-3 text-center text-lg font-semibold">目录</h2>
          <ol className="space-y-2">
            {toc.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3"
                style={{ paddingLeft: `${(item.level - 1) * 20}px` }}
              >
                <a
                  className="flex-1 text-sm hover:text-blue-600"
                  href={`#${item.id}`}
                >
                  {item.numbering ? `${item.numbering} ` : ""}
                  {item.heading}
                </a>
                <span className="border-b border-dotted border-muted-foreground/50 flex-1" />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <main className="space-y-8">
        {paperDocument.abstractZh ? (
          <section>
            <h2 className="mb-3 text-xl font-semibold">摘要</h2>
            <p
              className="whitespace-pre-wrap"
              style={{
                textIndent: `${layoutConfig.firstLineIndentChars * 2}em`,
              }}
            >
              {paperDocument.abstractZh}
            </p>
            {paperDocument.keywordsZh.length > 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                关键词：{paperDocument.keywordsZh.join("；")}
              </p>
            ) : null}
          </section>
        ) : null}

        {paperDocument.sections.map((section) => {
          const artifacts = paperDocument.artifacts.filter(
            (artifact) => artifact.placementSectionId === section.id
          );

          return (
            <section id={section.id} key={section.id} className="space-y-4">
              {section.level === 1 ? (
                <h2 className="font-semibold leading-tight">
                  {section.numbering ? `${section.numbering} ` : ""}
                  {section.heading}
                </h2>
              ) : section.level === 2 ? (
                <h3 className="font-semibold leading-tight">
                  {section.numbering ? `${section.numbering} ` : ""}
                  {section.heading}
                </h3>
              ) : (
                <h4 className="font-semibold leading-tight">
                  {section.numbering ? `${section.numbering} ` : ""}
                  {section.heading}
                </h4>
              )}
              {section.markdown ? <MarkdownView>{section.markdown}</MarkdownView> : null}
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-lg border p-4">
                  <MarkdownView>{renderPaperArtifactMarkdown(artifact)}</MarkdownView>
                </div>
              ))}
            </section>
          );
        })}

        {paperDocument.references.length > 0 &&
        !paperDocument.sections.some((section) =>
          /参考文献|references/i.test(section.heading)
        ) ? (
          <section id="paper-references" className="space-y-4">
            <h2 className="font-semibold leading-tight">参考文献</h2>
            <ol className="space-y-2 text-sm">
              {paperDocument.references.map((item, index) => (
                <li key={`${item.url}-${index}`}>
                  [{index + 1}] {item.title || item.url}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </main>

      {layoutConfig.footerText || layoutConfig.showPageNumber ? (
        <footer className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
          {layoutConfig.footerText ? <div>{layoutConfig.footerText}</div> : null}
          {layoutConfig.showPageNumber ? <div>页码将在导出 DOCX 中自动生成</div> : null}
        </footer>
      ) : null}
    </article>
  );
}

export default PaperPreview;
