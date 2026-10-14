# GridSense data accuracy

How we keep carbon figures grounded in NESO (and related) reality — and where we deliberately estimate.

## Sources of truth

| Signal | Source | What GridSense does |
|--------|--------|---------------------|
| Live / forecast intensity (GB) | [NESO Carbon Intensity API](https://carbonintensity.org.uk/) | Shows NESO numbers. Live UI prefers published **actual** when present, else **forecast**. |
| Regional past “actuals” | Regional API has **no** actuals | Estimates from generation mix × NESO Table 1 factors; labelled **Estimate**. |
| Generation mix / demand | NESO + Elexon BMRS | Attributed; embedded solar/wind are NESO estimates. |
| Personal footprint / Green Score | Octopus half-hourly × intensity | `carbon_g = kWh × intensity`; prefers NESO actual then forecast; skips half-hours with no usable intensity. |
| Unlinked footprint | Ofgem TDCV × intensity | Rough benchmark only. |
| Northern Ireland | Not in NESO CI API | Falls back to GB national with an explicit explanation. |

Emission factors live in `src/lib/carbonApi.ts` (`CARBON_FACTORS`) and match `/intensity/factors` (gas = CCGT 394; imports = French default 53).

## Live audit

```bash
npm run audit:neso
# or
node scripts/audit-neso-accuracy.mjs --days 14 --json /tmp/neso-audit.json
```

The script:

1. Confirms local factors still match the live factors endpoint.
2. Backtests mix-estimate vs **national actuals** over N days (gate: MAE ≤ 12 g by default).
3. Compares NESO’s own forecast error over the same window (baseline for “reasonable”).
4. Reports regional mix-estimate vs regional **forecast** (no regional actuals exist).

Unit tests in `src/lib/carbonApi.test.ts` pin factors and fixture weeks (South Scotland / South East).

## Known limitations (by design)

1. **Imports factor is a single national default (53).** High-import regions (especially East England, sometimes London) systematically understate vs NESO’s regional forecast because interconnectors vary (Irish/Dutch factors are much higher). Past regional bars are estimates, not NESO actuals.
2. **NESO forecasts can be revised or late.** Terms of use state figures are forecasts/estimates.
3. **Green Score bands** follow NESO’s published index on each half-hour, not a custom threshold.
4. **NI / BT postcodes** cannot be regionalised against this API.

## Reasonable accuracy bar

For product decisions we treat as “good enough”:

- National mix-est vs NESO actual: MAE roughly on the order of **≤ 10 g**, and not worse than NESO’s own forecast MAE over the same window.
- Live national reading: use **actual** when NESO has filled it for the open half-hour.
- Footprint: never invent 0 / `moderate` for missing intensity (skip the half-hour).

Re-run `npm run audit:neso` after changing `CARBON_FACTORS` or intensity selection logic.
