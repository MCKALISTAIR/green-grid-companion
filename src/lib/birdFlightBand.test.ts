import { describe, it, expect } from 'vitest';
import { BIRD_BOX_PX, BIRD_HERO_PADDING_PX, birdFlightBand, birdTopInBand } from './birdFlightBand';

describe('birdFlightBand (BH-116)', () => {
  it('starts the lane 12 px below the hero text and keeps the whole bird above 75%', () => {
    // 390x844 reading hero: text bottom 327, scene 523 (measured).
    expect(birdFlightBand(327, 523)).toEqual({ minTopPx: 339, maxTopPx: 376 });
  });

  it('has no lane when the hero text fills the sky (320x568 and 375x667 reading)', () => {
    expect(birdFlightBand(244, 352)).toBeNull();
    expect(birdFlightBand(311, 420)).toBeNull();
  });

  it('gives the outage hero a wide lane', () => {
    expect(birdFlightBand(188, 523)).toEqual({ minTopPx: 200, maxTopPx: 376 });
  });

  it('never places a bird box within the padded hero text box', () => {
    for (const [textBottom, sceneH] of [
      [327, 523],
      [188, 523],
      [150, 295],
      [188, 420],
      [100, 900],
    ]) {
      const band = birdFlightBand(textBottom, sceneH);
      expect(band).not.toBeNull();
      for (let pct = 0; pct <= 50; pct += 0.5) {
        const top = birdTopInBand(band!, pct);
        expect(top).toBeGreaterThanOrEqual(textBottom + BIRD_HERO_PADDING_PX);
        expect(top + BIRD_BOX_PX).toBeLessThanOrEqual(sceneH * 0.75);
      }
    }
  });

  it('keeps each bird at its place within the old 10-40% range', () => {
    const band = { minTopPx: 200, maxTopPx: 300 };
    expect(birdTopInBand(band, 10)).toBe(200);
    expect(birdTopInBand(band, 25)).toBe(250);
    expect(birdTopInBand(band, 40)).toBe(300);
  });
});
