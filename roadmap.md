# Visual QA polish

# Logic consistency audit

- [x] Revalidate the earlier audit and distinguish proven bugs from differing definitions.
- [x] Record zero-floor savings and 0–100 limits for both alert types.
- [ ] Review the scoped correction plan before implementation.
- [ ] Implement confirmed accounting, coverage, timing and selected-period defects with regression tests.
- [ ] Verify corrected flows; report anything blocked by real-data availability. No deployment or live-data repairs without separate approval.

- [x] Correct Settings tour hand-off to Home/Intensity and safe-area toasts.
- [x] Fix scene hit areas, HUD contrast and wide haze.
- [x] Fix demand card wrapping and information buttons.
- [x] Fix map bubble contrast, southern spacing and label clearance.
- [x] Polish Settings, onboarding, History, privacy and view-tab targets; protect scroll-end clearance.
- [x] Confirm existing History autoscaling and run focused tests plus mobile/desktop visual checks.
- [x] List changed files; do not publish.

# B1 bottom navigation clearance

- [x] Share dock dimensions, safe area and content inset across Home and page chrome.
- [x] Verify all Home views and Settings/Plan/History scroll ends with a simulated iOS home indicator (12 browser checks passed at 0px/34px; linked Footprint metrics not available in the guest session).
- [x] Confirm mobile and desktop appearance; do not publish. Added a persistent Playwright regression; its JS runner lacks the matching browser here, so equivalent checks ran with the available Python browser.
