import { assertEquals } from 'jsr:@std/assert@1';
import { mpansOwnedByOthers, rateLimitUnavailable } from './meter-ownership.ts';

Deno.test('no conflict when meters are unowned or ours', () => {
  assertEquals(
    mpansOwnedByOthers(
      [
        { mpan: '1', user_id: 'me' },
        { mpan: '2', user_id: null },
      ],
      'me',
    ),
    [],
  );
});

Deno.test('reports meters owned by another user once', () => {
  assertEquals(
    mpansOwnedByOthers(
      [
        { mpan: '1', user_id: 'other' },
        { mpan: '1', user_id: 'other' },
        { mpan: '2', user_id: 'me' },
      ],
      'me',
    ),
    ['1'],
  );
});

Deno.test('rate limiter outage fails closed', () => {
  assertEquals(rateLimitUnavailable().allowed, false);
});
