/**
 * Octopus linking journey copy (PR-O1, Design brief 23 Oct 2026, sections 3.1 to 3.6).
 * Plain only. GB spelling, no em dashes, no made-up numbers.
 */

export const OCTOPUS_REFERRAL_URL = 'https://share.octopus.energy/light-sheep-695';
export const OCTOPUS_API_PAGE_URL =
  'https://octopus.energy/dashboard/new/accounts/personal-details/api-access/';
export const OCTOPUS_DASHBOARD_URL = 'https://octopus.energy/dashboard/new/';

/** 3.1 Entry card (state B). */
export const OCTOPUS_ENTRY_COPY = {
  title: 'Octopus Energy',
  line: 'Link your smart meter and see when your home actually used power.',
  benefits: [
    {
      label: 'Your real footprint',
      detail: "From your meter's half-hourly readings, not an estimate.",
    },
    { label: 'Green Score', detail: 'How much of your usage landed in cleaner hours.' },
    { label: 'Greener nights', detail: "Octopus's own forecast of the cleanest nights ahead." },
  ],
  primary: 'Link my Octopus account',
  under: "You'll need two things from your Octopus account. We'll show you where.",
  referralLead: 'Not with Octopus yet?',
  referralLink: 'Join with our referral link and get £50 credit.',
} as const;

/** 3.2 Linking sheet. */
export const OCTOPUS_SHEET_COPY = {
  title: 'Link Octopus',
  subtitle: "Two things to copy, then you're done.",
  step1Title: 'Step 1 of 2: Get your API key',
  step1Items: {
    signIn: 'Sign in to Octopus.',
    signInNote: "Octopus may ask you to prove you're human first. That's their check, not ours.",
    openPage: 'Open the API access page.',
    regenerate: 'Tap "Regenerate my API key".',
    copyKeyLead: 'Copy the key. It starts',
  },
  apiPageButton: 'Open Octopus API page',
  tipLead: 'New to this?',
  tip: 'Octopus says "You don\'t have an API key yet" and only shows a Regenerate button. Tap it anyway: it makes your first key.',
  smallPrint: 'Already got a key? Use that one, no need to make a new one.',
  step2Title: 'Step 2 of 2: Find your account number',
  step2Body:
    "It's not on the API page. It's near the top of your main Octopus dashboard and starts A-, like A-12AB34CD.",
  dashboardButton: 'Open Octopus dashboard',
  accountLabel: 'Account number',
  accountHelper: 'On your Octopus dashboard. Starts A-.',
  accountPlaceholder: 'A-12AB34CD',
  keyLabel: 'API key',
  keyHelper: 'From the API access page. Starts sk_live_.',
  keyPlaceholder: 'sk_live_...',
  showKey: 'Show API key',
  hideKey: 'Hide API key',
  paste: 'Paste',
  pasteAccountLabel: 'Paste account number',
  pasteKeyLabel: 'Paste API key',
  privacy:
    "We only read from Octopus: your electricity meter details, half-hourly usage, Octopus's greenness forecast and, if you're on Intelligent, your charging slots. Nothing we do changes your Octopus account. Your key goes to our server once, is stored encrypted, and never stays on this device. You can disconnect any time.",
  submit: 'Link my meter',
  submitting: 'Checking with Octopus...',
  cancel: 'Cancel',
} as const;

/** 3.3 Inline field errors. */
export const OCTOPUS_FIELD_ERRORS = {
  accountEmpty: 'Add your account number.',
  accountFormat:
    "That doesn't look like an account number. It's A- then 8 letters or numbers, like A-12AB34CD.",
  keyEmpty: 'Add your API key.',
  keyFormat: "That doesn't look like an Octopus API key. It starts sk_live_.",
  wrongKey:
    "Octopus didn't accept that key. Copy it again from the API page, or tap Regenerate there for a fresh one.",
  wrongAccount: "Octopus can't find that account number. Check it on your main dashboard.",
} as const;

