import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOverlayQueue } from './overlayQueue';

describe('overlay queue', () => {
  let q: ReturnType<typeof createOverlayQueue>;
  beforeEach(() => {
    q = createOverlayQueue();
  });

  it('shows one overlay at a time', () => {
    const tips = q.request('tips');
    const other = q.request('other', 'nudge');
    expect(tips.isActive()).toBe(true);
    expect(other.isActive()).toBe(false);
    tips.release();
    expect(other.isActive()).toBe(true);
  });

  it('consent goes before tips when both are waiting', () => {
    const blocker = q.request('other', 'first');
    const tips = q.request('tips');
    const consent = q.request('consent');
    blocker.release();
    expect(consent.isActive()).toBe(true);
    expect(tips.isActive()).toBe(false);
    consent.release();
    expect(tips.isActive()).toBe(true);
  });

  it('while consent is undecided nothing else starts, and tips resume after the choice', () => {
    q.setConsentPending(true);
    const tips = q.request('tips');
    const onTips = vi.fn();
    tips.whenActive(onTips);
    expect(tips.isActive()).toBe(false);
    expect(q.getState().active).toBeNull();

    const consent = q.request('consent');
    expect(consent.isActive()).toBe(true);
    expect(onTips).not.toHaveBeenCalled();

    q.setConsentPending(false);
    consent.release();
    expect(tips.isActive()).toBe(true);
    expect(onTips).toHaveBeenCalledTimes(1);
  });

  it('does not preempt an overlay that already has its turn', () => {
    const tips = q.request('tips');
    const consent = q.request('consent');
    expect(tips.isActive()).toBe(true);
    expect(consent.isActive()).toBe(false);
    tips.release();
    expect(consent.isActive()).toBe(true);
  });

  it('dedupes requests by id and release is idempotent', () => {
    const a = q.request('tips', 'tour');
    q.request('tips', 'tour');
    expect(q.getState().waiting).toHaveLength(0);
    a.release();
    a.release();
    expect(q.getState().active).toBeNull();
  });

  it('a waiting overlay can leave the queue without ever showing', () => {
    q.request('tips');
    const other = q.request('other');
    const cb = vi.fn();
    other.whenActive(cb);
    other.release();
    q.release('tips');
    expect(cb).not.toHaveBeenCalled();
    expect(q.getState().active).toBeNull();
  });
});
