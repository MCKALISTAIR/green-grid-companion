import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { OnboardingBackdrop } from './OnboardingBackdrop';

describe('OnboardingBackdrop', () => {
  it('is a static dusk wash with no motion or scene machinery', () => {
    const { container } = render(<OnboardingBackdrop />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('[class*="animate"]').length).toBe(0);

    const src = readFileSync(resolve(__dirname, 'OnboardingBackdrop.tsx'), 'utf-8');
    expect(src).not.toMatch(/^import .*from/m);
    expect(src).not.toMatch(/\b(use[A-Z]\w*|requestAnimationFrame)\b/);
  });
});
