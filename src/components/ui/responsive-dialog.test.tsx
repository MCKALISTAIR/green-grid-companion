import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';

const hapticSelectionChanged = vi.fn();
vi.mock('@/lib/haptics', () => ({ hapticSelectionChanged: () => hapticSelectionChanged() }));

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from './responsive-dialog';

function mockWidth(mobile: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: mobile && q.includes('max-width: 767px'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => hapticSelectionChanged.mockClear());

function Subject() {
  return (
    <ResponsiveDialog open detents="tall" onOpenChange={() => {}}>
      <ResponsiveDialogContent>
        <ResponsiveDialogTitle>Mix</ResponsiveDialogTitle>
        <p>body</p>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

describe('ResponsiveDialog', () => {
  it('is a bottom sheet with a grabber and a 44pt close on phones', () => {
    mockWidth(true);
    render(<Subject />);
    expect(screen.getByTestId('responsive-sheet')).toBeTruthy();
    expect(screen.getByTestId('sheet-grabber')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' }).className).toMatch(/h-11 w-11/);
  });

  it('is the centred dialog on desktop', () => {
    mockWidth(false);
    render(<Subject />);
    expect(screen.queryByTestId('responsive-sheet')).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('does not buzz on open', () => {
    mockWidth(true);
    render(<Subject />);
    expect(hapticSelectionChanged).not.toHaveBeenCalled();
  });

  it.each(['content', 'tall'] as const)(
    'moves focus into the %s sheet on open and back to the trigger on close',
    async (detents) => {
      mockWidth(true);
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <ResponsiveDialog open={open} detents={detents} onOpenChange={setOpen}>
            <ResponsiveDialogTrigger asChild>
              <button type="button">Open sheet</button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              <ResponsiveDialogTitle>Sheet</ResponsiveDialogTitle>
              <input aria-label="search" />
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        );
      }
      render(<Controlled />);
      const trigger = screen.getByRole('button', { name: 'Open sheet' });
      trigger.focus();
      fireEvent.click(trigger);
      const sheet = await screen.findByTestId('responsive-sheet');
      await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    },
  );
});
