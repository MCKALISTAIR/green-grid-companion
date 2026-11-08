# Correct confirmed logic inconsistencies

## Scope
Recheck each reported issue before changing it. The earlier “21 contradictions” list overstated several findings: different comparison definitions are not automatically bugs, multi-meter loss was not reproduced on the footprint path, and some coal logic is unused. Keep the current visual design unchanged.

## Confirmed corrections
1. **Reports:** exclude solar-export readings from consumption totals and green-use calculations; preserve account ownership checks. Do not introduce a new net-export methodology.
2. **Charging:** missing carbon readings must never become zero-carbon readings. Require valid time coverage and weight partial intervals correctly; preserve genuine zero readings. Unavailable savings stay unavailable, not inflated.
3. **Forecasts:** reject windows containing gaps, duplicate slots or invalid readings instead of calling them continuous.
4. **Footprint:** derive charts, totals and comparisons from the same selected period. Count covered calendar days rather than chart bars. Retain existing comparison definitions unless separately approved.
5. **Refresh:** schedule the nearest upcoming buffered boundary, including when opening the app between :00 and :01:30 or :30 and :31:30.
6. **UK dates:** use Europe/London for footprint grouping, annual-review boundaries and weekly hour analysis. Distinguish the repeated autumn hour.
7. **Historical claims:** require explicit, continuous evidence before claiming long fossil-free streaks; handle empty history, gaps and genuine zero-carbon readings correctly.

## Your resolved choices
- Both low and high carbon-alert thresholds are limited to **0–100 gCO₂/kWh**. Apply the limit consistently to controls, defaults and validation; review existing out-of-range preferences without silently rewriting live records.
- Carbon savings cannot display negative values: use **zero** when above the comparison benchmark. This does not automatically replace all existing benchmarks with 230.

## Validation and safeguards
- Add concrete regression tests beside the existing tests for every corrected rule; reproduce each confirmed defect before fixing it.
- Check selected-period and forecast behaviour in the browser; clearly identify linked-meter flows that cannot be verified with available real data.
- Investigate the reported July sync cutoff read-only; do not replay syncs or repair historical rows during these corrections.
- No frontend publishing, function deployment, migrations, secret/auth/cron changes or live database writes in this scope. If enforcing database constraints requires a migration, present it separately rather than applying it here.

## Technical approach
Reuse existing half-hour validation, London-time and subscriber-scoping helpers. Extract small pure calculation helpers where needed and test boundary values, missing data, multiple meters, partial periods and both clock changes. Review band, green-percentage and freshness definitions against project requirements before changing them; do not blindly standardise historical provider classifications or different timestamp clocks.

## Deliverable
A tested set of confirmed code corrections and an item-by-item audit disposition: fixed, intentional, not reproduced, or requiring separately approved live-data work.