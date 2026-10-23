import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CloudBank } from './WeatherArt';
import { CLOUD_BANK_COLOURS, CLOUD_BANK_DAY_BELOW_TEXT } from '@/lib/artPalette';

// Design review of #185 (23 Oct 2026): on the home hero the overcast bank follows
// the #179 rule (cloud tops at the hero text bottom + 34), so its edge never
// crosses the number, label or warning icon. The rendered gap is asserted at 390
// and 320 in e2e/hero-contrast.spec.ts.
describe('overcast cloud bank and the hero text', () => {
  it('starts at the given top (text bottom + 34) with its tops as its edge', () => {
    const { container } = render(<CloudBank night topPx={263.6} />);
    const bank = container.querySelector('[data-art="cloud-bank"]') as HTMLElement;
    expect(bank.style.top).toBe('264px');
    expect(bank.dataset.variant).toBe('below-text');
    expect(bank.dataset.cloudTop).toBe('264');
    const [back, front] = Array.from(bank.querySelectorAll('path'));
    // Filled downwards (V120), never up to the top of the scene (V0).
    expect(back.getAttribute('d')).toMatch(/ V120 H0Z$/);
    expect(front.getAttribute('d')).toMatch(/ V120 H0Z$/);
    expect(back.getAttribute('fill')).toBe(CLOUD_BANK_COLOURS.night[1]);
    expect(front.getAttribute('fill')).toBe(CLOUD_BANK_COLOURS.night[0]);
  });

  it('still hangs from the top where no hero text sets a top (scene test, compact)', () => {
    const { container } = render(<CloudBank />);
    const bank = container.querySelector('[data-art="cloud-bank"]') as SVGElement;
    expect(bank.tagName.toLowerCase()).toBe('svg');
    expect(bank.getAttribute('data-variant')).toBeNull();
    expect(bank.querySelector('path')!.getAttribute('d')).toMatch(/ V0 H0Z$/);
  });

  // Design review of #185, second round: by day the bank below the text is a
  // mid-grey close to the sky, stepping darker toward the horizon, and only its
  // top lobes carry the lit rim. Pixel-measured in e2e/cloud-bank-day.spec.ts.
  it('by day is the mid-grey palette, darker toward the horizon, rim on the top lobes only', () => {
    const { container } = render(<CloudBank topPx={222} />);
    const bank = container.querySelector('[data-art="cloud-bank"]') as HTMLElement;
    expect(bank.dataset.tone).toBe('day');
    const body = bank.querySelectorAll('[data-bank-body]');
    expect(body).toHaveLength(2);
    // Back lobes in the svg; front lobes and body are one masked surface (no seam).
    const back = body[0].querySelectorAll('path');
    expect(back).toHaveLength(1);
    expect(back[0].getAttribute('fill')).toBe(CLOUD_BANK_DAY_BELOW_TEXT.back);
    expect(body[1].hasAttribute('data-bank-front')).toBe(true);
    const lightness = (c: string) => Number(/(\d+(?:\.\d+)?)%\)$/.exec(c)![1]);
    expect(lightness(CLOUD_BANK_DAY_BELOW_TEXT.base)).toBeLessThan(
      lightness(CLOUD_BANK_DAY_BELOW_TEXT.front),
    );
    const rims = bank.querySelectorAll('[data-bank-rim]');
    expect(rims).toHaveLength(1);
    const rim = rims[0].querySelector('path')!;
    expect(rim.getAttribute('fill')).toBe('none');
    // Only the scalloped top edge (the back lobes at y 20), never closed downwards.
    expect(rim.getAttribute('d')).not.toMatch(/Z$/);
  });

  it('at dusk and night keeps the night colours and has no rim', () => {
    const { container } = render(<CloudBank night topPx={222} />);
    const bank = container.querySelector('[data-art="cloud-bank"]') as HTMLElement;
    expect(bank.dataset.tone).toBe('night');
    expect(bank.querySelector('[data-bank-rim]')).toBeNull();
  });
});
