import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OffGridNotice } from './OffGridNotice';
import { TONE_STORAGE_KEY } from '@/lib/tone';
import { ONBOARDING_COPY } from '@/lib/voice/onboardingCopy';

const noop = () => {};

describe('OffGridNotice', () => {
  beforeEach(() => localStorage.clear());

  it.each([
    ['northernIreland', 'Northern Ireland is on the all-island grid'],
    ['channelIslands', "The Channel Islands aren't on the GB grid"],
    ['isleOfMan', 'The Isle of Man has its own grid'],
    ['bfpo', "We can't place a Forces (BFPO) address"],
  ] as const)('%s title', (area, title) => {
    render(<OffGridNotice area={area} postcode="GY1" onChangePostcode={noop} />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('plain tone body', () => {
    localStorage.setItem(TONE_STORAGE_KEY, 'plain');
    render(<OffGridNotice area="channelIslands" postcode="GY1" onChangePostcode={noop} />);
    expect(
      screen.getByText("NESO's data only covers Great Britain, so this is the GB average."),
    ).toBeInTheDocument();
  });

  it('cheeky tone body (the default)', () => {
    render(<OffGridNotice area="channelIslands" postcode="GY1" onChangePostcode={noop} />);
    expect(
      screen.getByText("NESO's data stops at Great Britain, so you're seeing the GB average."),
    ).toBeInTheDocument();
  });

  it('"Change location" opens the location picker, 44px tall', () => {
    render(<OffGridNotice area="isleOfMan" postcode="IM1" onChangePostcode={noop} />);
    const btn = screen.getByRole('button', { name: 'Change location' });
    expect(btn.className).toContain('h-11');
  });

  it('onboarding CTA key is offGridCta', () => {
    expect(ONBOARDING_COPY.offGridCta).toBe('Show the GB average');
    expect('northernIrelandCta' in ONBOARDING_COPY).toBe(false);
  });
});
