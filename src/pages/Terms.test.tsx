import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import Terms from './Terms';

afterEach(cleanup);

describe('/terms (placeholder until the final terms are signed off)', () => {
  it('shows a short "coming soon" page with a Privacy Policy link and no draft text', () => {
    const { container } = render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Terms coming soon' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(container.textContent).not.toMatch(/CONFIRM|DRAFT/);
  });

  it('asks crawlers not to index it', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(document.head.querySelector('meta[name="robots"][content="noindex"]')).not.toBeNull();
  });

  it('nothing in the app imports the draft terms or links to /terms', () => {
    const root = resolve(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { if (name !== 'test' && name !== 'content') walk(p); continue; }
        if (!/\.(tsx?|jsx?)$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
        const src = readFileSync(p, 'utf-8');
        if (/(from\s*|import\s*\(\s*)['"`][^'"`]*content\/terms\.md/.test(src)) offenders.push(`${p}: imports terms.md`);
        if (/["'`]\/terms["'`]/.test(src) && !p.endsWith('App.tsx')) offenders.push(`${p}: links to /terms`);
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
