# Visual QA polish
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
- [x] Home's sheet and the Settings column now clear the dock with their own 6.5rem + safe-area bottom padding (replacing pb-4 / pb-8); 12 browser checks passed at 0px and 34px safe area.
- [x] The clearance checker now measures with instant scrolling (the app sets smooth scrolling), so it can no longer read a mid-animation position and report a false overlap.