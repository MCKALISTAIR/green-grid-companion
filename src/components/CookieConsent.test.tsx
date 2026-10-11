import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CONSENT_STORAGE_KEY, CONSENT_VERSION_KEY, getConsent } from '@/lib/consent';
import { overlayQueue } from '@/lib/overlayQueue';
import { CONSENT_COPY } from '@/lib/voice/consentCopy';

class RO { observe() {} disconnect() {} unobserve() {} }

describe('CookieConsent (privacy choice sheet)', () => {
  beforeEach(() => {
    localStorage.clear();
    overlayQueue.reset();
    vi.useFakeTimers();
    vi.stubGlobal('ResizeObserver', RO);
  });

  async function mount(path = '/settings') {
    vi.resetModules();
    const { CookieConsent } = await import('./CookieConsent');
    const { overlayQueue: q } = await import('@/lib/overlayQueue');
    const utils = render(
      <MemoryRouter initialEntries={[path]}>
        <CookieConsent />
      </MemoryRouter>,
    );
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    return { ...utils, q };
  }

  it('shows a labelled region with title first, equal Decline/Accept and no close button', async () => {
    await mount();
    const region = screen.getByRole('region', { name: CONSENT_COPY.regionLabel });
    expect(region.querySelector('h2')?.textContent).toBe(CONSENT_COPY.title.cheeky);
    expect(region.textContent).toContain(CONSENT_COPY.crashClause);
    expect(region.textContent).toContain(CONSENT_COPY.body);
    const buttons = screen.getAllByRole('button').filter((b) => b.textContent === 'Decline' || b.textContent === 'Accept');
    expect(buttons.map((b) => b.textContent)).toEqual(['Decline', 'Accept']);
    expect(buttons[0].className).toBe(buttons[1].className);
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('uses the Plain title when the tone is plain', async () => {
    localStorage.setItem('gridgreen-fact-prefs', 'plain');
    await mount();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(CONSENT_COPY.title.plain);
  });

  it('Details expands inline with aria-expanded', async () => {
    await mount();
    const details = screen.getByRole('button', { name: /Details/ });
    expect(details.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(details);
    expect(details.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('consent-details').textContent).toMatch(/Session replays/);
  });

  it('blocks tips until a choice, then lets them run', async () => {
    const { q } = await mount();
    const tips = q.request('tips', 'product-tour');
    expect(tips.isActive()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(getConsent()).toBe('declined');
    expect(screen.queryByRole('region', { name: CONSENT_COPY.regionLabel })).toBeNull();
    expect(tips.isActive()).toBe(true);
  });

  it('does not show once a choice exists', async () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(CONSENT_VERSION_KEY, '2');
    await mount();
    expect(screen.queryByTestId('consent-sheet')).toBeNull();
  });

  it('stays off onboarding', async () => {
    await mount('/onboarding');
    expect(screen.queryByTestId('consent-sheet')).toBeNull();
  });
});

describe('privacy copy', () => {
  it('never calls crash reports anonymous', async () => {
    const copy = await import('@/lib/voice/consentCopy');
    const { DIAGNOSTICS_DISCLOSURE } = await import('@/lib/monitoring');
    const all = JSON.stringify([copy.CONSENT_COPY, copy.CONSENT_SETTINGS_COPY, DIAGNOSTICS_DISCLOSURE]);
    expect(all).not.toMatch(/anonym/i);
  });
});
