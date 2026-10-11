import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Terms from './Terms';
import termsSource from '@/content/terms.md?raw';
import { parseMarkdown } from '@/lib/simpleMarkdown';

describe('/terms', () => {
  it('renders the draft terms with every [CONFIRM] marker still visible', () => {
    const { container } = render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Terms of Use' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /1\. About these terms/ })).toBeInTheDocument();
    const expected = (termsSource.match(/\[CONFIRM/g) ?? []).length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getAllByTestId('confirm-marker')).toHaveLength(expected);
    expect(container.textContent).toContain('[CONFIRM: date]');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  it('never turns file text into markup', () => {
    const { container } = render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(container.querySelector('script, iframe')).toBeNull();
    expect(parseMarkdown('<b>x</b>')).toEqual([{ type: 'paragraph', text: '<b>x</b>' }]);
  });
});
