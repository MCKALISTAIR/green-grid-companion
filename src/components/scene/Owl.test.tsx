import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Owl } from './Owl';

const offline = { isOffline: false };
vi.mock('@/hooks/useOffline', () => ({ useOffline: () => offline }));

describe('Owl hoot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const hootAfter5s = () => {
    const { container, unmount } = render(
      <svg>
        <Owl treeX={0} treeY={0} />
      </svg>,
    );
    act(() => vi.advanceTimersByTime(5000));
    const text = container.textContent ?? '';
    unmount();
    return text;
  };

  it('hoots online', () => {
    offline.isOffline = false;
    expect(hootAfter5s()).toContain('Hoot!');
  });

  it('never hoots offline', () => {
    offline.isOffline = true;
    expect(hootAfter5s()).not.toContain('Hoot!');
  });
});
