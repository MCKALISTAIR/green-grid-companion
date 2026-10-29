import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostcodeNotFoundNotice } from './PostcodeNotFoundNotice';
import { TONE_STORAGE_KEY } from '@/lib/tone';

const noop = () => {};

beforeAll(() => {
  // jsdom lacks these; the picker (cmdk + Radix) needs them to open.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

describe('PostcodeNotFoundNotice (Design call 22 Oct)', () => {
  beforeEach(() => localStorage.clear());

  it.each(['plain', 'cheeky'])('same wording in %s', (tone) => {
    localStorage.setItem(TONE_STORAGE_KEY, tone);
    render(<PostcodeNotFoundNotice postcode="ZZ9 9ZZ" onChangePostcode={noop} />);
    const notice = screen.getByTestId('postcode-not-found');
    expect(screen.getByText("We couldn't find ZZ9 9ZZ")).toBeInTheDocument();
    expect(screen.getByText('Showing the GB average for now.')).toBeInTheDocument();
    expect(notice).not.toHaveTextContent('Settings');
    expect(notice).not.toHaveTextContent('So this is');
  });

  it('"Fix postcode" opens the location picker directly, 44px tall', () => {
    render(<PostcodeNotFoundNotice postcode="ZZ9 9ZZ" onChangePostcode={noop} />);
    const btn = screen.getByRole('button', { name: 'Fix postcode' });
    expect(btn.className).toContain('h-11');
    fireEvent.click(btn);
    expect(screen.getByPlaceholderText('Postcode, town or region…')).toBeInTheDocument();
  });
});
