import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHillRidgeY } from '@/lib/sceneUtils';
import { gasPlantGeometry } from '@/lib/gasPlant';
import { GasPlant } from './GasPlant';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }));

function draw(band: Parameters<typeof GasPlant>[0]['band'], isNight = false) {
  return render(
    <svg viewBox="0 30 400 120">
      <GasPlant band={band} isNight={isNight} />
    </svg>,
  ).container;
}

describe('GasPlant (PR-2b)', () => {
  beforeEach(() => {
    reduced.value = false;
  });

  it('is always present, with no smoke at very low, low or no data', () => {
    const c = draw('none');
    expect(c.querySelector('[data-art="gas-plant"]')).not.toBeNull();
    expect(c.querySelectorAll('[data-art="smoke"]')).toHaveLength(0);
    expect(c.querySelectorAll('[data-smoke-puff]')).toHaveLength(0);
  });

  it.each([
    ['moderate', 3],
    ['high', 4],
    ['very high', 5],
  ] as const)('%s: two plumes of %i puffs each, only from the stacks', (band, puffs) => {
    const c = draw(band);
    const plumes = c.querySelectorAll('[data-art="smoke"]');
    expect(plumes).toHaveLength(2);
    plumes.forEach((p) => expect(p.querySelectorAll('[data-smoke-puff]')).toHaveLength(puffs));
    // Every puff sits above a stack top.
    const { stacks } = gasPlantGeometry();
    c.querySelectorAll('[data-smoke-puff] circle').forEach((circle) => {
      const cx = Number(circle.getAttribute('cx'));
      const cy = Number(circle.getAttribute('cy'));
      expect(stacks.some((s) => Math.abs(cx - (s.x + 1.5)) < 0.01)).toBe(true);
      expect(cy).toBeLessThan(Math.max(...stacks.map((s) => s.top)));
    });
  });

  it('Reduce Motion: 3 static puffs per stack, no animation class', () => {
    reduced.value = true;
    const c = draw('very high');
    expect(c.querySelectorAll('[data-smoke-puff]')).toHaveLength(6);
    expect(c.querySelector('.art-smoke-puff')).toBeNull();
  });

  it('night: aviation lights on, smoke uses the night fill and underlight', () => {
    const c = draw('high', true);
    expect(c.querySelectorAll('[data-gas-plant-light]')).toHaveLength(2);
    expect(c.innerHTML).toContain('#8f8794');
    expect(c.innerHTML).toContain('#f2b36b');
    expect(draw('high', false).querySelectorAll('[data-gas-plant-light]')).toHaveLength(0);
  });

  it('night with no smoke (very low, zero carbon): static aviation dots stay on', () => {
    const c = draw('none', true);
    expect(c.querySelectorAll('[data-gas-plant-light]')).toHaveLength(2);
    expect(c.querySelectorAll('[data-smoke-puff]')).toHaveLength(0);
  });

  it('smoke rises straight up: no lean or sideways drift (no wind input until direction is fetched)', () => {
    for (const night of [false, true]) {
      const c = draw('very high', night);
      expect(c.querySelectorAll('[data-smoke-puff]').length).toBeGreaterThan(0);
      for (const plume of c.querySelectorAll('[data-art="smoke"]')) {
        expect(plume.getAttribute('transform')).toBeNull();
      }
      for (const puff of c.querySelectorAll<SVGGElement>('[data-smoke-puff]')) {
        expect(puff.style.transform).toMatch(/^translate\(0px, -/);
      }
    }
  });

  it('is grounded on the back ridge (no floating edge)', () => {
    const g = gasPlantGeometry();
    for (const x of [g.x, g.x + g.width / 2, g.x + g.width]) {
      expect(g.baseY).toBeGreaterThanOrEqual(getHillRidgeY('back', x));
    }
  });
});
