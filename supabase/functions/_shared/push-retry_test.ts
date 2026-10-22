import { assertEquals } from 'jsr:@std/assert@1';
import { sendWithRetry, type AttemptResult } from './push-retry.ts';

const noSleep = { sleep: () => Promise.resolve() };

Deno.test('success on first attempt is sent once', async () => {
  let calls = 0;
  const r = await sendWithRetry(() => (calls++, Promise.resolve({ kind: 'ok' })), noSleep);
  assertEquals([calls, r.attempts, r.result.kind], [1, 1, 'ok']);
});

Deno.test('5xx then ok retries and stops after success (no duplicate)', async () => {
  const seq: AttemptResult[] = [{ kind: 'http', status: 503, text: '' }, { kind: 'ok' }];
  let calls = 0;
  const r = await sendWithRetry(() => Promise.resolve(seq[calls++]), noSleep);
  assertEquals([calls, r.result.kind], [2, 'ok']);
});

Deno.test('4xx (dead token / bad request) is not retried', async () => {
  let calls = 0;
  const r = await sendWithRetry(
    () => (calls++, Promise.resolve({ kind: 'http', status: 410, text: 'Unregistered' })),
    noSleep,
  );
  assertEquals([calls, r.result.kind], [1, 'http']);
});

Deno.test('network errors retry with exponential backoff up to maxAttempts', async () => {
  const waits: number[] = [];
  let calls = 0;
  const r = await sendWithRetry(
    () => {
      calls++;
      throw new Error('ECONNRESET');
    },
    { sleep: (ms) => (waits.push(ms), Promise.resolve()), baseDelayMs: 500 },
  );
  assertEquals([calls, r.result.kind, waits], [3, 'network', [500, 1000]]);
});

Deno.test('429 honours Retry-After (capped)', async () => {
  const waits: number[] = [];
  const seq: AttemptResult[] = [
    { kind: 'http', status: 429, text: '', retryAfterSec: 2 },
    { kind: 'ok' },
  ];
  let i = 0;
  await sendWithRetry(() => Promise.resolve(seq[i++]), {
    sleep: (ms) => (waits.push(ms), Promise.resolve()),
  });
  assertEquals(waits, [2000]);
});
