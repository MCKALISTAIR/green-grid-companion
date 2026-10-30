import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  ensure: vi.fn(),
  listeners: {} as Record<string, (arg: unknown) => unknown>,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}));
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: vi.fn(async () => ({ receive: 'prompt' })),
    register: vi.fn(async () => {}),
    addListener: vi.fn(async (name: string, cb: (arg: unknown) => unknown) => {
      h.listeners[name] = cb;
      return { remove: vi.fn() };
    }),
  },
}));
vi.mock('@/lib/auth-utils', () => ({ ensureAuthSession: h.ensure }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { usePushNotifications } from './usePushNotifications';

const fetchMock = vi.fn(
  async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify({ data: null }), { status: 200 }),
);

async function setup() {
  const hook = renderHook(() => usePushNotifications('SW1A'));
  await waitFor(() => expect(h.listeners.registration).toBeDefined());
  return hook;
}

function authOf(call: unknown[]) {
  return ((call[1] as RequestInit).headers as Record<string, string>).Authorization;
}

describe('usePushNotifications session (BH-149)', () => {
  beforeEach(() => {
    h.ensure.mockReset();
    h.listeners = {};
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('get: ensures a session and sends its token', async () => {
    h.ensure.mockResolvedValue({ access_token: 'anon-jwt' });
    await setup();
    await act(async () => {
      await h.listeners.registration({ value: 'dev-1' });
    });
    expect(h.ensure).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('action=get');
    expect(authOf(fetchMock.mock.calls[0])).toBe('Bearer anon-jwt');
  });

  it('get: makes no request when no session can be made', async () => {
    h.ensure.mockResolvedValue(null);
    await setup();
    await act(async () => {
      await h.listeners.registration({ value: 'dev-1' });
    });
    expect(h.ensure).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('upsert: ensures a session and sends its token', async () => {
    h.ensure.mockResolvedValue({ access_token: 'anon-jwt' });
    const { result } = await setup();
    await act(() => result.current.savePreferences(result.current.prefs, 'dev-1'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('action=upsert');
    expect(authOf(fetchMock.mock.calls[0])).toBe('Bearer anon-jwt');
  });

  it('upsert: makes no request when ensureAuthSession throws', async () => {
    h.ensure.mockRejectedValue(new Error('offline'));
    const { result } = await setup();
    await act(() => result.current.savePreferences(result.current.prefs, 'dev-1'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('delete: ensures a session and sends its token', async () => {
    h.ensure.mockResolvedValue({ access_token: 'anon-jwt' });
    const { result } = await setup();
    await act(async () => {
      await h.listeners.registration({ value: 'dev-1' });
    });
    fetchMock.mockClear();
    await act(() => result.current.unregister());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('action=delete');
    expect(authOf(fetchMock.mock.calls[0])).toBe('Bearer anon-jwt');
  });

  it('delete: makes no request when no session can be made', async () => {
    h.ensure.mockResolvedValue({ access_token: 'anon-jwt' });
    const { result } = await setup();
    await act(async () => {
      await h.listeners.registration({ value: 'dev-1' });
    });
    fetchMock.mockClear();
    h.ensure.mockResolvedValue(null);
    await act(() => result.current.unregister());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
