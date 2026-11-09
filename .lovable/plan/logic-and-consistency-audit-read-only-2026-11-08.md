# Logic and consistency audit (read-only)

A structured pass to find places where the app contradicts itself: wrong numbers, rules applied differently in different places, or states that don't line up. No code changes in this pass. The output is a findings report you can triage.

## 1. Pin down the rules
- Collect the rules the app is meant to follow from project memory, AGENTS.md and the docs: intensity bands, the 35-minute "stale" mark, refresh at :01:30 and :31:30, the 230 g/kWh benchmark, the 0-100 alert threshold, 20 g forecast tolerance, the 0.5% trend arrow, the 30-day streak and the Europe/London date bounds.
- Turn these into one checklist of "expected values".

## 2. Find each rule wherever it's used
- Search the app and the server functions for every place each rule is computed or hard-coded.
- Flag duplicates that disagree, e.g. a band edge or benchmark written differently in the Home view, Plan, History, alerts and reports.

## 3. Cross-check the screens against each other
For the same postcode and time (EC1, BA1, PL1), compare:
- Home intensity and band vs Plan's "best time" vs History for the same half-hour vs the Rank map.
- Footprint totals vs the monthly/weekly report maths vs Year Wrapped.
- The alert the server would send vs what the app shows at that moment.

## 4. Edge cases
- Clock changes (BST/GMT), midnight and month boundaries, the half-hour in progress.
- Empty, offline, stale and error data; signed out vs signed in; data carried over after sign-in.
- Outside-GB postcodes (GY/JE/IM/BT), a linked Octopus account with no new readings, export meters.

## 5. Automated checks
- Run the existing unit tests and list rules with no test.
- Propose (don't write yet) small tests, one per rule, with concrete expected values.
- Read-only database checks: orphaned rows, duplicate half-hours, footprints with no matching readings.

## Output
A report sorted by severity (wrong number shown to users > rules out of sync > edge-case gaps). Each finding gives where, what's expected, what happens, and a one-line fix. Fixes happen only after you approve them.
