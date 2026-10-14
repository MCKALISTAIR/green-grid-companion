import type { ReactNode } from 'react';

/**
 * Tiny Markdown renderer for our own legal copy (src/content/*.md): headings,
 * paragraphs, "-" lists, "> " notes, **bold**, *italic*, `code`, [links](url)
 * and bare https URLs. Builds React elements (no raw HTML), so nothing in the
 * file is injected as markup. "[CONFIRM: ...]" draft markers are highlighted,
 * not hidden.
 */

export type MdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; lines: string[] };

export function parseMarkdown(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'paragraph', text: para.join(' ') });
    para = [];
  };
  for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (item) {
      flush();
      if (last?.type === 'list') last.items.push(item[1]);
      else blocks.push({ type: 'list', items: [item[1]] });
    } else if (quote) {
      flush();
      if (last?.type === 'quote') last.lines.push(quote[1]);
      else blocks.push({ type: 'quote', lines: [quote[1]] });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

const INLINE =
  /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[CONFIRM[^\]]*\]|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+[^\s).,;])/g;

function safeHref(href: string): string | null {
  return /^(https?:\/\/|mailto:|\/)/.test(href) ? href : null;
}

export function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0];
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${n++}`;
    if (tok.startsWith('**')) {
      out.push(
        <strong key={key} className="text-foreground">
          {renderInline(tok.slice(2, -2), key)}
        </strong>,
      );
    } else if (tok.startsWith('`')) {
      out.push(
        <code key={key} className="rounded bg-muted px-1 text-xs">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith('[CONFIRM')) {
      out.push(
        <mark
          key={key}
          data-testid="confirm-marker"
          className="rounded bg-amber-200/80 px-1 text-amber-950 dark:bg-amber-400/30 dark:text-amber-100"
        >
          [{renderInline(tok.slice(1, -1), `${key}c`)}]
        </mark>,
      );
    } else if (tok.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      const href = link ? safeHref(link[2]) : null;
      out.push(
        href ? (
          <a
            key={key}
            href={href}
            className="underline text-primary"
            {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {link![1]}
          </a>
        ) : (
          tok
        ),
      );
    } else if (tok.startsWith('http')) {
      out.push(
        <a
          key={key}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary break-all"
        >
          {tok}
        </a>,
      );
    } else {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), key)}</em>);
    }
    last = start + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
