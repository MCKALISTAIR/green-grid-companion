import { assertEquals } from 'jsr:@std/assert@1';
import { hysteresisBuffer, nextHighState, nextLowState } from './alert-state.ts';

Deno.test('buffer is at least 10 g and 10% of larger thresholds', () => {
  assertEquals([hysteresisBuffer(50), hysteresisBuffer(100), hysteresisBuffer(300)], [10, 10, 30]);
});

Deno.test('low alert: enters at the threshold, leaves only past the buffer', () => {
  assertEquals(nextLowState(100, 100, 'above'), 'below');
  assertEquals(nextLowState(105, 100, 'below'), 'below'); // hovering: no flip
  assertEquals(nextLowState(110, 100, 'below'), 'below');
  assertEquals(nextLowState(111, 100, 'below'), 'above');
  assertEquals(nextLowState(105, 100, 'above'), 'above');
  assertEquals(nextLowState(105, 100, null), 'above');
});

Deno.test('high alert: enters at the threshold, leaves only past the buffer', () => {
  assertEquals(nextHighState(300, 300, 'below'), 'above');
  assertEquals(nextHighState(285, 300, 'above'), 'above');
  assertEquals(nextHighState(270, 300, 'above'), 'above');
  assertEquals(nextHighState(269, 300, 'above'), 'below');
  assertEquals(nextHighState(299, 300, null), 'below');
});

Deno.test('oscillating readings produce one alert, not one per run', () => {
  let state: string | null = 'above';
  let flips = 0;
  for (const v of [99, 102, 98, 104, 97, 103]) {
    const next = nextLowState(v, 100, state);
    if (next !== state) flips++;
    state = next;
  }
  assertEquals(flips, 1);
});
