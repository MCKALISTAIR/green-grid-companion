import { assert, assertEquals } from 'jsr:@std/assert@1';
import { safeErrorResponse } from './safe-error.ts';

Deno.test('safeErrorResponse: logs the detail, returns only a code', async () => {
  const logged: unknown[][] = [];
  const res = safeErrorResponse(
    { code: 'geocoding_failed', error: 'Geocoding failed', status: 500, context: 'GEOCODING' },
    new Error('upstream https://internal.example/?key=SECRET timed out'),
    (...a) => logged.push(a),
  );
  assertEquals(res.status, 500);
  const text = await res.text();
  assertEquals(JSON.parse(text), { error: 'Geocoding failed', code: 'geocoding_failed' });
  assert(!text.includes('SECRET') && !text.includes('internal.example'));
  assert(JSON.stringify(logged).includes('timed out'));
});
