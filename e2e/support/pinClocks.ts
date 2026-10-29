import type { Page } from '@playwright/test';

/**
 * BH-113: pin the page clock and Node's clock to the same instant, in the only
 * order that works.
 *
 * The mocks (scripts/layout/mock-api.mjs) date readings from Node's Date.now,
 * so specs pin it to match the page. Playwright reads Node's clock while it
 * installs the page clock, and if Node's Date.now is already pinned, any instant
 * earlier than the real wall clock is dropped and the page runs at wall time
 * (future instants still work). That made dawn and morning cells render as
 * "now". So the page clock always goes first.
 *
 * Call restoreNodeClock() in afterEach.
 */
const realNow = Date.now.bind(Date);

export async function pinClocks(page: Page, at: string | Date) {
  const time = new Date(at);
  await page.clock.install({ time });
  const offset = time.getTime() - realNow();
  Date.now = () => realNow() + offset;
}

export function restoreNodeClock() {
  Date.now = realNow;
}
