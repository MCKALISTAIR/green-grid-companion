# GridSense data accuracy

How we keep carbon figures grounded in NESO (and related) reality — and where we deliberately estimate.

## Sources of truth

| Signal                           | Source                                                       | What GridSense does                                                                                         |
| -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Live / forecast intensity (GB)   | [NESO Carbon Intensity API](https://carbonintensity.org.uk/) | Shows NESO numbers. Live UI prefers published **actual** when present, else **forecast**.                   |
| Regional past “actuals”          | Regional API has **no** actuals                              | Estimates from generation mix × NESO Table 1 factors; labelled **Estimate**.                                |
| Generation mix / demand          | NESO + Elexon BMRS                                           | Attributed; embedded solar/wind are NESO estimates.                                                         |
| Personal footprint / Green Score | Octopus half-hourly × intensity                              | `carbon_g = kWh × intensity`; prefers NESO actual then forecast; skips half-hours with no usable intensity. |
| Unlinked footprint               | Ofgem TDCV × intensity                                       | Rough benchmark only.                                                                                       |
| Northern Ireland                 | Not in NESO CI API                                           | Falls back to GB national with an explicit explanation.                                                     |

Emission factors live in `src/lib/carbonApi.ts` (`CARBON_FACTORS`) and match `/intensity/factors` (gas = CCGT 394; imports = French default 53).

Where the French default systematically mis-tracks NESO’s **regional** forecasts, `REGION_IMPORTS_FACTOR` overrides imports for history backfill only:

| Region id | Region             | Imports factor | Why                                                 |
| --------- | ------------------ | -------------- | --------------------------------------------------- |
| 10        | East England       | 405            | North Sea interconnectors (Irish/Dutch class)       |
| 13        | London             | 120            | Mixed continental interconnectors                   |
| 4         | North East England | 40             | Slightly cleaner than French default in calibration |

These are GridSense calibrations against NESO regional forecasts (stable across two windows in Sep–Oct 2026), not NESO-published per-region factors.

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
`src/test/security/footprint-records.test.ts` spot-checks Octopus footprint maths (`carbon_g = kWh × intensity`, actual → forecast, unusable half-hours skipped) on national and regional fixtures via `supabase/functions/_shared/footprint-records.ts`.

### In CI

`.github/workflows/neso-audit.yml` runs the audit every Monday 07:17 UTC, on manual dispatch, and on PRs touching `src/lib/carbonApi.ts` or the script. The job fails only on a **gate failure** (exit 1). Each NESO request has a 20 s timeout and 4 attempts with backoff (`NESO_FETCH_TIMEOUT_MS`, `NESO_FETCH_ATTEMPTS`); if NESO is still unreachable the script exits 2 and the job warns instead of failing. The JSON report is uploaded as an artifact.

## Re-calibrate `REGION_IMPORTS_FACTOR` quarterly

1. Run `npm run audit:neso -- --days 30 --json /tmp/neso-audit.json` (or dispatch the workflow with `days=30`).
2. For East England (10), London (13) and North East England (4), read `ΔMAE vs default`. Keep the override while it beats the French default by **≥ 2 g MAE**.
3. Check other regions: consider a new override only if MAE > 10 g **and** |bias| > 5 g in two separate 30-day windows.
4. Change a factor only for a **meaningful improvement**: ≥ 2 g MAE lower in two windows, without raising national MAE. Drop an override that no longer clears the bar.
5. Update both `src/lib/carbonApi.ts` and `scripts/audit-neso-accuracy.mjs` (they must match), the table above, and the pinned tests.

## Known limitations (by design)

1. **Imports still approximate interconnectors.** Region overrides cover the worst mismatches; other regions keep the French default. Past regional bars remain estimates, not NESO actuals — and NESO’s own daily ENTSO-E import mix can still move.
2. **NESO forecasts can be revised or late.** Terms of use state figures are forecasts/estimates.
3. **Green Score bands** follow NESO’s published index on each half-hour, not a custom threshold.
4. **NI / BT postcodes** cannot be regionalised against this API.

## Reasonable accuracy bar

For product decisions we treat as “good enough”:

- National mix-est vs NESO actual: MAE roughly on the order of **≤ 10 g**, and not worse than NESO’s own forecast MAE over the same window.
- Live national reading: use **actual** when NESO has filled it for the open half-hour.
- Footprint: never invent 0 / `moderate` for missing intensity (skip the half-hour).

Re-run `npm run audit:neso` after changing `CARBON_FACTORS` or intensity selection logic.
