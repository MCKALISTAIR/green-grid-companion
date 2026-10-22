import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LocationProvider } from '@/contexts/LocationContext';
import Onboarding from './Onboarding';

vi.mock('@/lib/location', () => ({ resolvePostcode: vi.fn(async () => null) }));
const geo = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getCurrentPosition: vi.fn(),
}));
vi.mock('@capacitor/geolocation', () => ({ Geolocation: geo }));

function renderOnboarding() {
  return render(
    <LocationProvider>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<p>HOME</p>} />
        </Routes>
      </MemoryRouter>
    </LocationProvider>,
  );
}

const field = () => screen.getByPlaceholderText('Postcode, like SW1A or SW1A 1AA');
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Show my number' }));

describe('first launch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('is one screen with location, postcode and a GB-average skip', () => {
    renderOnboarding();
    expect(
      screen.getByRole('heading', { name: 'How clean is your power right now?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use my location/ })).toBeInTheDocument();
    expect(screen.getByText('Just show me the GB average')).toBeInTheDocument();
    expect(screen.getByText(/We only keep the first half of your postcode/)).toBeInTheDocument();
  });

  it('keeps only the outward code, even without a space', async () => {
    renderOnboarding();
    fireEvent.change(field(), { target: { value: 'sw1a1aa' } });
    submit();
    await screen.findByText('HOME');
    expect(localStorage.getItem('gridgreen-postcode')).toBe('SW1A');
    expect(localStorage.getItem('onboarding_complete')).toBe('true');
    expect(localStorage.getItem('gridsense-first-number-pending')).toBe('1');
    expect(localStorage.getItem('cookie-consent')).toBeNull();
  });

  it('skip stores the national mode so home does not bounce back', async () => {
    renderOnboarding();
    fireEvent.click(screen.getByText('Just show me the GB average'));
    await screen.findByText('HOME');
    expect(localStorage.getItem('gridgreen-postcode')).toBe('GB');
  });

  it('explains Northern Ireland before showing the GB average', async () => {
    renderOnboarding();
    fireEvent.change(field(), { target: { value: 'BT1 1AA' } });
    submit();
    expect(
      await screen.findByText(/Northern Ireland is on the all-island grid it shares with Ireland/),
    ).toBeInTheDocument();
    expect(localStorage.getItem('gridgreen-postcode')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show the GB average' }));
    await screen.findByText('HOME');
    expect(localStorage.getItem('gridgreen-postcode')).toBe('GB');
  });

  it.each([
    ['GY1 1AA', /The Channel Islands aren't on the GB grid/],
    ['JE2 3AB', /The Channel Islands aren't on the GB grid/],
    ['IM1 1AA', /Isle of Man has its own grid/],
    ['BFPO 1', /We can't tell where a Forces \(BFPO\) address is/],
  ])('%s is not on the GB grid: says so and offers the GB average', async (pc, text) => {
    renderOnboarding();
    fireEvent.change(field(), { target: { value: pc } });
    submit();
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(localStorage.getItem('gridgreen-postcode')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show the GB average' }));
    await screen.findByText('HOME');
    expect(localStorage.getItem('gridgreen-postcode')).toBe('GB');
  });

  it('says so inline for something that is not a postcode', () => {
    renderOnboarding();
    fireEvent.change(field(), { target: { value: 'hello' } });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent("That doesn't look like a postcode");
  });

  it('asks for location permission when it has not been asked yet', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'prompt' });
    geo.requestPermissions.mockResolvedValue({ location: 'denied' });
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    expect(
      await screen.findByText('No problem. A postcode works just as well.'),
    ).toBeInTheDocument();
    expect(geo.requestPermissions).toHaveBeenCalled();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('points to Settings when location was denied before', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'denied' });
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    expect(
      await screen.findByText(/You can turn location on later in Settings/),
    ).toBeInTheDocument();
    expect(geo.requestPermissions).not.toHaveBeenCalled();
  });

  it('turns a location into the outward code', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'granted' });
    geo.getCurrentPosition.mockResolvedValue({ coords: { latitude: 55.95, longitude: -3.19 } });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: 200, result: [{ outcode: 'EH1', postcode: 'EH1 1YZ' }] }),
        ),
      );
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    await screen.findByText('HOME');
    await waitFor(() => expect(localStorage.getItem('gridgreen-postcode')).toBe('EH1'));
    fetchMock.mockRestore();
  });
});
