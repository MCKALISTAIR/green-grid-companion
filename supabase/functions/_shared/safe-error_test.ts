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

Deno.test('redactIdentifiers masks account numbers, MPANs and keys (BH-150)', async () => {
  const { redactIdentifiers } = await import('./safe-error.ts');
  const out = redactIdentifiers(
    'GET https://api.octopus.energy/v1/accounts/A-1234ABCD/electricity-meter-points/1200012345678/ key sk_live_abcDEF123',
  );
  assertEquals(
    out,
    'GET https://api.octopus.energy/v1/accounts/A-***/electricity-meter-points/1200***/ key sk_live_***',
  );
});

Deno.test('describeError redacts the message', async () => {
  const { describeError } = await import('./safe-error.ts');
  assertEquals(
    describeError(new Error('account A-AB12CD34 not found')).message,
    'account A-*** not found',
  );
});
