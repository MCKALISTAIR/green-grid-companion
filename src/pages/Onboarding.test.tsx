import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LocationProvider } from '@/contexts/LocationContext';
import Onboarding from './Onboarding';

const loc = vi.hoisted(() => ({ checkPostcodeExists: vi.fn(async () => 'ok') }));
vi.mock('@/lib/location', () => ({
  resolvePostcode: vi.fn(async () => null),
  checkPostcodeExists: loc.checkPostcodeExists,
}));
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

const field = () => screen.getByPlaceholderText('Postcode, like SW1A 1AA');
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Show my number' }));

describe('first launch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('is one screen with location, postcode and a GB-average skip', () => {
    renderOnboarding();
    expect(
      screen.getByRole('heading', { name: 'How clean is your power now?' }),
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

  it('says so inline for a well-formed postcode that does not exist (ZZ99 9ZZ)', async () => {
    loc.checkPostcodeExists.mockResolvedValueOnce('missing');
    renderOnboarding();
    fireEvent.change(field(), { target: { value: 'ZZ99 9ZZ' } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't find ZZ99. Check it, or use the GB average.",
    );
    expect(localStorage.getItem('gridgreen-postcode')).toBeNull();
    expect(localStorage.getItem('onboarding_complete')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Use GB average' }));
    await screen.findByText('HOME');
    expect(localStorage.getItem('gridgreen-postcode')).toBe('GB');
  });

  it("does not block when the postcode can't be checked (offline)", async () => {
    loc.checkPostcodeExists.mockResolvedValueOnce('unknown');
    renderOnboarding();
    fireEvent.change(field(), { target: { value: 'EX4 4QJ' } });
    submit();
    await screen.findByText('HOME');
    expect(localStorage.getItem('gridgreen-postcode')).toBe('EX4');
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

  const reverse = (result: unknown) =>
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ status: 200, result })));

  it('outside GB (Paris): says so and offers a GB postcode or the GB average', async () => {
    localStorage.setItem('gridgreen-fact-prefs', 'plain');
    geo.checkPermissions.mockResolvedValue({ location: 'granted' });
    geo.getCurrentPosition.mockResolvedValue({ coords: { latitude: 48.86, longitude: 2.35 } });
    const fetchMock = reverse(null);
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    const card = await screen.findByTestId('outside-gb');
    expect(card).toHaveTextContent('Outside Great Britain');
    expect(card).toHaveTextContent('GridSense only covers the GB grid.');
    expect(
      screen.getByText(
        "Northern Ireland is on the all-island grid it shares with Ireland, which this data doesn't cover.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use GB average' }));
    await screen.findByText('HOME');
    expect(localStorage.getItem('gridgreen-postcode')).toBe('GB');
    fetchMock.mockRestore();
  });

  it('outside GB uses the Cheeky line when the tone is Cheeky', async () => {
    localStorage.setItem('gridgreen-fact-prefs', 'cheeky');
    geo.checkPermissions.mockResolvedValue({ location: 'granted' });
    geo.getCurrentPosition.mockResolvedValue({ coords: { latitude: 40.71, longitude: -74.0 } });
    const fetchMock = reverse(null);
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    expect(await screen.findByTestId('outside-gb')).toHaveTextContent(/^.*Bonjour\?/);
    fetchMock.mockRestore();
  });

  it('inside GB with no nearby postcode is a plain failure, not "outside GB"', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'granted' });
    geo.getCurrentPosition.mockResolvedValue({ coords: { latitude: 57.5, longitude: -5.5 } });
    const fetchMock = reverse(null);
    renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: /Use my location/ }));
    expect(await screen.findByText(/Couldn't find you just now/)).toBeInTheDocument();
    expect(screen.queryByTestId('outside-gb')).toBeNull();
    fetchMock.mockRestore();
  });
});
