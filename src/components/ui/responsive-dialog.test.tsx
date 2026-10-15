import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const hapticSelectionChanged = vi.fn();
vi.mock('@/lib/haptics', () => ({ hapticSelectionChanged: () => hapticSelectionChanged() }));

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
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
});
