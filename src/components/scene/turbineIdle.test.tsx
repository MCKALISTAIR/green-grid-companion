import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { OffshoreWind } from './OffshoreWind';
import { CoastalOffshoreWind } from './CoastalElements';
import { IDLE_TURBINE_SECONDS } from '@/lib/turbineSpeed';

const durs = (container: HTMLElement) =>
  [...container.querySelectorAll('animateTransform[type="rotate"]')].map((el) =>
    el.getAttribute('dur'),
  );

describe('scene turbines while the weather is unknown (BH-90)', () => {
  it('offshore and coastal turbines all turn at the one idle speed', () => {
    const { container } = render(
      <svg>
        <OffshoreWind count={3} windSpeed={0} weatherKnown={false} />
        <CoastalOffshoreWind count={4} windSpeed={0} weatherKnown={false} />
      </svg>,
    );
    const all = durs(container);
    expect(all).toHaveLength(7);
    expect(new Set(all)).toEqual(new Set([`${IDLE_TURBINE_SECONDS}s`]));
  });

  it('with known weather they follow the wind again', () => {
    const { container } = render(
      <svg>
        <OffshoreWind count={3} windSpeed={0} />
        <CoastalOffshoreWind count={4} windSpeed={0} />
      </svg>,
    );
    expect(new Set(durs(container)).size).toBeGreaterThan(1);
  });
});
