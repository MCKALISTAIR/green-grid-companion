## Goal
Make the city scene logical (no reactors on the high street, no floating Ferris wheel) and informative (visual cleanliness clearly tracks gCO₂/kWh).

## Changes

### 1. `src/components/IntensityScene.tsx` — gate power-station visuals by scene type
Three one-line guard additions:

- **Line 839** — Factories block: add `&& !isCity && !isCoastal`
- **Line 958** — Nuclear cooling towers: add `&& !isCity && !isCoastal`
- **Line 970** — Offshore wind turbines: add `&& !isCity` (still allowed in coastal)

Result: cooling towers and chimneys only appear in the countryside scene, where they belong.

### 2. `src/components/scene/CityElements.tsx` — ground the London Eye
Rework `LondonEye`:
- Default `y = 110, radius = 22` (was `y = 50, radius = 28`) so the wheel's lowest point sits ~6px above the road (y≈138), like the real South Bank wheel.
- Extend the A-frame support legs from the hub all the way down to y=138.
- Add a small concrete plinth `<rect>` at the base.
- Bump support stroke width slightly so legs read as structural.
- Update the call site in `IntensityScene.tsx:640` to `<LondonEye x={60} isNight={isNight} skipIntro={hasSeenScene} />` (use new defaults).

### 3. `src/components/scene/CityElements.tsx` — three new components
- **`SmogBand`** — horizontal gradient `<rect>` (brownish) drawn behind the back skyline, opacity = `(1 - cleanliness) * 0.6`. Renders only when `cleanliness < 0.5`.
- **`BatteryStorageContainer`** — small shipping-container BESS at street level (~x=320, y=130) with a status LED: green pulse when `cleanliness > 0.6`, amber when lower. Always visible in city.
- **`DistantStack`** — single thin chimney with faint steam, drawn far back on the horizon (y≈70, small scale, low opacity), only when `cleanliness < 0.2`. Communicates "dirty power exists, but it's not next door".

### 4. `src/components/IntensityScene.tsx` — wire the city signals in
Inside the existing `isCity` block (around lines 624–700):
- Add `<SmogBand cleanliness={sceneConfig.cleanliness} />` as a layer between the sky and `CityLandscapeBack` (z=-1 inside the same SVG).
- Add `<DistantStack />` in the back-skyline SVG, conditional on `cleanliness < 0.2`.
- Add `<BatteryStorageContainer cleanliness={sceneConfig.cleanliness} />` in the front-layer SVG.

### 5. `docs/SCENE_VISUAL_QA.md` — add city checks
Append a "City scene logic" section:
- [ ] No nuclear cooling towers visible in city theme
- [ ] No factory chimneys visible in city theme
- [ ] London Eye support legs touch the road
- [ ] London Eye plinth visible at base
- [ ] At intensity > 300 gCO₂/kWh, brown smog band visible behind skyline
- [ ] Battery storage container LED is green when intensity is very low

## Out of scope
- Per-postcode landmark accuracy (real Shard / Canary Wharf shapes).
- Animating traffic queue length by intensity.
- Coastal scene cleanup (separate pass if you want it).

## Verification
After implementation, I'll spot-check the preview at `/onboarding` (current city scene) and confirm the wheel is grounded and no chimneys appear.
