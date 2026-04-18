# Scene Visual QA Checklist

Manual on-device checks for the `IntensityScene`. Run this whenever scene height,
landscape SVG paths, or layout-affecting CSS changes.

## Devices to test
- [ ] iPhone SE (small, 16:9)
- [ ] iPhone 14 / 15 (modern, 19.5:9)
- [ ] iPhone 17 Pro Max (very tall, 19.5:9, dynamic island)
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

## Quick dev test page
Visit `/__scene-test` in dev to see a grid of viewport×scene combinations
side-by-side without manually resizing.

## Known constraints
See `mem://constraints/scene-visual-integrity` for foreground priority rules
that must not be violated.
