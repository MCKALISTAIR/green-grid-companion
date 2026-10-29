#!/usr/bin/env node
/**
 * No em dashes (U+2014) in user-facing copy (Design copy pass, acceptance check 2).
 *
 * Scope: every .ts/.tsx under src/, plus index.html, public/manifest.json and
 * supabase/functions/**\/index.ts. Comments never count: TS/TSX files are parsed
 * with the TypeScript compiler and only string, template and JSX-text tokens are
 * checked, so `//`, `/* *\/` and JSX `{/* *\/}` comments are ignored.
 *
 * Usage: node scripts/check-no-em-dash.mjs   (exits 1 and lists hits on failure)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const EM_DASH = '\u2014';

/** Files that are out of scope (tests, design-system demos, tokens, generated types). */
const EXCLUDE = [
  /\.test\.[cm]?[jt]sx?$/,
  /^src\/pages\/DesignSystem/,
  // Only rendered inside the DesignSystem page (developer docs, not user copy).
  /^src\/components\/SceneContrastMatrix\.tsx$/,
  /^src\/lib\/designTokens\.ts$/,
  /^src\/integrations\/supabase\/types\.ts$/,
];

/** Files exempt from the check. PrivacyPolicy entry removed once C2 landed. */
export const ALLOWLIST = [];

const TEXT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

/** Returns `{ line, text }` for every string/template/JSX-text token holding an em dash. */
export function findEmDashesInSource(fileName, source) {
  if (!source.includes(EM_DASH)) return [];
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const hits = [];
  const visit = (node) => {
    if (TEXT_KINDS.has(node.kind)) {
      const raw = node.getText(sf);
      if (raw.includes(EM_DASH)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        hits.push({ line: line + 1, text: raw.trim().slice(0, 120) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

/** HTML: drop `<!-- -->` comments, then flag any em dash left. */
export function findEmDashesInHtml(source) {
  const stripped = source.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  return stripped
    .split('\n')
    .map((text, i) => ({ line: i + 1, text: text.trim().slice(0, 120) }))
    .filter((h) => h.text.includes(EM_DASH));
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Scans the repo at `root` and returns every hit as `{ file, line, text }`. */
export function findEmDashes(root) {
  const rel = (p) => relative(root, p).split(sep).join('/');
  const files = [];
  for (const p of walk(join(root, 'src'), [])) {
    if (/\.tsx?$/.test(p) && !p.endsWith('.d.ts')) files.push(p);
  }
  const fnDir = join(root, 'supabase', 'functions');
  if (existsSync(fnDir)) {
    for (const p of walk(fnDir, [])) if (p.endsWith(`${sep}index.ts`)) files.push(p);
  }
  const hits = [];
  for (const p of files) {
    const r = rel(p);
    if (EXCLUDE.some((re) => re.test(r)) || ALLOWLIST.includes(r)) continue;
    for (const h of findEmDashesInSource(p, readFileSync(p, 'utf8'))) hits.push({ file: r, ...h });
  }
  for (const r of ['index.html', 'public/manifest.json']) {
    const p = join(root, r);
    if (!existsSync(p)) continue;
    for (const h of findEmDashesInHtml(readFileSync(p, 'utf8'))) hits.push({ file: r, ...h });
  }
  return hits;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
  const hits = findEmDashes(root);
  if (hits.length) {
    console.error(`Em dashes in user-facing copy (${hits.length}):`);
    for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.text}`);
    console.error('Use a comma, colon or full stop instead (voice guide).');
    process.exit(1);
  }
  console.log('No em dashes in user-facing copy.');
}
