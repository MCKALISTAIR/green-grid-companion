import { cn } from '@/lib/utils';
import { TurbineLogo } from '@/components/TurbineLogo';

interface TurbineSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
} as const;

/**
 * Brand loading indicator — the same TurbineLogo used on splash and onboarding,
 * sized for buttons and page loaders. Spin / reduced-motion live on the logo.
 */
export function TurbineSpinner({ className, size = 'md' }: TurbineSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex shrink-0 text-primary', SIZE_CLASSES[size], className)}
    >
      <TurbineLogo className="w-full h-full" />
    </span>
  );
}
