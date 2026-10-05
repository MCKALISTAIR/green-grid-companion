# Scene Visual QA Checklist

Manual on-device checks for the `IntensityScene`. Run this whenever scene height,
landscape SVG paths, or layout-affecting CSS changes.

## Matrix QA (2026-09 presence + integrity)

Captured via `scripts/scene-matrix-qa.mjs` + `scripts/scene-home-qa.mjs`:

| Coverage | Status |
|---|---|
| Theme × band × midday/night (iPhone SE) | 3 × 5 × 2 = 30 scene-test cards |
| Home app context (city EC1 / countryside BA1 / coastal PL1) | HUD + paper sheet over live intensity |
| Desktop + ultrawide city aspect | meet letterbox, Eye stays in frame |

Guards: `scene-theme-integrity`, `sceneConfig` ground dialects, `cityHeroDemotion` presence floors.

## Stress-test findings (2026-09)

Deep scrutiny across theme × intensity × time found recurring failures:

1. **Sun parking mid-frame** — Framer `animate` of `top`/`right` % resolved to `0px`; sun is now positioned via `style`.
2. **Theme bleed** — Lucide leaves/flames/droplets, hydro dam, biomass, and dual offshore wind stacks painted on city/coastal. Gated in `SceneGenerationOverlay` / `SceneAdvancedLayer`.
3. **London Eye ungrounded** — rendered in the back skyline so mid/front towers buried the legs/plinth; moved to the front/road layer.
4. **Coastal beach hard edge** — vertical sand/water cut replaced with a curved shoreline.
5. **Hero halo miss** — coastal very-clean halo aimed at empty sky (~70% x); retargeted to offshore wind cluster (~38% x).
6. **Cloud drift `100vw`** — clouds traveled the browser viewport and leaked across `/__scene-test` cards; now container-relative.
7. **Bottom sky bleed** — the `bottom-[40px]` scenery shift left a strip of sky gradient (often purple under night grade) under the landscape; ground cover now fills that gap below the wrapper.
8. **Countryside scale** — bushier, shorter pines + taller turbines so hierarchy reads turbines > cottage > trees.
9. **City solar tiling** — rooftop panels are seeded sparsely; daytime lit windows cut to ~4%.
10. **Dirty coastal** — ochre haze, horizon stacks, oil sheen, tanker silhouette; sailing boats demote.

Note: a right-edge “tiling” strip sometimes appears when screenshotting the bordered `/__scene-test` preview chrome in Playwright. Capturing `[role="img"]` (the scene root) does not show a wrap — treat bordered-card captures as a tooling artifact.

Automated guards: `src/test/scene-theme-integrity.test.ts`.

## Devices to test
- [ ] iPhone SE (small, 16:9)
- [ ] iPhone 14 / 15 (modern, 19.5:9)
- [ ] iPhone 17 Pro Max (very tall, 19.5:9, dynamic island)
- [ ] **iPhone Duo cover** (466×678, ~1.42:1) — see `docs/IPHONE_DUO.md`
- [ ] **iPhone Duo inner** (890×626 landscape / 626×890 portrait)
- [ ] **iPhone Duo Split View** (~445×626)
- [ ] iPad Mini (4:3 portrait + landscape)
- [ ] iPad Pro 12.9" (4:3 portrait + landscape)
- [ ] Desktop 1440px wide
- [ ] Ultrawide 1920px wide

## Per-device checks
For each device, verify:

### Layout
- [ ] Sky-to-ground ratio feels balanced (~60/40, not 80/20)
- [ ] Hill ridges visible and not pushed off-screen top/bottom
- [ ] Foreground props (turbines, towers, fence, grass) at sensible scale
- [ ] No horizontal scrollbar
- [ ] No clipping of cooling towers, hydro dam, or city skyline
- [ ] Scene container respects iOS safe-area inset (no overlap with dynamic island)
- [ ] On Duo cover/inner, scene does not consume the full short viewport (cards still peek)
- [ ] On Duo inner landscape (~890×626), home uses side-by-side scene + feed

