import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UKMap } from './UKMap';

describe('UKMap stacking', () => {
  it('isolates its root so the -z-10 GB outline is not painted under the page background', () => {
    render(<UKMap regions={[]} />);
    const root = screen.getByRole('group', { name: 'Map of regional carbon intensity' });
    expect(root.className).toMatch(/\bisolate\b/);
    expect(root.querySelector('.-z-10 svg')).not.toBeNull();
  });
});
