# iPhone Duo Readiness (GridSense)

GridSense is a Capacitor WKWebView app. On iPhone Duo, Safari does **not** expose
CSS Viewport Segments / hinge APIs — fold and unfold arrive as ordinary resizes
between two logical viewports (approx, 3×):

| Pose             | CSS size   | Notes                                        |
| ---------------- | ---------- | -------------------------------------------- |
| Cover (folded)   | 466 × 678  | Wider/shorter than classic iPhones (~1.42:1) |
| Cover landscape  | 678 × 466  | Rare; still treat as resize                  |
| Inner (unfolded) | 890 × 626  | Landscape book; height feels laptop-short    |
| Inner portrait   | 626 × 890  | Rotated open                                 |
| Split View pane  | ~445 × 626 | Half of inner with another app               |

Pre-order / ship window: mid–late October 2026. Build against iOS 27.1+ / Xcode 27.1
when packaging the native shell; the web UI itself must already flex across these sizes.

## What we changed

1. **Scene height** (`src/lib/sceneHeight.ts`, `IntensityScene`, `.home-scene`)  
   Lower floor on short viewports so the landscape + bottom nav + cards still fit.
2. **Home side-by-side** (`.home-shell` / `.home-feed`)  
   At ≥800×≤720 the home screen puts scene and feed side-by-side so unfolded Duo
   shows more content. Primary chrome stays off the vertical center (hinge).
3. **Product tour** (`useProductTour`)  
   Rebuilds nav selectors on `resize` / `visualViewport` so fold mid-tour does not
   target a hidden BottomNav/SideNav.
4. **QA presets** — SceneTest, Playwright VRT, and this checklist cover Duo sizes.

## Manual QA matrix

Walk Home → Planner → Map → Settings (and a half-filled Settings field) at:

- [ ] 466 × 678 — cover portrait
- [ ] 890 × 626 — inner unfolded (side-by-side home expected)
- [ ] 626 × 890 — inner portrait
- [ ] ~445 × 626 — Split View half pane
- [ ] Continuous drag 400 → 900 wide with scroll mid-page (no state loss, no remount wipe)

Checks:

- [ ] No horizontal overflow
- [ ] Bottom nav remains tappable; not covered by home indicator
- [ ] Intensity gauge clear of Dynamic Island / safe area
- [ ] Fold/unfold mid-session keeps view mode, location, and form state
- [ ] Product tour anchors stay on the visible nav if started across a resize

Dev helpers: `/__scene-test`, `docs/SCENE_VISUAL_QA.md`.

### Automated web viewport simulation

With Vite running on `:8080`:

```bash
npm run sim:duo
```

This Playwright pass checks cover / inner / split-view sizes, mid-session
fold→unfold→fold (Demand tab must survive), and a continuous 400→900 width drag
(Footprint tab + no horizontal overflow). It is **not** a substitute for the
Xcode iPhone Duo Simulator.

## Native packaging notes

- Sync web assets: `npm run build:mobile`
- Test in the **iPhone Duo Simulator** (Xcode 27.1+) once available on the build Mac
- Re-verify status bar / splash (`StatusBar`, `SplashScreen` Capacitor plugins) on both displays
- Widget (`GridSenseWidget`) is a separate extension — confirm Duo simulator limitations for extensions in Apple’s 27.1 release notes

## Non-goals (for now)

- Detecting fold state or hinge angle from JS (unsupported in Safari)
- Dual-window / multi-scene Capacitor APIs (native follow-up when SDK stabilizes)
- Hard-coded user-agent sniffs for “Duo”
