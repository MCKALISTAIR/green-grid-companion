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
  crashClause: 'We send crash reports (what went wrong and on what device, not who you are) so we can fix bugs.',
  body: 'We keep your settings on this device. If you accept, we also use Sentry for performance data and occasional privacy-masked session recordings. No advertising cookies.',
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
  current: {
    accepted: 'Optional diagnostics on: performance data and session recordings.',
    declined: 'Essentials only: crash reports and your settings.',
    unset: 'Not chosen yet.',
  },
  saved: {
    accepted: 'Saved. Optional diagnostics are on.',
    declined: 'Saved. Essentials only.',
  },
} as const;