### Animation
- [ ] Birds, butterflies, fireflies don't float in oversized empty sky
- [ ] Wind turbines spin at expected positions on hill ridges
- [ ] Trees sway naturally with wind speed

### Themes (test all 3)
- [ ] Countryside (default)
- [ ] City (London postcode e.g. EC1)
- [ ] Coastal (e.g. PL1, BN1)
- [ ] Winter variant activates during snow weather

### Times of day (test sample)
- [ ] Midday (clear sun, blue sky)
- [ ] Sunset (orange gradient, low sun)
- [ ] Night (stars, moon, dark sky)
- [ ] Dawn (purple-orange transition)

### Weather (test sample)
- [ ] Clear
- [ ] Heavy rain (raindrops visible, gray sky)
- [ ] Snow (snow ground, frozen pond on cold days)
- [ ] Fog (whitish gray flat sky)
- [ ] Thunderstorm (dark dramatic sky)

### Carbon levels
- [ ] Very low (clean: many turbines, butterflies, rainbow)
- [ ] Very high (dirty: factories, smoke, pollution warning)

### Temporal garden (streak life)
- [ ] Stage 0: no extra garden overlay on countryside
- [ ] After sustained clean / coal-free streak: flowers + green wash appear
- [ ] Stage 2+: extra butterflies; wildlife gates ease slightly
- [ ] Stage 3+ night: soft emerald sparkles
- [ ] City theme: temporal garden skipped (no countryside flora)
- [ ] Home sheet shows a quiet stage-up line only when garden stage rises (never persistent “day N” chrome; never raw clean hours)
- [ ] Dirty periods decay garden hours slowly (no hard wipe)

## City scene logic
- [ ] No nuclear cooling towers visible in city theme
- [ ] No factory chimneys visible in city theme
- [ ] No offshore wind turbines floating over city skyline
- [ ] London Eye support legs touch the road
- [ ] London Eye plinth visible at base
- [ ] Brown smog band visible behind skyline at >300 gCO₂/kWh
- [ ] Distant horizon stack appears only at very high intensity
- [ ] Battery storage (BESS) container visible at street level; LED green when clean, amber/red when dirty

## Quick dev test page
Visit `/__scene-test` in dev to see a grid of viewport×scene combinations
side-by-side without manually resizing.

## Known constraints
See `mem://constraints/scene-visual-integrity` for foreground priority rules
that must not be violated.

## Game-design composition (Phase 2)

### Hero per cleanliness band
`SceneHeroSpotlight` is **universal** — it renders for all three scene types (city,
countryside, coastal). Each band has ONE focal element per theme receiving a soft
radial halo. Verify the eye is drawn to the correct prop before other elements.

Layering note: spotlight sits at **z-[3]**, above `SceneAtmosphericDepth` (z-[2]) so
heavy haze on dirty days does not mute the halo.

| Band        | Intensity (gCO₂/kWh) | City hero              | Countryside hero        | Coastal hero           | Halo tint  |
|-------------|----------------------|------------------------|-------------------------|------------------------|------------|
| very-clean  | < 50                 | London Eye             | wind turbine cluster    | offshore wind          | mint       |
| clean       | 50–149               | upper-mid skyline      | hillside                | sailing boat           | green-mint |
| moderate    | 150–249              | BESS container         | hydro dam               | rock pool area         | amber      |
| dirty       | 250–349              | distant stack          | factory smoke           | horizon smog           | rust       |
| very-dirty  | ≥ 350                | smog band (upper)      | smog band               | smog band              | red-brown  |

- [ ] Halo follows band changes when cycling all 5 intensity presets in `/__scene-test`
- [ ] Halo is visible in **all three themes** (countryside, city, coastal)
- [ ] Halo never overlaps the intensity card or fact bubble
- [ ] At night, halo is dimmed but still visible

