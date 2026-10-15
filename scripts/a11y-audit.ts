/**
 * Accessibility audit using axe-core + Playwright (Chromium).
 *
 * Spawns `vite preview` against the production build, walks key public routes,
 * and writes a dated Markdown report to `docs/a11y/<YYYY-MM-DD>.md`.
 *
 * Usage:
 *   bun run build
 *   bun scripts/a11y-audit.ts
 *
 * Override the base URL with `BASE_URL=https://example.com bun scripts/a11y-audit.ts`
 * to skip the local preview spawn (useful for auditing the deployed site).
 */
import { chromium, type Browser } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROUTES: Array<{ path: string; label: string }> = [
  { path: '/', label: 'Home (anonymous)' },
  { path: '/onboarding', label: 'Onboarding' },
  { path: '/history', label: 'History' },
  { path: '/planner', label: 'Planner' },
  { path: '/settings', label: 'Settings' },
  { path: '/help', label: 'Help' },
  { path: '/glossary', label: 'Glossary' },
  { path: '/__design-system', label: 'Design system' },
];

const PREVIEW_PORT = 4173;

async function waitForServer(url: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview server didn't respond at ${url} within ${timeoutMs}ms`);
}

function startPreview(): ChildProcess {
  const runner = process.versions.bun ? 'bunx' : 'npx';
  const proc = spawn(runner, ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  proc.stdout?.on('data', (d) => process.stdout.write(`[preview] ${d}`));
  proc.stderr?.on('data', (d) => process.stderr.write(`[preview] ${d}`));
  return proc;
}

interface RouteResult {
  path: string;
  label: string;
  url: string;
  violations: Array<{
    id: string;
    impact: string | null | undefined;
    help: string;
    helpUrl: string;
    nodes: number;
  }>;
  passes: number;
  incomplete: number;
  error?: string;
}

async function auditRoute(
  browser: Browser,
  baseUrl: string,
  route: { path: string; label: string },
): Promise<RouteResult> {
  const url = new URL(route.path, baseUrl).toString();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    return {
      path: route.path,
      label: route.label,
      url,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
      })),
    };
  } catch (err) {
    return {
      path: route.path,
      label: route.label,
      url,
      passes: 0,
      incomplete: 0,
      violations: [],
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await page.close();
  }
}

function impactRank(i: string | null | undefined): number {
  return { critical: 4, serious: 3, moderate: 2, minor: 1 }[i ?? ''] ?? 0;
}

function formatReport(baseUrl: string, results: RouteResult[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
  const totalNodes = results.reduce(
    (sum, r) => sum + r.violations.reduce((s, v) => s + v.nodes, 0),
    0,
  );

  let md = `# Accessibility audit — ${today}\n\n`;
  md += `**Tool:** [axe-core](https://github.com/dequelabs/axe-core) ${'4.x'} via Playwright (Chromium)\n`;
  md += `**Tags:** \`wcag2a\`, \`wcag2aa\`, \`wcag21a\`, \`wcag21aa\`\n`;
  md += `**Base URL:** \`${baseUrl}\`\n\n`;
  md += `## Summary\n\n`;
  md += `| Routes audited | Total violations | Affected nodes |\n|---|---|---|\n`;
  md += `| ${results.length} | ${totalViolations} | ${totalNodes} |\n\n`;

  md += `## Per route\n\n`;
  md += `| Route | Violations | Passes | Incomplete |\n|---|---|---|---|\n`;
  for (const r of results) {
    md += `| \`${r.path}\` (${r.label}) | ${r.error ? '—' : r.violations.length} | ${r.passes} | ${r.incomplete} |\n`;
  }
  md += `\n`;

  for (const r of results) {
    md += `### \`${r.path}\` — ${r.label}\n\n`;
    if (r.error) {
      md += `> ⚠️ Audit failed: ${r.error}\n\n`;
      continue;
    }
    if (r.violations.length === 0) {
      md += `_No automated violations._\n\n`;
      continue;
    }
    const sorted = [...r.violations].sort((a, b) => impactRank(b.impact) - impactRank(a.impact));
    md += `| Impact | Rule | Nodes | Help |\n|---|---|---|---|\n`;
    for (const v of sorted) {
      md += `| ${v.impact ?? '—'} | \`${v.id}\` | ${v.nodes} | [${v.help}](${v.helpUrl}) |\n`;
    }
    md += `\n`;
  }

  md += `## Caveats\n\n`;
  md += `- Automated tooling catches roughly **30–40%** of WCAG issues. Manual screen-reader and keyboard passes are required for full coverage.\n`;
  md += `- Authenticated routes and dynamic states (Octopus connected, error toasts visible, etc.) are not exercised here.\n`;
  md += `- Scene contrast is checked separately in \`/__design-system → Scene contrast\` because axe can't sample dynamic gradients.\n`;
  return md;
}

async function main() {
  const externalBase = process.env.BASE_URL;
  let preview: ChildProcess | null = null;
  let baseUrl: string;

  if (externalBase) {
    baseUrl = externalBase.replace(/\/$/, '');
    console.log(`Using external base URL: ${baseUrl}`);
  } else {
    baseUrl = `http://localhost:${PREVIEW_PORT}`;
    console.log(`Starting vite preview on ${baseUrl} ...`);
    preview = startPreview();
    await waitForServer(baseUrl);
  }

  const browser = await chromium.launch();
  const results: RouteResult[] = [];
  try {
    for (const route of ROUTES) {
      console.log(`→ auditing ${route.path}`);
      results.push(await auditRoute(browser, baseUrl, route));
    }
  } finally {
    await browser.close();
    if (preview) preview.kill('SIGTERM');
  }

  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(process.cwd(), 'docs', 'a11y');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${today}.md`);
  writeFileSync(outPath, formatReport(baseUrl, results), 'utf8');
  console.log(`\n✅ Wrote ${outPath}`);

  const totalViolations = results.reduce((s, r) => s + r.violations.length, 0);
  if (totalViolations > 0) {
    console.log(`⚠️  ${totalViolations} violation(s) found across ${results.length} route(s).`);
  } else {
    console.log(`🎉 No automated violations across ${results.length} route(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
