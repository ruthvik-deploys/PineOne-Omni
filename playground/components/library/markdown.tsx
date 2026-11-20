import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/**
 * Document typography. Each heading level is clearly its own step (size, weight, space above),
 * top-level sections open with a rule, and body text is set for long reading.
 * Headings get ids (rehype-slug) so the contents can link to them. Tokens only.
 */
const components: Components = {
  h1: (p) => (
    <h2
      className="mt-16 scroll-mt-20 border-t border-border pt-10 text-2xl leading-tight font-semibold tracking-tight text-balance first:mt-0 first:border-0 first:pt-0 sm:text-[1.75rem]"
      {...p}
    />
  ),
  h2: (p) => <h3 className="mt-12 scroll-mt-20 text-xl leading-snug font-semibold tracking-tight text-balance" {...p} />,
  h3: (p) => <h4 className="mt-9 scroll-mt-20 text-[1.0625rem] leading-snug font-semibold" {...p} />,
  h4: (p) => <h5 className="mt-8 scroll-mt-20 text-xs font-semibold tracking-wider text-muted-foreground uppercase" {...p} />,
  h5: (p) => <h6 className="mt-6 scroll-mt-20 text-sm font-semibold" {...p} />,
  h6: (p) => <h6 className="mt-6 scroll-mt-20 text-sm font-medium text-muted-foreground" {...p} />,
  p: (p) => <p className="mt-5 text-[1.0625rem] leading-[1.8] text-pretty text-foreground/85" {...p} />,
  strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
  ul: (p) => <ul className="mt-5 list-disc space-y-2.5 pl-6 text-[1.0625rem] leading-[1.75] text-foreground/85 marker:text-muted-foreground" {...p} />,
  ol: (p) => <ol className="mt-5 list-decimal space-y-2.5 pl-6 text-[1.0625rem] leading-[1.75] text-foreground/85 marker:text-muted-foreground" {...p} />,
  li: (p) => <li className="pl-1.5 [&>ol]:mt-2.5 [&>p]:mt-0 [&>ul]:mt-2.5" {...p} />,
  a: (p) => <a className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground" target="_blank" rel="noreferrer" {...p} />,
  blockquote: (p) => <blockquote className="mt-6 border-l-2 border-foreground/30 pl-5 [&>p]:mt-0 [&>p]:text-muted-foreground [&>p]:italic" {...p} />,
  hr: () => <hr className="my-12 border-border" />,
  code: (p) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em]" {...p} />,
  pre: (p) => <pre className="mt-6 rounded-lg bg-muted p-4 text-sm break-words whitespace-pre-wrap [&>code]:bg-transparent [&>code]:p-0" {...p} />,
  table: (p) => (
    <div className="mt-7 mb-2 overflow-x-auto rounded-lg ring-1 ring-border">
      <table className="w-full border-collapse text-left text-sm leading-relaxed" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b border-border bg-muted/60 px-4 py-3 align-bottom text-xs font-semibold tracking-wide text-muted-foreground uppercase [&_strong]:font-semibold [&_strong]:text-muted-foreground" {...p} />,
  td: (p) => <td className="border-b border-border px-4 py-3 align-top text-foreground/85 [tr:last-child>&]:border-b-0" {...p} />,
  img: (p) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img className="mt-6 rounded-lg" loading="lazy" {...p} />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
