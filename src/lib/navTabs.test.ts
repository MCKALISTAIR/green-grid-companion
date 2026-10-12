import { describe, expect, it } from 'vitest';
import { getNavSlideDirection, MAIN_TAB_PATHS } from './navTabs';

describe('getNavSlideDirection', () => {
  it('matches bottom-nav order including history', () => {
    expect([...MAIN_TAB_PATHS]).toEqual(['/', '/planner', '/history', '/map', '/settings']);
  });

  it('slides right when moving toward later tabs', () => {
    expect(getNavSlideDirection('/', '/planner')).toBe('right');
    expect(getNavSlideDirection('/planner', '/history')).toBe('right');
    expect(getNavSlideDirection('/history', '/map')).toBe('right');
    expect(getNavSlideDirection('/map', '/settings')).toBe('right');
  });

  it('slides left when moving toward earlier tabs', () => {
    expect(getNavSlideDirection('/settings', '/map')).toBe('left');
    expect(getNavSlideDirection('/history', '/planner')).toBe('left');
    expect(getNavSlideDirection('/map', '/')).toBe('left');
  });

  it('fades for secondary routes and same-path', () => {
    expect(getNavSlideDirection('/settings', '/help')).toBe('fade');
    expect(getNavSlideDirection('/help', '/glossary')).toBe('fade');
    expect(getNavSlideDirection('/planner', '/planner')).toBe('fade');
  });
});
