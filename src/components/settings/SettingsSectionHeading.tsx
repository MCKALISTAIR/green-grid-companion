import { cn } from '@/lib/utils';

interface SettingsSectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

/** Shared Settings section title — quieter than PageHeader, same hand. */
export function SettingsSectionHeading({ children, className }: SettingsSectionHeadingProps) {
  return (
    <h2 className={cn('font-display text-lg font-semibold tracking-tight text-foreground', className)}>
      {children}
    </h2>
  );
}
