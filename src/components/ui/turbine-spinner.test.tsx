import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TurbineSpinner } from './turbine-spinner';
import { TURBINE_BLADE_PATH } from '@/components/TurbineLogo';

describe('TurbineSpinner', () => {
  it('uses the brand TurbineLogo blades (not the old thin stick SVG)', () => {
    const { container } = render(<TurbineSpinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    const blades = [...container.querySelectorAll('[data-turbine-blade]')];
    expect(blades).toHaveLength(3);
    expect(new Set(blades.map((b) => b.getAttribute('d')))).toEqual(new Set([TURBINE_BLADE_PATH]));
    // Old spinner was viewBox 0 0 40 40 with needle paths; brand logo is 512.
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 512 512');
  });

  it('applies size classes', () => {
    const { container } = render(<TurbineSpinner size="lg" />);
    expect(container.firstElementChild).toHaveClass('w-12', 'h-12');
  });
});
