import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createAlertReadingResolver, isOffGridOutcode } from './alert-reading.ts';

Deno.test('isOffGridOutcode: GY, JE, IM, BT, BFPO', () => {
  for (const k of ['GY1', 'gy9', 'JE2', 'IM1', 'BT1', 'BFPO 1', 'bfpo123'])
    assertEquals(isOffGridOutcode(k), true, k);
  for (const k of ['G1', 'GL1', 'IP1', 'EH1', 'SW1A', 'GB'])
    assertEquals(isOffGridOutcode(k), false, k);
});

Deno.test('resolver skips GY/JE/IM/BT/BFPO without calling NESO', async () => {
  let calls = 0;
  const fetchFn = (() => {
    calls++;
    return Promise.resolve(new Response('{}', { status: 500 }));
  }) as typeof fetch;
  const resolve = createAlertReadingResolver(fetchFn, () => {});
  for (const pc of ['GY1', 'JE2 3AB', 'IM1', 'BT1 1AA', 'BFPO 1'])
    assertEquals(await resolve(pc), null, pc);
  assertEquals(calls, 0);
});

Deno.test('resolver still fetches a GB outward code', async () => {
  let url = '';
  const fetchFn = ((u: string) => {
    url = String(u);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          data: [
            {
              shortname: 'South West England',
              data: [{ intensity: { forecast: 120, actual: null, index: 'moderate' } }],
            },
          ],
        }),
        { status: 200 },
      ),
    );
  }) as typeof fetch;
  const r = await createAlertReadingResolver(fetchFn, () => {})('EX4');
  assertEquals(url.endsWith('/regional/postcode/EX4'), true);
  assertEquals(r?.scope, 'regional');
});
