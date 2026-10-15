import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TurbineLogo, TURBINE_BLADE_PATH } from './TurbineLogo';

// Regression: the onboarding logo had 9 overlapping blade paths in 3 different
// shapes (leftovers from earlier versions, one of them offset from the hub),
// so the blades looked uneven and "blobby" as the rotor turned.
describe('TurbineLogo rotor', () => {
  const setup = () => render(<TurbineLogo />).container;

  it('has exactly three identical blades, 120° apart, around the hub', () => {
    const blades = [...setup().querySelectorAll('[data-turbine-blade]')];
    expect(blades).toHaveLength(3);
    expect(new Set(blades.map((b) => b.getAttribute('d')))).toEqual(new Set([TURBINE_BLADE_PATH]));
    expect(blades.map((b) => b.getAttribute('transform'))).toEqual([
      'rotate(0 256 256)',
      'rotate(120 256 256)',
      'rotate(240 256 256)',
    ]);
    // Only the rotor's paths: tower + 3 blades, nothing stray.
    expect(setup().querySelectorAll('path')).toHaveLength(4);
  });

  it('blade path is symmetric about the hub axis (x = 256)', () => {
    const xs = TURBINE_BLADE_PATH.match(/-?\d+(\.\d+)?/g)!
      .map(Number)
      .filter((_, i) => i % 2 === 0);
    const mirrored = xs.map((x) => 512 - x).sort((a, b) => a - b);
    expect(mirrored).toEqual([...xs].sort((a, b) => a - b));
  });

  it('blades and hub share one rotating parent pinned to the hub', () => {
    const c = setup();
    const rotor = c.querySelector('[data-turbine-rotor]') as SVGGElement;
    expect(rotor.tagName.toLowerCase()).toBe('g'); // PullToRefresh targets `[&_g]`
    for (const b of c.querySelectorAll('[data-turbine-blade]')) expect(b.parentElement).toBe(rotor);
    expect(rotor.querySelector('circle')?.getAttribute('cx')).toBe('256');
    expect(rotor.style.transformOrigin).toBe('256px 256px');
    expect(rotor.style.transformBox).toBe('view-box');
    expect(rotor.style.willChange).toBe('transform');
    expect(rotor.getAttribute('class')).toContain('animate-[spin_4s_linear_infinite]');
    expect(rotor.getAttribute('class')).toContain('motion-reduce:animate-none');
  });

  it('only rotates: no scale/skew, SMIL or path morph animation', () => {
    const c = setup();
    expect(c.querySelectorAll('animate, animateTransform, animateMotion, set')).toHaveLength(0);
    expect(c.innerHTML).not.toMatch(/scale|skew|matrix/);
    const src = readFileSync(resolve(__dirname, 'TurbineLogo.tsx'), 'utf-8');
    expect(src).not.toMatch(/<motion\./); // no Framer Motion path/attribute animation
    // A bounding-box origin would wobble: the rotor's bbox isn't centred on the hub.
    const rotor = c.querySelector('[data-turbine-rotor]') as SVGGElement;
    expect(rotor.getAttribute('class')).not.toMatch(/origin-/);
    expect(rotor.style.transformBox).not.toBe('fill-box');
  });
});
