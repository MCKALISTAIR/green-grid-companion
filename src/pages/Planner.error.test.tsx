import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const refetch = vi.fn();
vi.mock('@/hooks/useCarbonData', () => ({
  useCarbonData: () => ({
    forecast: [],
    intensity: 0,
    hasReading: false,
    refetch,
    isLoading: false,
    isError: true,
    error: new Error('Failed to fetch forecast: 503'),
  }),
}));
vi.mock('@/contexts/LocationContext', () => ({
  useAppLocation: () => ({ postcode: 'GB', setPostcode: vi.fn() }),
}));

import Planner from './Planner';

function renderPlanner() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Planner />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Planner forecast error (Design state 6)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('planner-onboarding-seen', '1');
    refetch.mockReset();
  });

  it('keeps the appliance picker and shows the error in the result card', () => {
    localStorage.setItem('gridgreen-fact-prefs', 'plain');
    renderPlanner();
    expect(screen.getByText('Dishwasher')).toBeInTheDocument();
    const card = screen.getByTestId('planner-error');
    expect(card).toHaveTextContent("Couldn't load the forecast");
    expect(card).toHaveTextContent(
      "Your choice is saved. We'll find the best time as soon as the forecast loads.",
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    expect(screen.getByTestId('planner-error-sticky')).toHaveTextContent(
      "Couldn't load the forecast",
    );
    expect(refetch).toHaveBeenCalled();
  });

  it('selection survives and the Cheeky line names it', () => {
    localStorage.setItem('gridgreen-fact-prefs', 'cheeky');
    renderPlanner();
    fireEvent.click(screen.getByText('Dishwasher'));
    expect(screen.getByTestId('planner-error')).toHaveTextContent(
      'Your Dishwasher choice is saved. The forecast is dragging its feet.',
    );
  });
});