### Atmospheric depth band
`SceneAtmosphericDepth` adds a horizontal haze across the horizon (z-[2], below spotlight).
- [ ] Cool blue tint on clean days, warm sepia on dirty days
- [ ] Visible near the horizon only (~42–64% vertical) — must **not** form an opaque muddy bar
- [ ] Peak haze opacity capped (~0.24) so live UK dirty/high intensities still show landmarks
- [ ] Distant skyline reads as further away than mid skyline

### Scale bible (locked)

Source of truth: `src/lib/sceneScaleBible.ts` (art direction register test).

### Aspect integrity (locked)

| Layer kind | `preserveAspectRatio` | Constant |
|---|---|---|
| Landscape / skyline / props (Eye, turbines, boats, BESS…) | `xMidYMax meet` | `SCENE_SILHOUETTE_ASPECT` |
| Washes (mist, aurora, grass strip, tidal wash, wave divider) | `none` | `SCENE_WASH_ASPECT` |

- [ ] Phone SE / 15 / Duo cover / desktop 1440: props look like the same objects (no vertical squash)
- [ ] Tall phones: Eye + BESS stay in frame (meet letterboxes; sky CSS fills gaps — do not switch back to `slice`, which crops side landmarks)
- [ ] Ultrawide: may letterbox horizontally; silhouettes stay unstretched
- [ ] City one-hero demotion (`getCityHeroEmphasis`) — only the band hero is full opacity

### Window-light hue (Phase 1)
- [ ] Clean night windows read warm amber
- [ ] Dirty night windows read sickly green / olive (city skyline + countryside cottage)
- [ ] Aurora appears on clean nights (`cleanliness > 0.85`), not winter-gated only

- [ ] Daytime skyline reads as solid building mass (not glass fog)
- [ ] Bottom safety strip is pavement grey on city — never countryside green
- [ ] Hero Eye/BESS stay readable (≥ ~0.35 opacity when still in shot); hero gets a slight scale bump
- [ ] At least one micro-life cue on clean/moderate (EV or pigeon) — empty road only when dirty? no — always ≥1 on landmark heroes
- [ ] Tube flash crosses the road ~once/minute (respects reduced motion)
- [ ] Dusk/night windows flicker staggered

### City one-hero demotion

UX bar: name the focal prop in &lt;1s **and** still feel like a living city.

| Band | Hero | Presence |
|---|---|---|
| very-clean | London Eye (scale↑) | Solid skyline, 1 EV + 1 pigeon, Tube flash |
| clean | Skyline | Eye/BESS readable ghosts, light traffic |
| moderate | BESS (scale↑) | Eye readable, 1 EV, Tube flash |
| dirty | Distant stack | Bus OK, Tube flash |
| very-dirty | Smog | Crane on, no Tube |

#### City (400×150 viewBox, groundY = 138)
| Prop | Size | Notes |
|---|---|---|
| London Eye wheel | radius **30** (≈60u Ø) | Hub y=85; plinth half-width 22; legs touch road |
| BESS container | **22×8** | Sits on groundY 138 |
| Distant stack | **2×22** | Far horizon only |
| Car | body **14×5**, cabin **8×3** | Shorter than ground-floor windows |
| Bus | **24×8** | |
| Pigeon | baseScale **0.35** | Smallest moving element |
| Urban trees | scale **0.4–1.0** | |

#### Countryside
| Prop | Scale |
|---|---|
| Back / mid / front pines | 0.15–0.3 / 0.28–0.45 / 0.4–0.55 |
| Sheep | 0.5–0.55 |
| Cottage | 0.78 |
| Turbines | back ≤0.5, front ≥0.9 |

#### Coastal
| Prop | Scale |
|---|---|
| Seagulls | 0.7–1.1 |
| Rock-pool accent | 0.4 |

- [ ] No car taller than a building's ground-floor windows
- [ ] EV charger reads as street furniture, not signage
- [ ] New props import sizes from `sceneScaleBible` — do not hardcode rival ratios
