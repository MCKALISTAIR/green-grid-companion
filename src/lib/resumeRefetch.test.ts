import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RESUME_REFETCH_KEYS } from '@/lib/resumeRefetch';

describe('resume refetch keys (BH-66)', () => {
  it('every key matches a queryKey used by useCarbonData', () => {
    const src = readFileSync('src/hooks/useCarbonData.ts', 'utf8');
    for (const [key] of RESUME_REFETCH_KEYS) {
      expect(src).toContain(`queryKey: ['${key}'`);
    }
  });
});
