import { describe, expect, it } from 'vitest';
import { getWindowLitColor } from './windowLitColor';

describe('getWindowLitColor', () => {
  it('uses warm amber on clean nights', () => {
    expect(getWindowLitColor(0.9, 'night')).toBe('#fbbf24');
  });

  it('shifts toward sickly green on dirty nights', () => {
    expect(getWindowLitColor(0, 'night')).toBe('#9cb84a');
    expect(getWindowLitColor(0.1, 'night')).not.toBe('#fbbf24');
  });

  it('keeps dusk on the same amber→green path', () => {
    expect(getWindowLitColor(0.95, 'dusk')).toBe('#fbbf24');
    expect(getWindowLitColor(0, 'dusk')).toBe('#9cb84a');
  });
});
