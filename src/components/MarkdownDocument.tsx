import { parseMarkdown, renderInline } from '@/lib/simpleMarkdown';

/** Renders our own legal Markdown (see src/lib/simpleMarkdown.tsx). */
export function MarkdownDocument({ source }: { source: string }) {
  return (
    <>
      {parseMarkdown(source).map((b, i) => {
        const k = `b${i}`;
        switch (b.type) {
          case 'heading':
            return b.level === 1
              ? <h2 key={k} className="text-2xl font-semibold text-foreground">{renderInline(b.text, k)}</h2>
              : b.level === 2
                ? <h2 key={k} className="pt-2 text-lg font-semibold text-foreground">{renderInline(b.text, k)}</h2>
                : <h3 key={k} className="text-base font-semibold text-foreground">{renderInline(b.text, k)}</h3>;
          case 'list':
            return (
              <ul key={k} className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {b.items.map((it, j) => <li key={`${k}-${j}`}>{renderInline(it, `${k}-${j}`)}</li>)}
              </ul>
            );
          case 'quote':
            return (
              <blockquote key={k} className="space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                {b.lines.map((l, j) => <p key={`${k}-${j}`}>{renderInline(l, `${k}-${j}`)}</p>)}
              </blockquote>
            );
          default:
            return <p key={k} className="text-sm leading-relaxed text-muted-foreground">{renderInline(b.text, k)}</p>;
        }
      })}
    </>
  );
}
