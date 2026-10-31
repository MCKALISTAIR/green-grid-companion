/**
 * iPhone Duo viewports for layout checks. One place to swap numbers.
 *
 * Source: Apple WebKit Safari 27.1 iPhone Duo viewports, adjusted for Capacitor
 * (large viewport, no browser bar), Alistair's choice (30 Oct 2026).
 * Safe-area insets and DPR are UNCONFIRMED estimates (iPhone Pro Dynamic Island
 * values); replace them when real readings arrive. See DUO-SPEC.md in the polish notes.
 */
export type SafeArea = { top: number; bottom: number; left: number; right: number };
export type DuoViewport = {
  id: string;
  width: number;
  height: number;
  /** Estimated, not confirmed. */
  insets: SafeArea;
  /** Estimated, not confirmed. */
  dpr: number;
};

const PORTRAIT: SafeArea = { top: 59, bottom: 34, left: 0, right: 0 };
const LANDSCAPE: SafeArea = { top: 0, bottom: 21, left: 59, right: 59 };

export const DUO_VIEWPORTS: DuoViewport[] = [
  { id: 'duo-outer-portrait', width: 382, height: 618, insets: PORTRAIT, dpr: 3 },
  { id: 'duo-outer-landscape', width: 594, height: 406, insets: LANDSCAPE, dpr: 3 },
  { id: 'duo-inner-portrait', width: 669, height: 902, insets: PORTRAIT, dpr: 3 },
  { id: 'duo-inner-landscape', width: 951, height: 620, insets: LANDSCAPE, dpr: 3 },
  { id: 'duo-inner-split', width: 385, height: 609, insets: PORTRAIT, dpr: 3 },
];
