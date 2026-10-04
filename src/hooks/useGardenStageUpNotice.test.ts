import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  GARDEN_STAGE_UP_COPY,
  useGardenStageUpNotice,
} from './useGardenStageUpNotice';

describe('useGardenStageUpNotice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('stays quiet when stage is 0', () => {
    const { result } = renderHook(() => useGardenStageUpNotice(0, 0));
    expect(result.current.visible).toBe(false);
    expect(result.current.message).toBeNull();
  });

  it('surfaces copy once when stage rises, then stays quiet after dismiss', () => {
    const { result, rerender } = renderHook(
      ({ stage, days }) => useGardenStageUpNotice(stage, days),
      { initialProps: { stage: 1 as 0 | 1 | 2 | 3, days: 1 } },
    );

    expect(result.current.visible).toBe(true);
    expect(result.current.message).toContain(GARDEN_STAGE_UP_COPY[1]);
    expect(result.current.message).toContain('day 1');

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);

    rerender({ stage: 1 as const, days: 2 });
    expect(result.current.visible).toBe(false);

    rerender({ stage: 2 as const, days: 3 });
    expect(result.current.visible).toBe(true);
    expect(result.current.message).toContain(GARDEN_STAGE_UP_COPY[2]);
  });

  it('auto-dismisses after a few seconds', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGardenStageUpNotice(1, 1));
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(6500);
    });
    expect(result.current.visible).toBe(false);
    expect(localStorage.getItem('scene-garden-last-seen-stage-v1')).toBe('1');
  });
});
