import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: { pathname: '/settings', key: 'settings' },
  request: vi.fn(() => ({ whenActive: vi.fn(), release: vi.fn() })),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
}));
vi.mock('driver.js', () => ({ driver: () => ({ destroy: vi.fn(), isActive: () => false }) }));
vi.mock('@/lib/overlayQueue', () => ({ requestOverlay: mocks.request }));
import { useProductTour } from './useProductTour';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  mocks.location = { pathname: '/settings', key: 'settings' };
});

describe('product tour hand-off', () => {
  it('navigates to Home with Intensity selected before requesting the first tip', () => {
    const { result } = renderHook(() => useProductTour());
    act(() => result.current.replayTour());
    expect(mocks.navigate).toHaveBeenCalledWith('/', { state: { startProductTour: true } });
    expect(sessionStorage.getItem('product_tour_replay')).toBe('true');
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('does not open tips on Settings', () => {
    sessionStorage.setItem('product_tour_replay', 'true');
    const { result } = renderHook(() => useProductTour());
    act(() => result.current.startTour());
    expect(mocks.request).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('product_tour_replay')).toBe('true');
  });

  it('queues pending replay on Home even when tips have already been seen', () => {
    mocks.location = { pathname: '/', key: 'home' };
    localStorage.setItem('product_tour_seen', 'true');
    sessionStorage.setItem('product_tour_replay', 'true');
    const { result } = renderHook(() => useProductTour());
    act(() => result.current.startTour());
    expect(mocks.request).toHaveBeenCalledWith('tips', 'product-tour');
    expect(sessionStorage.getItem('product_tour_replay')).toBe('true');
  });
});