import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UKMap } from './UKMap';
import { MAP_MAX_WIDTH } from '@/lib/ukMapLayout';

describe('UKMap fit', () => {
  it('caps its width so the map clears the bottom nav and safe area', () => {
    render(<UKMap regions={[]} />);
    const root = screen.getByRole('group', { name: 'Map of regional carbon intensity' });
    expect(root.style.maxWidth).toBe(MAP_MAX_WIDTH);
    expect(MAP_MAX_WIDTH).toContain('var(--bottom-content-inset');
    expect(MAP_MAX_WIDTH).toContain('100dvh');
    expect(root.className).toMatch(/\bmb-12\b/);
  });
});
