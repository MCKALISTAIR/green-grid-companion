import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const getAllRegions = vi.fn();
vi.mock('@/lib/carbonApi', async (orig) => ({
  ...(await orig<typeof import('@/lib/carbonApi')>()),
  getAllRegions: (...a: unknown[]) => getAllRegions(...a),
}));

import MapPage from './Map';

function renderMap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Rank map empty state (Design state 5)', () => {
  beforeEach(() => {
    localStorage.clear();
    getAllRegions.mockReset();
  });

  it('overlays the map with the empty card and retries', async () => {
    localStorage.setItem('gridgreen-fact-prefs', 'plain');
    getAllRegions.mockResolvedValue([]);
    renderMap();
    expect(await screen.findByText('No regional figures right now')).toBeInTheDocument();
    expect(
      screen.getByText("NESO hasn't sent regional data yet. National figures are still on Home."),
    ).toBeInTheDocument();
    expect(screen.getByText('Rank')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(getAllRegions).toHaveBeenCalledTimes(2);
  });

  it('Cheeky line follows the tone setting', async () => {
    localStorage.setItem('gridgreen-fact-prefs', 'cheeky');
    getAllRegions.mockResolvedValue([]);
    renderMap();
    expect(
      await screen.findByText('The regions are being shy. National figures are still on Home.'),
    ).toBeInTheDocument();
  });
});
