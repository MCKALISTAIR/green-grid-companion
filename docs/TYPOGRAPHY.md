# Typography review — GridSense (2026-09-21)

**Goal:** modern, Carrot-craft appropriate type. Not clinical SaaS, not kids-sticker soft, not “AI default” Inter/Roboto.

## What Carrot teaches (without copying)

Carrot runs on **one system sans** (SF Pro). Big numbers + status share that family; personality is weight/italic, not a second display face fighting the HUD. Layout craft > font theatre.

## Candidates considered

| Face | Modern? | HUD / “High” | Risk | Verdict |
|---|---|---|---|---|
| **Nunito** (old) | Soft 2018 | Too rounded on status | Kids-app vibe | ❌ Retired |
| **Fraunces** (old) | Editorial | Fights carbon status | Cream-serif AI cluster | ❌ Retired |
| **Work Sans** (interim) | Decent | OK at bold | Slightly dated; design-system doc only | ⚠️ Pass |
| **Outfit** | Strong | Excellent large nums | Very “startup landing” | Runner-up |
| **Plus Jakarta Sans** | Strong 2024–26 product | Sharp + warm on bands | Mildly popular (not Inter-level) | ✅ **Lock** |
| **Sora** | Techy | Good | Too futurist for “grid paper” | Pass |
| **Lora** as voice | Fine editorial | N/A | Second dialect on home sheet | ⚠️ Drop for unity |

## Locked system

| Role | Face | Notes |
|---|---|---|
| UI + HUD + titles + band labels | **Plus Jakarta Sans** | One geometric sans (Carrot unity). Was already used on product-tour chrome. |
| Personality (fact line) | **Same family, italic** | Distinct voice without a second face |
| Dense data | **Inconsolata** | Charts / codes only — not hero intensity |
| Hero intensity | Plus Jakarta + `tabular-nums` | Weight hierarchy, not mono |

## Explicitly avoid

- Inter / Roboto / system-only stacks as brand identity  
- Soft rounded “friendly” faces on status (Nunito class)  
- Display serif on High / Moderate / Very low  
- Multiple competing sans families in the same viewport  

## Rollout

- Tokens: `src/index.css`, `tailwind.config.ts`  
- Tour popovers inherit `--font-sans` (no hard-coded orphan face)  
- Art direction + design system updated to match  
