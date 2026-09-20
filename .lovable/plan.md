# IntensityScene — Game Designer Overhaul Plan

Turn the scene from a "postcard" into a living, readable, interactive world that communicates carbon intensity at a glance.

## Guiding principles
1. **Silhouette test** — clean vs dirty must be readable in under 1 second, even squinting.
2. **One hero per state** — each intensity band has a single focal element; everything else demotes.
3. **Transitions matter more than states** — every state change earns a moment of "juice".
4. **Diegetic information** — props teach the user about the grid; tap to learn more.
5. **Preserve foreground constraints** — `h-[50vh]`, `min-h-[360px]`, `overflow-hidden` are sacred (see `mem://constraints/scene-visual-integrity`).

---

## Phase 1 — Readability (the silhouette fix)
Goal: make state instantly readable.

- **Global colour grading layer**: a full-scene CSS `filter` / overlay tied to `cleanliness`.
  - Very clean → cool teal tint, +saturation, slight bloom.
  - Moderate → neutral.
  - Very dirty → sepia/sickly yellow wash, -saturation, slight vignette.
- **Boost dirty-state signals at night**: smog band + distant stack opacity ramped so they survive dark skies.
- **Add starfield + aurora trigger** at `cleanliness > 0.85` (night only) — clean nights should feel *magical*.
- **Window-light hue shift**: warm amber when clean, sickly green-tinged when dirty.

Deliverable: side-by-side screenshots of all 5 intensity bands × 4 times-of-day passing the squint test.

---

## Phase 2 — Composition & hierarchy
Goal: one hero, supporting cast, ambient detail.

- **Pick a hero per state**:
  - Very clean → London Eye (lit, slowly rotating, halo glow).
  - Clean → Wind/solar prop emphasised.
  - Moderate → BESS container (the balancing act).
  - Dirty → Distant smoking stack pulled forward & enlarged.
  - Very dirty → SmogBand dominates upper third.
- **Push horizon to lower third** (rule of thirds) — sky carries the mood.
- **Atmospheric perspective**: desaturate + fog-tint distant layers by depth so the scene gains 4-5 readable parallax planes without actual parallax motion.
- **Scale audit**: lock cars, EV charger, BESS, London Eye to a single consistent "chibi-realistic" scale ratio. Document in `docs/SCENE_VISUAL_QA.md`.

---

## Phase 3 — Juice (transitions & ambient life)
Goal: the scene breathes; state changes feel earned.

- **State-transition flourishes** (framer-motion):
  - Crossing into "very clean" → sun-flare bloom + rising green particles + BESS LED double-pulse.
  - Crossing into "very dirty" → smoke puff burst from distant stack + screen edge vignette.
- **Sky transitions sweep** over 2-3s instead of instant gradient swap.
- **Ambient idle loops** (low-frequency, never distracting):
  - London Eye rotates one notch every 30s.
  - Plane crosses sky every 60-120s.
  - Window lights flicker on staggered at dusk.
  - Tube train flashes across a bridge once per minute.
- Respect `useReducedMotion` — all juice degrades to static.

---

## Phase 4 — Interactivity (diegetic info)
Goal: 3-4 props become tappable and educational.

- **Tappable hotspots** on: London Eye, BESS, EV charger, distant stack.
- Subtle hover/tap glow indicates affordance (only on these, not on decoration).
- Tap opens a **scene-anchored fact bubble** with a tail pointing to the prop:
  - BESS → "Stored X MWh from cheap overnight wind."
  - EV charger → "Charging now adds Y g CO₂/kWh."
  - London Eye → "Powered by 100% renewable since 2018."
  - Distant stack → "Gas peaker plants kick in when demand spikes."
- Replaces / supersedes the floating `EnergyFactBubble` for in-scene context.

---

## Phase 5 — Information design commitment
**Decision (2026-09): Scene-as-HUD (Option A), Carrot Weather pattern.**

- One giant intensity number floats over the scene with a soft gradient wash — no glass card.
- Condition label (index band) sits under the number in display type.
- Secondary metadata (renewables %, freshness) stays quiet under the condition.
- Content sheet below is the data surface; personality line lives at the sheet top.
- Do not reintroduce competing numeric overlays on the scene.

---

## Technical notes
- New files anticipated:
  - `src/components/scene/SceneColorGrade.tsx` — global tint/saturation overlay.
  - `src/components/scene/StateTransitionFX.tsx` — flourish layer (mounts on cleanliness band changes).
  - `src/components/scene/SceneHotspot.tsx` — reusable tappable wrapper with anchored fact bubble.
  - `src/hooks/useCleanlinessBand.ts` — derives discrete band from intensity; fires transition events.
- Modified:
  - `IntensityScene.tsx` — wire color grade + transition layer + hero selection.
  - `CityElements.tsx`, `CoastalElements.tsx`, `Landscape.tsx` — apply hero/demote logic + depth tinting.
  - `Stars.tsx`, `AuroraBorealis.tsx` — trigger conditions.
  - `docs/SCENE_VISUAL_QA.md` — add silhouette test, scale chart, hotspot inventory.
- New memory: `mem://design/scene-game-feel` documenting the hero/silhouette/juice rules.

## Suggested build order
1. Phase 1 (biggest readability win, lowest risk).
2. Phase 2 (composition — needs Phase 1 grading to judge).
3. Phase 4 (interactivity — independent, ships value fast).
4. Phase 3 (juice — polish layer).
5. Phase 5 (HUD decision — needs user choice first).

## Follow-ons (Carrot comparison 2026-09)
- **Quiet sheet** — home content sheet leads with now-or-wait; secondary insights collapsed.
- **Temporal scene life** — `useSceneGrowth` + `SceneTemporalLife` evolve countryside flora with coal-free + clean hours (stages 0–4).

Each phase ends with a screenshot QA pass across the 5 intensity bands × city/countryside/coastal × day/night.
