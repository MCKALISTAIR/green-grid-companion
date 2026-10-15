import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { overlayQueue } from '@/lib/overlayQueue';

vi.mock('@/components/LocationManager', () => ({
  LocationManager: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));
vi.mock('@/lib/location', () => ({
  resolvePostcode: vi.fn(async () => ({ lat: 51.5, lon: -0.1 })),
  getDistance: vi.fn(() => 500),
  getRegionFromCoordinates: vi.fn(async () => ({
    regionName: 'South Scotland',
    regionPostcode: 'EH1',
  })),
}));

import {
  LocationMismatchPrompt,
  LOCATION_PROMPT_COPY,
  NATIONAL_OPT_IN_DISMISSED_KEY,
  PROMPT_DELAY_MS,
} from './LocationMismatchPrompt';

const getCurrentPosition = vi.fn((ok: PositionCallback) =>
  ok({ coords: { latitude: 55.95, longitude: -3.19 } } as GeolocationPosition),
);

async function flush(ms = PROMPT_DELAY_MS + 10) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('LocationMismatchPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    overlayQueue.reset();
    vi.useFakeTimers();
    getCurrentPosition.mockClear();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('never shows "Update Location?" or asks for GPS when National was chosen', async () => {
    render(<LocationMismatchPrompt currentPostcode="GB" onUpdate={vi.fn()} />);
    await flush();
    expect(screen.queryByText(LOCATION_PROMPT_COPY.mismatchTitle)).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('offers a gentle opt-in in National mode and remembers the dismissal', async () => {
    const { unmount } = render(<LocationMismatchPrompt currentPostcode="GB" onUpdate={vi.fn()} />);
    await flush();
    expect(screen.getByText(LOCATION_PROMPT_COPY.optInTitle)).toBeTruthy();
    expect(screen.queryByText(/national averages/i)).toBeNull();
    const use = screen.getByRole('button', { name: LOCATION_PROMPT_COPY.optInActionLabel });
    expect(use.textContent).toBe(LOCATION_PROMPT_COPY.optInAction);
    expect(use.className).toContain('min-h-11');
    const notNow = screen.getByRole('button', { name: LOCATION_PROMPT_COPY.optInDismiss });
    expect(notNow.className).toContain('min-h-11');
    fireEvent.click(notNow);
    expect(screen.queryByText(LOCATION_PROMPT_COPY.optInTitle)).toBeNull();
    expect(localStorage.getItem(NATIONAL_OPT_IN_DISMISSED_KEY)).toBe('1');
    unmount();

    overlayQueue.reset();
    render(<LocationMismatchPrompt currentPostcode="GB" onUpdate={vi.fn()} />);
    await flush();
    expect(screen.queryByText(LOCATION_PROMPT_COPY.optInTitle)).toBeNull();
  });

  it('still suggests the detected region for a regional postcode far away', async () => {
    render(<LocationMismatchPrompt currentPostcode="EX4" onUpdate={vi.fn()} />);
    await flush();
    expect(screen.getByText(LOCATION_PROMPT_COPY.mismatchTitle)).toBeTruthy();
    expect(screen.getByText('South Scotland')).toBeTruthy();
  });

  it('waits for the privacy choice before showing (one pop-up at a time)', async () => {
    overlayQueue.setConsentPending(true);
    render(<LocationMismatchPrompt currentPostcode="GB" onUpdate={vi.fn()} />);
    await flush();
    expect(screen.queryByText(LOCATION_PROMPT_COPY.optInTitle)).toBeNull();
    await act(async () => {
      overlayQueue.setConsentPending(false);
    });
    await flush(10);
    expect(screen.getByText(LOCATION_PROMPT_COPY.optInTitle)).toBeTruthy();
  });

  it('queues behind an active consent sheet', async () => {
    const consent = overlayQueue.request('consent', 'consent');
    render(<LocationMismatchPrompt currentPostcode="GB" onUpdate={vi.fn()} />);
    await flush();
    expect(screen.queryByText(LOCATION_PROMPT_COPY.optInTitle)).toBeNull();
    await act(async () => consent.release());
    await flush(10);
    expect(screen.getByText(LOCATION_PROMPT_COPY.optInTitle)).toBeTruthy();
  });
});
