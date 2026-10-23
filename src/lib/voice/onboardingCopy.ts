/**
 * First launch: one screen, straight to the number.
 * Copy is the same in Cheeky and Plain (it's a permission moment).
 */
export const ONBOARDING_COPY = {
  title: 'How clean is your power right now?',
  body: "Tell us roughly where you are and you'll see your local number straight away.",
  useLocation: 'Use my location',
  finding: 'Finding you…',
  placeholder: 'Postcode, like SW1A or SW1A 1AA',
  submitLabel: 'Show my number',
  keepNote: 'We only keep the first half of your postcode.',
  skip: 'Just show me the GB average',
  denied: 'No problem. A postcode works just as well.',
  deniedForever: 'You can turn location on later in Settings.',
  failed: "Couldn't find you just now. A postcode works just as well.",
  invalid: "That doesn't look like a postcode. Try something like SW1A or SW1A 1AA.",
  checking: 'Checking…',
  northernIreland:
    "Northern Ireland is on the all-island grid it shares with Ireland, which this data doesn't cover. We'll show the GB average instead.",
  offGridCta: 'Show the GB average',
  channelIslands:
    "The Channel Islands aren't on the GB grid, so this data doesn't cover them. We'll show the GB average instead.",
  isleOfMan:
    "The Isle of Man has its own grid, which this data doesn't cover. We'll show the GB average instead.",
  bfpo: "We can't tell where a Forces (BFPO) address is, so we'll show the GB average instead.",
} as const;

/** Asked after the first useful moment, never on first launch. Plain in both tones. */
export const NOTIFICATION_NUDGE_COPY = {
  title: "Want a nudge when your grid's clean?",
  body: "We'll let you know when the forecast drops under your clean alert. You can change it in Settings.",
  yes: 'Yes please',
  no: 'Not now',
  enabled: "Done. We'll nudge you when it's clean.",
  blocked: 'Notifications are off for GridSense. You can turn them on in Settings.',
} as const;
