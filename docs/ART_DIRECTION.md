# GridSense Art Direction — One Product Feel

**Status:** Locked product direction (2026-09-20)  
**Owner:** Product (Alistair)  
**Companion:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), [`SCENE_VISUAL_QA.md`](./SCENE_VISUAL_QA.md), Notion → Art direction

This document exists so GridSense reads as **one authored product with an end goal**, not a Carrot-ish scene glued to a shadcn dashboard.

---

## End goal (the product we are building)

Help someone decide **now or wait**, feel the UK grid as a living place, then **prove their shift** with meter truth.

Every visual choice must serve that loop. If it doesn’t teach the grid, support the decision, or earn trust in the proof — cut it.

---

## The one-product test

1. **Brand test** — Remove the name from the first viewport. Could this still only be GridSense? If it could be any eco app, branding/art is too weak or too generic.
2. **Seam test** — Screenshot scene alone, then sheet alone. Do they feel like the same hand drew both? Same paper, same softness, same green, same restraint?
3. **Register test** — Count illustration dialects on screen (chibi animal, industrial prop, Lucide icon row, gag UFO). More than **two** dialects = assembled.
4. **Job test** — Can a new user answer “use energy now or wait?” in under 5 seconds without hunting?

Fail any test → fix direction before adding features.

---

## Visual north star: “Living grid paper”

One sentence:

> A **hand-drawn UK energy landscape** under a **paper content sheet**, with typography that feels warm and precise — not clinical SaaS, not kids sticker book.

### Allowed visual registers (only these)

| Register | Where | Examples |
|---|---|---|
| **Landscape props** | Scene | Turbines, Eye, BESS, stacks, boats, hills — consistent “chibi-realistic” scale |
| **Diegetic wildlife** | Scene (countryside/coast) | Sheep, birds, bees, fox — grid-mood only, low frequency |
| **Paper UI** | Sheet, dock, dialogs | Soft surfaces, quiet borders, Plus Jakarta Sans throughout, Inconsolata for dense data |

### Paper UI / typography

| Role | Face | Where |
|---|---|---|
| **UI + HUD** | Plus Jakarta Sans | Nav, sheet, band labels (High / Moderate), page titles, now-or-wait |
| **Personality** | Same family, italic | Energy fact line — distinct voice without a second face |
| **Data** | Inconsolata | Dense figures in charts, tables, codes — not the hero intensity number |

Hero intensity uses **Plus Jakarta Sans + tabular-nums** (Carrot craft: one sans for the readout). Full review: [`TYPOGRAPHY.md`](./TYPOGRAPHY.md).

Retired: Nunito, Fraunces, Work Sans (interim), Lora-as-second-dialect.

### Disallowed / gated registers

| Pattern | Rule |
|---|---|
| Sci-fi gags (UFO, synthwave as default identity) | Not part of brand. UFO only as ultra-rare easter egg (stage 4+ night) or kill. Synthwave stays opt-in double-tap, never marketing. |
| Rainbow Lucide accent docks | One active accent: **primary green**. No per-tab candy colours. |
| Glassmorphism card stacks | Prefer **paper sheet** surfaces (`sheet-surface` / Card primitive). Cards only when they hold an interaction. |
| Purple / indigo eco-SaaS accents | Use **primary** (and accent sparingly). Partner logos may keep brand colour in the mark only. |
| Random delight unrelated to grid state | Prefer **streak/garden growth** and state-transition juice over roulette gags. |
| Generic “eco SaaS” cream+terracotta AI defaults | Stay on sky-paper + grid green; don’t drift. |

---

## Hierarchy (locked)

1. **Scene-as-HUD** — one giant intensity number + one condition line over the world.
2. **Paper sheet** — now-or-wait decision first; mix + forecast; secondary insights collapsed.
3. **Ambient chrome** — dock, location, freshness — quieter than the decision.

Do not reintroduce competing numeric overlays on the scene. Do not put marketing blocks in the first viewport.

---

## Scene art rules

1. **Silhouette test** — clean vs dirty readable in &lt;1s (see scene plan).
2. **One hero per intensity band** — demote everything else (`cityHeroDemotion` for city; coastal already gates boats/wind).
3. **One scale bible** — cars, Eye, BESS, people share one ratio (`SCENE_VISUAL_QA.md`).
4. **Aspect integrity** — silhouette SVGs use `SCENE_SILHOUETTE_ASPECT` (`xMidYMax meet`); washes may use `SCENE_WASH_ASPECT` (`none`). Never stretch landmark geometry to fill the frame.
5. **Diegetic first** — trains when dirty, drones when clean renewables; wildlife from garden stage — not UFO roulette.
6. **Temporal life** — garden stages 0–4 from coal-free + clean hours. Hours stay under the hood. UI shows a **stage-up line only** (“Garden woke up · day N”), never persistent garden chrome.

---

## Sheet art rules

1. Same **paper** as the dock (`--card`, soft border, soft shadow) — scene bleeds into UI via wave divider only.
2. Decision / page titles and intensity band labels use **Plus Jakarta Sans** (weight hierarchy); personality asides use the **same face italic**; dense gCO₂ figures use **Inconsolata** / tabular nums. Hero intensity stays Plus Jakarta + tabular-nums. See [`TYPOGRAPHY.md`](./TYPOGRAPHY.md).
3. Primary CTA colour is grid green; avoid multi-hue icon festivals.
4. Icons are supporting, not the personality. Personality lives in scene + condition copy.

---

## Motion

- Juice on **state changes** (band cross, renewables threshold), not constant sparkle.
- Ambient loops low-frequency (Eye notch, distant plane).
- Respect `prefers-reduced-motion`.
- Dock pill slide + decision spring are allowed; bounce on every tab is enough — don’t add more novelty motion.

---

## Carrot baseline (enjoyment)

Carrot Weather is the interaction-craft bar — not a mascot to copy. GridSense should feel as authored to *touch*:

1. **Scene-as-HUD** — one number, one condition line (shipped).
2. **World over time** — garden stages from clean streaks (shipped).
3. **Cross-linked data** — tapping a forecast hour updates chart emphasis **and** insight copy together (`ForecastChart` + `getForecastHourInsight`).
4. **Prove the shift** — meter truth beats dialogue volume.

Do not close the “feel” gap with more gag density. Close it with craft: every tap authored, world alive when idle.

## How we ship against this

Before merging UI:

- [ ] Seam test passed (scene + sheet same hand)
- [ ] Register test ≤ 2 dialects
- [ ] Job test: now-or-wait obvious
- [ ] No new gag without a diegetic grid reason
- [ ] No new card if a paper section would do
- [ ] Prop sizes from `src/lib/sceneScaleBible.ts` (no rival hardcodes)
- [ ] Secondary screens use `PageHeader` + `page-shell` / `sheet-surface`

Roadmap theme: **Delight & literacy** work must cite this doc.
