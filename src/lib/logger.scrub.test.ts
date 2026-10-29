import { afterEach, describe, expect, it, vi } from 'vitest';

const addBreadcrumb = vi.fn();
vi.mock('@sentry/react', () => ({
  addBreadcrumb: (c: unknown) => addBreadcrumb(c),
  captureException: vi.fn(),
  setUser: vi.fn(),
}));
vi.mock('./logger.config', () => ({
  getLoggerConfig: () => ({
    enableConsole: true,
    enableBreadcrumbs: true,
    enableSentry: false,
    colorize: false,
    minLevel: 'debug',
  }),
  shouldLog: () => true,
  getLogColor: () => '',
}));

describe('logger (BH-146)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never passes sign-in tokens to breadcrumbs or the console', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { logger } = await import('./logger');
    logger.info('Deep link received gridsense://auth/callback#access_token=SECRET1', {
      url: 'gridsense://auth/callback?refresh_token=SECRET2',
      refresh_token: 'SECRET3',
    });
    const seen = JSON.stringify([addBreadcrumb.mock.calls, info.mock.calls]);
    expect(seen).not.toMatch(/SECRET[123]/);
    expect(addBreadcrumb).toHaveBeenCalled();
  });
});
