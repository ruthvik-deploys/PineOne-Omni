import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Research documents as readable prose, styled with tokens only. Tables scroll inside their own box. */
const components: Components = {
  h1: (p) => <h2 className="mt-10 text-xl font-semibold first:mt-0" {...p} />,
  h2: (p) => <h2 className="mt-10 text-xl font-semibold first:mt-0" {...p} />,
  h3: (p) => <h3 className="mt-8 text-lg font-semibold" {...p} />,
  h4: (p) => <h4 className="mt-6 font-semibold" {...p} />,
  p: (p) => <p className="mt-4 leading-7" {...p} />,
  ul: (p) => <ul className="mt-4 list-disc space-y-2 pl-6 leading-7" {...p} />,
  ol: (p) => <ol className="mt-4 list-decimal space-y-2 pl-6 leading-7" {...p} />,
  li: (p) => <li className="pl-1 [&>ol]:mt-2 [&>p]:mt-0 [&>ul]:mt-2" {...p} />,
  a: (p) => <a className="underline underline-offset-4" target="_blank" rel="noreferrer" {...p} />,
  blockquote: (p) => <blockquote className="mt-4 border-l-2 border-border pl-4 text-muted-foreground" {...p} />,
  hr: () => <hr className="my-8 border-border" />,
  code: (p) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm" {...p} />,
  pre: (p) => <pre className="mt-4 rounded-lg bg-muted p-4 text-sm break-words whitespace-pre-wrap [&>code]:bg-transparent [&>code]:p-0" {...p} />,
  table: (p) => (
    <div className="mt-4 overflow-x-auto rounded-lg ring-1 ring-border">
      <table className="w-full text-left text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b border-border bg-muted px-3 py-2 font-medium" {...p} />,
  td: (p) => <td className="border-b border-border px-3 py-2 align-top" {...p} />,
  img: (p) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img className="mt-4 rounded-lg" loading="lazy" {...p} />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
