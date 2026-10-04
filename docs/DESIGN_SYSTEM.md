# GridSense Design System

A lightweight, single-source-of-truth reference for everyone touching the GridSense UI — designers, UX researchers, engineers, and reviewers.

> **Art direction:** read [`ART_DIRECTION.md`](./ART_DIRECTION.md) first — “Living grid paper,” one-product tests (brand / seam / register / job). This file is the token & component inventory; that file is the *why*.

> **Live page:** open the running app at `/__design-system` for an always-current view of every token, swatch, contrast ratio and component pattern. The page reads CSS custom properties at runtime, so it cannot drift from the codebase.

## Why this exists

- **Designers** — see exactly which tokens, primitives and patterns are available before designing a new screen.
- **UX** — verify accessibility commitments (contrast, reduced motion, screen-reader patterns) at a glance.
- **Engineers** — one place to copy semantic class names instead of hand-rolling colours.
- **Reviewers / hiring managers** — evidence that the system has been considered, not just assembled.

## Foundations at a glance

| Layer | Where it lives | Notes |
|---|---|---|
| Color tokens | `src/index.css` (`:root`, `.dark`) | All tokens are HSL triples consumed via `hsl(var(--token))`. |
| Tailwind aliases | `tailwind.config.ts` | Semantic colour, radius, shadow and font families. |
| Typography | Plus Jakarta Sans (UI / HUD / titles / personality italic), Inconsolata (dense data). | See [`TYPOGRAPHY.md`](./TYPOGRAPHY.md). Loaded in `index.css`. |
| Radius | `--radius: 1.25rem` (lg). md/sm derived. | Soft, friendly shapes throughout. |
| Spacing | Tailwind default `4px` scale. | No custom spacing scale needed. |
| Shadow | `--shadow-sm/md/lg/xl`. | Used sparingly; surfaces favour borders + elevation through colour. |

## Color families

- **Semantic** — `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`.
- **Intensity** — `intensity-very-low → very-high` (the carbon-intensity scale).
- **Generation mix** — `gen-wind`, `gen-solar`, `gen-nuclear`, `gen-gas`, `gen-coal`, `gen-hydro`, `gen-biomass`, `gen-imports`, `gen-other`.
- **Sky gradients** — `--sky-clean`, `--sky-moderate`, `--sky-dirty` (used by `IntensityScene`).

## Component inventory

- **Primitives** — shadcn/Radix wrappers in `src/components/ui/*` (Button, Card, Dialog, Tabs, Tooltip, Toast/Sonner, etc.).
- **App components** — `IntensityGauge`, `GenerationMixBar`, `ForecastChart`, `StaleDataBadge`, `OfflineIndicator`, `TurbineSpinner`, `ErrorState`, `EmptyState`.
- **Scene** — see `/__scene-test` for the full living scene catalogue, and [`SCENE_VISUAL_QA.md`](./SCENE_VISUAL_QA.md) for the QA checklist.

## Accessibility commitments

- WCAG 2.1 **AA** as the floor. Body text ≥ 4.5:1, large text ≥ 3:1.
- `prefers-reduced-motion: reduce` collapses all CSS animations/transitions to ≤ 1ms (see `src/index.css`).
- Recharts canvases are mirrored as `sr-only` data tables for screen readers.
- Connectivity changes use `role="alert"` / `aria-live="polite"`.
- Focus rings use the `--ring` token; never removed without a replacement.

## How we measure accessibility

We treat AA as a thing to **prove**, not declare:

| Layer | Tool | Evidence |
|---|---|---|
| Static token contrast | live matrix on `/__design-system → Accessibility` | computed from the active theme at runtime |
| Page-level a11y rules | [axe-core](https://github.com/dequelabs/axe-core) via Playwright (`scripts/a11y-audit.ts`) | dated reports in [`docs/a11y/`](./a11y/) |
| Dynamic scene contrast | `SceneContrastMatrix` on `/__design-system → Accessibility` | sky colour sampled per (time × intensity) and graded vs white / near-black |
| Manual screen reader | VoiceOver / NVDA walkthrough | recorded in `docs/a11y/MANUAL_*.md` when performed |

To run a fresh axe pass:

```bash
bun run build
bunx playwright install chromium   # one-off
bun scripts/a11y-audit.ts          # writes docs/a11y/YYYY-MM-DD.md
```

Override `BASE_URL` to audit a deployed environment instead of the local preview.

## Scene contrast (dynamic backgrounds)

`IntensityScene` paints a sky gradient that varies with time-of-day, weather and grid carbon intensity, so a single text colour cannot pass AA in every state. The system rule:

> Any text overlaying the scene **must remain readable** — prefer a soft gradient wash + text shadow for the hero number (Carrot-style scene-as-HUD), or a scrim (`bg-background/70 backdrop-blur-md`) for denser overlays. Contrast is judged against the wash / `--background`, not the live sky alone.

The `/__design-system → Accessibility → Scene contrast` tab samples the sky-top colour for every (time × intensity) cell and grades it, and flags any cell that needs the scrim.

## Adding to the system

1. **A new token** — add it to `:root` and `.dark` in `src/index.css`, then expose it under `theme.extend.colors` in `tailwind.config.ts`. The `/__design-system` page picks it up automatically.
2. **A new component** — prefer composing existing primitives. If you need a new one, add it to `src/components/ui/` and reference it from the inventory section of the live page.
3. **A new pattern** — document it in the Patterns section so the next contributor doesn't reinvent it.
