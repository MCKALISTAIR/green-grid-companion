/**
 * Privacy choice copy (GridSense Design spec). The body is the same in both
 * tones; only the title follows the commentary tone (#49).
 * The crash-report clause is required by Option A (errors-only Sentry runs
 * before a choice) and was approved by GridSense Launch word for word.
 */
import type { CommentaryTone } from '@/lib/tone';

export const CONSENT_COPY = {
  title: {
    cheeky: 'Quick one before we crack on',
    plain: 'Your privacy choice',
  } satisfies Record<CommentaryTone, string>,
  // What's collected and the lawful basis: GridSense Launch's wording wins
  // (/workspace/gridsense-legal/cookie-banner.md rev 2 + the approved crash
  // clause). Title, tone and layout: GridSense Design's spec.
  crashClause:
    'We send crash reports (what went wrong and on what device, not who you are) so we can fix bugs.',
  body: 'We keep your region and settings on this device so the app works. Crash reports store nothing on your device. If you accept, we also use Sentry to measure app speed and record occasional session replays, with all text and images hidden. No ads, no cross-site tracking, and we never sell your data.',
  privacyLink: 'Privacy policy',
  details: 'Details',
  detailsHeadings: {
    always: 'Always',
    ifAccepted: 'Only if you accept',
    never: 'Never',
  },
  footnote: 'Change this any time in Settings.',
  decline: 'Decline',
  accept: 'Accept',
  regionLabel: 'Privacy choice',
} as const;

export const CONSENT_SETTINGS_COPY = {
  title: 'Privacy',
  helper:
    "Performance timings and masked session replays help us make GridSense faster and fix bugs. They only run if you've chosen Accept.",
  current: {
    accepted: 'Currently: optional diagnostics on.',
    declined: 'Currently: essentials only.',
    unset: 'Currently: not chosen yet.',
  },
  footnote:
    'Essential storage (region, settings, sign-in, offline data) and crash reports always stay on. Crash reports use no cookies or device storage.',
  saved: {
    accepted: 'Saved. Optional diagnostics are on.',
    declined: 'Saved. Essentials only.',
  },
} as const;
