import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GARDEN_STAGE_UP_COPY, useGardenStageUpNotice } from './useGardenStageUpNotice';

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
    expect(result.current.message).toContain('1 of 14 days low carbon');

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);

    rerender({ stage: 1 as const, days: 2 });
    expect(result.current.visible).toBe(false);

    rerender({ stage: 2 as const, days: 3 });
    expect(result.current.visible).toBe(true);
    expect(result.current.message).toContain(GARDEN_STAGE_UP_COPY[2]);
  });

  it('no longer auto-dismisses from mount (the pill owns the in-view timer)', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGardenStageUpNotice(1, 1));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.visible).toBe(true);
    expect(localStorage.getItem('scene-garden-last-seen-stage-v1')).toBeNull();
  });

  it('stays hidden and unacknowledged when disabled (city scene)', () => {
    const { result } = renderHook(() => useGardenStageUpNotice(3, 12, false));
    expect(result.current.visible).toBe(false);
    expect(localStorage.getItem('scene-garden-last-seen-stage-v1')).toBeNull();
  });
});
