import { useTheme } from '@/components/ThemeProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  // Use our ThemeProvider (not next-themes) so toasts follow OS-forced appearance
  // when preference is "system", and don't fight an explicit light/dark choice.
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      // On phones, anchor toasts above the bottom dock instead of the top:
      // top-anchored toasts covered the landscape picker and other controls
      // near the top of Settings (M5).
      position={isMobile ? 'bottom-center' : 'top-center'}
      offset={`calc(max(env(safe-area-inset-top), 59px) + 16px)`}
      mobileOffset={{
        bottom: 'var(--bottom-content-inset)',
        left: '12px',
        right: '12px',
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground',
          cancelButton: 'group-[.toaster]:bg-muted group-[.toaster]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { Toaster, toast };
