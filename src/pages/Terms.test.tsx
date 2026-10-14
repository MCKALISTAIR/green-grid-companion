import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Terms from './Terms';
import termsSource from '@/content/terms.md?raw';
import { parseMarkdown } from '@/lib/simpleMarkdown';

describe('/terms', () => {
  it('renders the signed-off terms without draft markers', () => {
    const { container } = render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Terms of Use' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /1\. About these terms/ })).toBeInTheDocument();
    expect(termsSource).not.toMatch(/\[CONFIRM/);
    expect(termsSource).not.toMatch(/\bDRAFT\b/);
    expect(container.querySelector('[data-testid="confirm-marker"]')).toBeNull();
    expect(container.textContent).toContain('12 October 2026');
    expect(container.textContent).toContain('law of Scotland');
    expect(container.textContent).toContain('not liable');
    expect(container.textContent).not.toContain('Tesla');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  it('never turns file text into markup', () => {
    const { container } = render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );
    expect(container.querySelector('script, iframe')).toBeNull();
    expect(parseMarkdown('<b>x</b>')).toEqual([{ type: 'paragraph', text: '<b>x</b>' }]);
  });
});
