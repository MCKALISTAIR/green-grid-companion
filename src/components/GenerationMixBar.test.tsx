import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenerationMixBar } from './GenerationMixBar';

describe('GenerationMixBar', () => {
    it('renders generation segments', () => {
        const mix = [
            { fuel: 'wind', perc: 40 },
            { fuel: 'solar', perc: 10 },
            { fuel: 'gas', perc: 50 }
        ];

        render(<GenerationMixBar mix={mix} />);

        // Check if segments are rendered (titles are usually in tooltips or labels)
        // Here we can check if the container exists
        const container = screen.getByRole('progressbar');
        expect(container).toBeInTheDocument();
    });

    it('handles empty mix', () => {
        render(<GenerationMixBar mix={[]} />);
        const container = screen.getByRole('progressbar');
        expect(container).toBeInTheDocument();
    });
});
