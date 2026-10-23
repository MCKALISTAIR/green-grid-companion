import { assertEquals } from 'jsr:@std/assert@1';
import { halfHourKey, halfHourKeyToIso, normaliseHalfHour } from './half-hour.ts';
import { buildFootprintRows, buildIntensityMap } from './footprint-records.ts';

// BH-91: one half-hour, three spellings. 22:30Z = 23:30 BST on 30 Jul 2026.
Deno.test('NESO "Z", DB "+00:00" and Octopus "+01:00" give the same key', () => {
  const neso = halfHourKey('2026-07-30T22:30Z');
  assertEquals(neso, Math.floor(Date.UTC(2026, 6, 30, 22, 30) / 1_800_000));
  assertEquals(halfHourKey('2026-07-30T22:30:00+00:00'), neso);
  assertEquals(halfHourKey('2026-07-30T23:30:00+01:00'), neso);
  assertEquals(halfHourKey('2026-07-30T22:30:00.000Z'), neso);
  assertEquals(halfHourKey(new Date('2026-07-30T22:30:00Z')), neso);
  assertEquals(normaliseHalfHour('2026-07-30T23:30:00+01:00'), '2026-07-30T22:30:00.000Z');
});

Deno.test('the string comparison the old code did never matches', () => {
  // What fd2cc08 did: intensityMap.get(record.interval_start) with NESO keys.
  const nesoKeys = new Set(['2026-07-30T22:30Z', '2026-01-22T10:00Z']);
  for (const s of [
    '2026-07-30T22:30:00+00:00',
    '2026-07-30T23:30:00+01:00',
    '2026-01-22T10:00:00Z',
  ]) {
    assertEquals(nesoKeys.has(s), false);
  }
});

Deno.test('rejects strings with no zone, garbage and empties', () => {
  assertEquals(halfHourKey('2026-10-25T01:30:00'), null);
  assertEquals(halfHourKey('not a date'), null);
  assertEquals(halfHourKey(''), null);
  assertEquals(halfHourKey(null), null);
  assertEquals(halfHourKey(undefined), null);
  assertEquals(halfHourKey(Number.NaN), null);
});

Deno.test('floors mid-slot instants to the half-hour start', () => {
  assertEquals(normaliseHalfHour('2026-07-30T22:59:59Z'), '2026-07-30T22:30:00.000Z');
});

Deno.test('25 Oct 2026: the repeated 01:00-02:00 hour maps to four distinct UTC half-hours', () => {
  const firstPass = ['2026-10-25T01:00:00+01:00', '2026-10-25T01:30:00+01:00']; // BST
  const secondPass = ['2026-10-25T01:00:00Z', '2026-10-25T01:30:00Z']; // GMT (Octopus writes Z)
  const isos = [...firstPass, ...secondPass].map((s) => normaliseHalfHour(s));
  assertEquals(isos, [
    '2026-10-25T00:00:00.000Z',
    '2026-10-25T00:30:00.000Z',
    '2026-10-25T01:00:00.000Z',
    '2026-10-25T01:30:00.000Z',
  ]);
  const keys = [...firstPass, ...secondPass].map((s) => halfHourKey(s)!);
  assertEquals(new Set(keys).size, 4);
  assertEquals(keys[3] - keys[0], 3); // consecutive, no gap or overlap
});

Deno.test('BST/GMT boundaries: last BST and first GMT slot on 25 Oct are adjacent', () => {
  const lastBst = halfHourKey('2026-10-25T01:30:00+01:00')!; // 00:30Z
  const firstGmt = halfHourKey('2026-10-25T01:00:00Z')!; // 01:00Z
  assertEquals(firstGmt - lastBst, 1);
});

Deno.test('BST starts 29 Mar 2026: 00:30 GMT is followed by 02:00 BST', () => {
  const lastGmt = halfHourKey('2026-03-29T00:30:00Z')!;
  const firstBst = halfHourKey('2026-03-29T02:00:00+01:00')!;
  assertEquals(firstBst - lastGmt, 1);
});

Deno.test('footprint rows match across the 25 Oct change with Octopus spellings', () => {
  const data = [];
  for (const from of [
    '2026-10-25T00:00Z',
    '2026-10-25T00:30Z',
    '2026-10-25T01:00Z',
    '2026-10-25T01:30Z',
  ]) {
    data.push({ from, intensity: { forecast: 100 + Number(from.slice(14, 16)), index: 'low' } });
  }
  const { map } = buildIntensityMap({ data }, false);
  const rows = buildFootprintRows(
    [
      {
        interval_start: '2026-10-25T01:00:00+01:00',
        interval_end: '2026-10-25T01:30:00+01:00',
        kwh: 1,
      },
      { interval_start: '2026-10-25T01:30:00+01:00', interval_end: '2026-10-25T01:00:00Z', kwh: 1 },
      { interval_start: '2026-10-25T01:00:00Z', interval_end: '2026-10-25T01:30:00Z', kwh: 1 },
      { interval_start: '2026-10-25T01:30:00Z', interval_end: '2026-10-25T02:00:00Z', kwh: 1 },
    ],
    map,
    '1300000000000',
  );
  assertEquals(
    rows.map((r) => [r.interval_start, r.interval_end, r.intensity_gco2_kwh]),
    [
      ['2026-10-25T00:00:00.000Z', '2026-10-25T00:30:00.000Z', 100],
      ['2026-10-25T00:30:00.000Z', '2026-10-25T01:00:00.000Z', 130],
      ['2026-10-25T01:00:00.000Z', '2026-10-25T01:30:00.000Z', 100],
      ['2026-10-25T01:30:00.000Z', '2026-10-25T02:00:00.000Z', 130],
    ],
  );
});

Deno.test('halfHourKeyToIso round-trips', () => {
  const k = halfHourKey('2026-10-25T01:30:00Z')!;
  assertEquals(halfHourKey(halfHourKeyToIso(k)), k);
});
