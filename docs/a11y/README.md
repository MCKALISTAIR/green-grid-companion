# Accessibility audit reports

This folder contains **dated, machine-generated** accessibility audit reports
produced by `scripts/a11y-audit.ts` (axe-core + Playwright).

## Run an audit

```bash
bun run build
bunx playwright install chromium   # one-off, downloads the browser
bun scripts/a11y-audit.ts
```

This boots `vite preview`, walks the routes listed in the script with
axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`), and writes
`docs/a11y/YYYY-MM-DD.md`.

To audit the deployed site instead of the local build:

```bash
BASE_URL=https://gridsense-app.lovable.app bun scripts/a11y-audit.ts
```

## What automated tooling does and doesn't catch

Axe-core finds roughly **30–40%** of WCAG issues — programmatic checks like
missing alt text, contrast on static colours, ARIA misuse and label
associations. It does **not** verify:

- screen-reader narration quality
- keyboard navigation order and trap-freedom
- contrast over dynamic gradients (covered separately in
  `/__design-system → Scene contrast`)
- cognitive / content clarity

Treat each report as a **floor**, not a ceiling. Manual VoiceOver / NVDA
walkthroughs are documented separately when performed.
