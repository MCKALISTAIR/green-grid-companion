import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { UnknownWeatherCloudBank } from './WeatherArt';
import { BANK_EDGE_DEPTH, bankLobes } from './bankEdge';

const cubicAt = (p: number[], t: number) =>
  (1 - t) ** 3 * p[0] + 3 * (1 - t) ** 2 * t * p[1] + 3 * (1 - t) * t ** 2 * p[2] + t ** 3 * p[3];

describe('BH-90 unknown-weather cloud bank', () => {
  it('never draws above its own top, so its box top is the highest cloud top', () => {
    for (const [w, seed] of [
      [320, 17],
      [390, 41],
      [1440, 17],
    ]) {
      let highest = Infinity;
      for (const lobe of bankLobes(w, seed, 11)) {
        const ys = lobe.map((p) => p[1]);
        for (let t = 0; t <= 1; t += 0.02) highest = Math.min(highest, cubicAt(ys, t));
      }
      expect(highest).toBeGreaterThanOrEqual(0.5);
      expect(highest).toBeLessThan(BANK_EDGE_DEPTH);
    }
  });

  it('has irregular lobes, not one repeating row, and covers the width', () => {
    const lobes = bankLobes(390, 41, 37);
    const widths = lobes.map((l) => Math.round(l[3][0] - l[0][0]));
    const heights = lobes.map((l) => Math.round(Math.min(l[0][1], l[3][1]) - l[1][1]));
    expect(new Set(widths).size).toBeGreaterThan(lobes.length / 2);
    expect(new Set(heights).size).toBeGreaterThan(lobes.length / 2);
    expect(lobes[0][0][0]).toBeLessThanOrEqual(0);
    expect(lobes[lobes.length - 1][3][0]).toBeGreaterThanOrEqual(390);
  });

  it('starts at the given top (text bottom + 34) with a paler back bank and a lit rim', () => {
    const { container } = render(<UnknownWeatherCloudBank topPx={222} timeOfDay="midday" />);
    const bank = container.querySelector('[data-art="cloud-bank"]') as HTMLElement;
    expect(bank.style.top).toBe('222px');
    expect(bank.dataset.variant).toBe('unknown-weather');
    const paths = bank.querySelectorAll('path');
    // back fill, back rim, front fill, front rim
    expect(paths).toHaveLength(4);
    expect(Number(paths[0].getAttribute('opacity'))).toBeLessThan(
      Number(paths[2].getAttribute('opacity')),
    );
    expect(paths[1].getAttribute('fill')).toBe('none');
    expect(paths[3].getAttribute('fill')).toBe('none');
  });
});
