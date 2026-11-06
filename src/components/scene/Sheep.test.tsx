import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getHillRidgeY } from '@/lib/sceneUtils';
import { Sheep } from './Sheep';
import {
  HERO_SAFE_X,
  SHEEP_MIN_X,
  SHEEP_SINK,
  SHEEP_SPOTS,
  sheepTransform,
} from '@/lib/sheepLayout';

vi.mock('@/hooks/useHaptics', () => ({ useHaptics: () => ({ impactLight: () => {} }) }));

describe('Sheep (#239 Design review)', () => {
  it('feet sit 0.5 units into the mid ridge, east of x 150 and of the hero safe zone', () => {
    for (const s of SHEEP_SPOTS) {
      expect(s.x).toBeGreaterThanOrEqual(SHEEP_MIN_X);
      expect(s.x).toBeGreaterThan(HERO_SAFE_X.max);
      expect(s.y).toBeCloseTo(getHillRidgeY('mid', s.x) + SHEEP_SINK, 5);
      // On a slope, not perched above a crest: the ridge is no higher either side.
      expect(getHillRidgeY('mid', s.x - 6)).toBeLessThanOrEqual(s.y);
    }
  });

  it('the transform seats the feet at the spot, about 13 units wide', () => {
    const t = sheepTransform(300, 100, 13);
    const [, tx, ty, sc] = t
      .match(/translate\(([\d.-]+) ([\d.-]+)\) scale\(([\d.]+)\)/)!
      .map(Number);
    expect(40 * sc).toBeCloseTo(13, 5);
    expect(tx + 20 * sc).toBeCloseTo(300, 1);
    expect(ty + 30 * sc).toBeCloseTo(100, 1);
  });

  it('renders as an SVG group and still says something when tapped', () => {
    const { container } = render(
      <svg viewBox="0 30 400 120">
        <Sheep x={292} y={95} isNight={false} />
      </svg>,
    );
    const g = container.querySelector('[data-art="sheep"]')!;
    expect(g.tagName.toLowerCase()).toBe('g');
    fireEvent.click(g);
    expect(container.textContent).toMatch(/!/);
  });
});