/** 3.3 Banner at the top of the form (role="alert"). */
export const OCTOPUS_BANNER_COPY = {
  refused: 'Octopus said no to those details. Check both, then try again.',
  octopusDown: "Octopus isn't answering just now. Try again in a bit.",
  noMeter:
    "Your details work, but Octopus didn't list an electricity meter on that account. GridSense needs one to show your usage.",
  checkAgain: 'Check again',
  rateLimited: (minutes: number) =>
    `That's a lot of tries. Give it ${minutes} minutes, then try again.`,
  rateLimitedOneMinute: "That's a lot of tries. Give it 1 minute, then try again.",
  rateLimitedUnknown: "That's a lot of tries. Give it a few minutes, then try again.",
  saveFailed: "We couldn't save your details just now. Nothing's linked yet. Try again in a bit.",
  noSession: "We couldn't start a secure connection. Check your connection and try again.",
  offline: "You're offline. Link your meter when you're back online.",
  unknown: "That didn't work, and we're not sure why. Try again in a bit.",
} as const;

/** 3.4 Not linked yet (state D). */
export const OCTOPUS_NOT_LINKED_COPY = {
  badge: 'Not linked yet',
  line: "Your details are saved, but Octopus hasn't given us a meter yet.",
  fix: 'Fix details',
  checkAgain: 'Check again',
  checking: 'Checking...',
  change: 'Change details',
  remove: 'Remove details',
  keyEnding: 'API key ending',
} as const;

/** 3.5 Success (in the sheet) and the linked card (state E). */
export const OCTOPUS_SUCCESS_COPY = {
  title: "You're linked.",
  found: (n: number, account: string) =>
    `We found ${n} electricity ${n === 1 ? 'meter' : 'meters'} on ${account}.`,
  meterRow: (last6: string) => `Electricity, meter ending ${last6}`,
  exportBadge: 'Export',
  gasLine: "GridSense uses your electricity meter only, so there's nothing to set up for gas.",
  syncing: 'Getting your usage from Octopus...',
  readingsIn: (readings: number) =>
    `Got ${readings.toLocaleString('en-GB')} half-hours of usage. Your footprint's ready.`,
  zeroReadings:
    "Linked, but Octopus hasn't sent any half-hourly readings for this meter yet. If your smart meter is new, or isn't sending readings, this is what you'll see. Tap Sync Now later to check again.",
  seeFootprint: 'See my footprint',
  done: 'Done',
  closedEarlyToast: 'Linked. Your usage is on its way.',
} as const;

export const OCTOPUS_LINKED_CARD_COPY = {
  badge: 'Linked',
  line: 'Tracking your footprint from your meter.',
  lastSynced: (ago: string) => `Last synced ${ago}`,
} as const;

/** 3.6 MPAN popover. */
export const OCTOPUS_MPAN_COPY = {
  trigger: 'What is an MPAN?',
  title: "What's an MPAN?",
  body: "Your electricity meter's ID number. It's 13 digits and it's on your energy bill.",
} as const;

/** 3.10 Help item "Linking Octopus" and the troubleshooting line. */
export const OCTOPUS_HELP_COPY = {
  // PR-O2 adds Relink and switches this back to "tap Relink and paste a fresh key".
  troubleshooting:
    'Octopus not working? Open Settings. If your link has expired, disconnect it, then link it again with a fresh key from Octopus.',
  itemTitle: 'Linking Octopus',
  need: 'You need two things: your API key and your account number.',
  apiKey:
    'API key: sign in to Octopus, open the API access page and tap "Regenerate my API key". If Octopus says you don\'t have a key yet, that button makes your first one. It starts sk_live_.',
  apiKeyLink: 'Open Octopus API page',
  account: "Account number: it's on your main Octopus dashboard, not the API page. It starts A-.",
  electricityOnly: "Electricity only? That's fine. GridSense only uses your electricity meter.",
  noUsage:
    "Linked but no usage? Octopus hasn't sent half-hourly readings for your meter yet. Tap Sync Now later to check again.",
} as const;
