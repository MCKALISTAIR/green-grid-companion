import { render } from '@testing-library/react';
import { LocationManager } from './LocationManager';
import { useSavedLocations } from '@/hooks/useSavedLocations';

vi.mock('@/hooks/useSavedLocations');
vi.mock('@/hooks/useIsSheetLayout', () => ({
  useIsSheetLayout: () => true,
}));
vi.mock('@/components/ui/responsive-dialog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/responsive-dialog')>()),
  ResponsiveDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ResponsiveDialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ResponsiveDialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className: string;
  }) => (
    <div data-testid="picker-content" className={className}>
      {children}
    </div>
  ),
  ResponsiveDialogDescription: () => null,
  ResponsiveDialogInput: () => null,
  ResponsiveDialogFooter: () => null,
  ResponsiveDialogHeader: () => null,
  ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('non-hero location picker surfaces', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    vi.mocked(useSavedLocations).mockReturnValue({
      savedLocations: [],
      recentLocations: [],
      saveLocation: vi.fn(),
      removeLocation: vi.fn(),
      addRecentLocation: vi.fn(),
      isLocationSaved: vi.fn(),
      getSavedLocationByPostcode: vi.fn(),
    } as unknown as ReturnType<typeof useSavedLocations>);
  });

  it('uses an opaque default trigger and no blur on responsive content', () => {
    const { getByRole, getAllByTestId } = render(<LocationManager value="" onChange={vi.fn()} />);
    const trigger = getByRole('combobox', { name: 'Select location' });
    expect(trigger).toHaveClass('bg-card', 'border-border', 'shadow-sm');
    expect(trigger.className).not.toContain('backdrop-blur');
    const content = getAllByTestId('picker-content')[0];
    expect(content).toHaveClass('bg-card', 'border-border');
    expect(content.className).not.toContain('backdrop-blur');
  });
});
