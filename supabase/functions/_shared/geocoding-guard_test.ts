import { assertEquals } from 'jsr:@std/assert@1';
import { checkGeocodingQuery, isCacheableResult } from './geocoding-guard.ts';

Deno.test('BH-148: accepts place names and postcodes, normalised', () => {
  assertEquals(checkGeocodingQuery('  Edinburgh  '), { ok: true, normalized: 'edinburgh' });
  assertEquals(checkGeocodingQuery("St. Mary's, Isles of Scilly"), {
    ok: true,
    normalized: "st. mary's, isles of scilly",
  });
  assertEquals(checkGeocodingQuery('EH1   1YZ'), { ok: true, normalized: 'eh1 1yz' });
  assertEquals(checkGeocodingQuery('Ynys Môn').ok, true);
});

Deno.test('BH-148: refuses missing, too long or odd queries', () => {
  assertEquals(checkGeocodingQuery(undefined), { ok: false, code: 'query_required' });
  assertEquals(checkGeocodingQuery(' a '), { ok: false, code: 'query_required' });
  assertEquals(checkGeocodingQuery('x'.repeat(101)), { ok: false, code: 'query_too_long' });
  assertEquals(checkGeocodingQuery('<script>'), { ok: false, code: 'query_invalid' });
  assertEquals(checkGeocodingQuery('a;drop table'), { ok: false, code: 'query_invalid' });
});

Deno.test('BH-148: only real results are cached', () => {
  assertEquals(isCacheableResult([]), false);
  assertEquals(isCacheableResult(null), false);
  assertEquals(isCacheableResult([{ lat: 'x', lon: '1' }]), false);
  assertEquals(isCacheableResult([{ lat: '55.95', lon: '-3.19' }]), true);
});
