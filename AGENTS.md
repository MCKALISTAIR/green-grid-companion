# Architecture rules

- RouteMetadata inside BrowserRouter owns canonical and og:url through Helmet; the static head omits these identities so secondary routes cannot inherit the homepage address.

- Product-tour replay hands off through a session-scoped pending flag and Home navigation state; Home starts the queued tour only after a real reading renders, so Settings unmounting cannot discard replay.
- Home scene fact bubbles portal into the scene container above the HUD; other embeds retain local positioning, so readable facts do not compete with gauge text.
- Bottom dock geometry and mobile content clearance share CSS tokens; AppLayout owns page clearance except Home, which applies the same inset inside its sheet, so scroll ends clear the dock and iOS safe area without double padding.
- Alert validation is shared between device preferences and subscription requests to prevent range drift.
- Footprint selection and aggregation use pure UK-calendar helpers so chart buckets and summary comparisons cover identical records.
- Charging savings require continuous usable intensity coverage and overlap weighting; historical cached figures are not evidence of coverage.
- Fossil-free annual claims require complete explicit UK-day evidence, including clock-change slot counts.
- Daily outlook windows use a shared pure continuity check so gaps and overlapping slots cannot inflate their duration.
- Planner normalizes custom durations to its half-hour engine before optimization and savings so one duration drives both.
