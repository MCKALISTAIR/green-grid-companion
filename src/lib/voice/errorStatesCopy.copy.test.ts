import { describe, expect, it } from 'vitest';
import { NI_ALL_ISLAND_GRID, OFFLINE_COPY, OUTAGE_COPY, OUTSIDE_COPY } from './errorStatesCopy';
import { ONBOARDING_COPY } from './onboardingCopy';
import { OFF_GRID_HOME_COPY } from './statesCopy';

describe('Design copy calls (BH-80, BH-87)', () => {
  it('hero titles: "Offline" when the device is, NESO when it is not answering', () => {
    expect(OFFLINE_COPY.heroOffline).toBe('Offline');
    expect(OUTAGE_COPY.heroTitle).toBe("NESO isn't answering");
    expect(OUTAGE_COPY.heroUnavailable).toBe('No reading right now');
  });

  it('uses the one all-island Northern Ireland line everywhere', () => {
    expect(NI_ALL_ISLAND_GRID).toBe(
      "Northern Ireland is on the all-island grid it shares with Ireland, which this data doesn't cover.",
    );
    expect(OUTSIDE_COPY.niNote).toBe(NI_ALL_ISLAND_GRID);
    expect(ONBOARDING_COPY.northernIreland).toBe(
      `${NI_ALL_ISLAND_GRID} We'll show the GB average instead.`,
    );
    expect(OFF_GRID_HOME_COPY.northernIreland).toBe('Northern Ireland is on the all-island grid');
  });
});
