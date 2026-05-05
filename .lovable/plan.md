## Goal

Create a single, lightweight design-system reference page inside the app — accessible at `/__design-system` — that any designer, UX researcher or new engineer can open to understand GridSense's visual language, component vocabulary and accessibility commitments without reading the codebase.

This is documentation-as-code: it reads tokens directly from CSS variables so it stays in sync automatically.

## Scope

In scope:
- One new route `/__design-system` (sibling to `/__scene-test`, `/__turbine-test`)
- Sourced from live CSS tokens — no hard-coded duplicates
- Sectioned single page, no auth, no nav entry (discoverable by URL only)

Out of scope:
- Figma library or external design tool
- Storybook (overkill for this stage)
- Refactoring components

## Page structure

```text
/__design-system
├── 1. Foundations
│   ├── Brand & voice (1 paragraph)
│   ├── Color tokens (semantic + intensity + generation mix)
│   ├── Typography (Work Sans / Lora / Inconsolata samples)
│   ├── Spacing & radius scale
│   ├── Shadow scale
│   └── Sky gradients (clean / moderate / dirty)
├── 2. Component inventory
│   ├── Primitives (Button, Input, Card, Badge, Dialog, Tooltip, Tabs)
│   ├── App components (IntensityGauge, GenerationMixBar, ForecastChart,
│   │   StaleDataBadge, OfflineIndicator, TurbineSpinner)
│   └── Scene elements (link to /__scene-test)
├── 3. Patterns
│   ├── Loading (TurbineSpinner + skeletons)
│   ├── Empty state
│   ├── Error state
│   ├── Stale data badge
│   └── Toast (sonner top-center)
├── 4. Accessibility
│   ├── Commitments (WCAG AA, reduced motion, sr-only tables, ARIA live)
│   ├── Contrast matrix (token vs token, computed live)
│   ├── Reduced-motion behaviour
│   └── Screen-reader patterns
└── 5. Handover notes
    ├── How to add a token
    ├── How to add a component
    └── Links: /__scene-test, /__turbine-test, docs/SCENE_VISUAL_QA.md
```

## Files to create

- `src/pages/DesignSystem.tsx` — the page itself, broken into small section components inline
- `src/lib/designTokens.ts` — pure helper that reads computed CSS variables at runtime and returns `{ name, hsl, hex, contrastVsBg }` so the page stays automatically in sync with `index.css`
- `docs/DESIGN_SYSTEM.md` — short markdown companion (one-screen summary + link to the live page) for portfolio/recruiter readers who don't run the app

## Files to edit

- `src/App.tsx` — register the lazy-loaded route `/__design-system`
- `README.md` — add a single line under "Developer Structure" pointing to the new route and the markdown doc

## Technical notes

- Read tokens live with `getComputedStyle(document.documentElement).getPropertyValue('--primary')` so the page automatically reflects light and dark mode. A small theme toggle at the top of the page lets reviewers flip between them in place.
- Compute contrast ratios with a tiny inline `hslToRgb` + WCAG luminance helper — no new dependency.
- Render swatches as accessible `button` elements with copyable token names (clipboard) so designers can grab `--primary` / `bg-primary` without inspecting the DOM.
- Use existing shadcn primitives (`Card`, `Tabs`, `Badge`, `Tooltip`) so the page itself is a working example of the system.
- Keep the route URL-only (no nav link) — it is a contributor/reviewer surface, not a user surface. Same convention as `/__scene-test`.
- No tests required for a static reference page; rely on visual review.

## Why this matters (per earlier audit)

- **Design lead's ask** — "show me what you cut and what's actually in the system": the inventory makes the surface area visible and editable.
- **UX lead's ask** — "show me your accessibility rigour": the contrast matrix and reduced-motion notes turn claims into evidence.
- **Engineering lead's ask** — "show me you can sustain this": a single source of truth for tokens reduces drift as the app grows.

## Acceptance

- Visiting `/__design-system` renders without errors in light and dark mode.
- All swatches reflect the current values in `src/index.css` (verified by editing one token and reloading).
- Contrast ratios are shown with pass/fail badges against WCAG AA (4.5:1 body, 3:1 large text).
- `docs/DESIGN_SYSTEM.md` exists and links to the route.
- README mentions the new route in one line.
