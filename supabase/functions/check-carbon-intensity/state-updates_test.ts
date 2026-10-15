import { assertEquals } from 'jsr:@std/assert@1';
import { selectSavableStateUpdates } from './state-updates.ts';

Deno.test('saves a state change only when its push was delivered', () => {
  const out = selectSavableStateUpdates(
    [
      { id: 'a', low_state: 'below', notifyKey: 'a:low' },
      { id: 'b', low_state: 'below', notifyKey: 'b:low' },
    ],
    new Set(['a:low']),
  );
  assertEquals([...out.entries()], [['a', { last_intensity_state: 'below' }]]);
});

Deno.test('changes without a notification are always saved', () => {
  const out = selectSavableStateUpdates([{ id: 'a', high_state: 'below' }], new Set());
  assertEquals(out.get('a'), { last_high_intensity_state: 'below' });
});

Deno.test('low and high are independent for the same subscription', () => {
  const out = selectSavableStateUpdates(
    [
      { id: 'a', low_state: 'above', notifyKey: 'a:low' },
      { id: 'a', high_state: 'above', notifyKey: 'a:high' },
    ],
    new Set(['a:high']),
  );
  assertEquals(out.get('a'), { last_high_intensity_state: 'above' });
});
