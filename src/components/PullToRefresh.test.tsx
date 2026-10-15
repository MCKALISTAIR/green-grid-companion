import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';

const impactMedium = vi.fn();
vi.mock('@/hooks/useHaptics', () => ({ useHaptics: () => ({ impactMedium }) }));

import { PullToRefresh, ptrResistance, PTR_THRESHOLD, PTR_MAX } from './PullToRefresh';

const touch = (y: number) => ({ touches: [{ clientY: y }] });

describe('ptrResistance', () => {
  it('needs ~110pt of finger travel to reach the 72pt threshold', () => {
    expect(ptrResistance(100)).toBeLessThan(PTR_THRESHOLD);
    expect(ptrResistance(111)).toBeGreaterThanOrEqual(PTR_THRESHOLD);
  });
  it('is capped and never negative', () => {
    expect(ptrResistance(5000)).toBe(PTR_MAX);
    expect(ptrResistance(-20)).toBe(0);
  });
});

describe('PullToRefresh', () => {
  beforeEach(() => impactMedium.mockClear());

  it('fires one haptic when the line is crossed, not again after crossing back', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <PullToRefresh onRefresh={onRefresh}>
        <p>content</p>
      </PullToRefresh>,
    );
    const root = getByTestId('ptr-root');
    fireEvent.touchStart(root, touch(0));
    fireEvent.touchMove(root, touch(60));
    expect(impactMedium).not.toHaveBeenCalled();
    fireEvent.touchMove(root, touch(140));
    expect(impactMedium).toHaveBeenCalledTimes(1);
    fireEvent.touchMove(root, touch(40));
    fireEvent.touchMove(root, touch(160));
    expect(impactMedium).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.touchEnd(root);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh below the threshold', async () => {
    const onRefresh = vi.fn();
    const { getByTestId } = render(
      <PullToRefresh onRefresh={onRefresh}>
        <p>content</p>
      </PullToRefresh>,
    );
    const root = getByTestId('ptr-root');
    fireEvent.touchStart(root, touch(0));
    fireEvent.touchMove(root, touch(90));
    await act(async () => {
      fireEvent.touchEnd(root);
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(impactMedium).not.toHaveBeenCalled();
  });
});
