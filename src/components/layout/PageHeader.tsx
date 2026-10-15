import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}

/**
 * Shared secondary-screen header — Plus Jakarta Sans title, quiet subtitle.
 * Art direction: same hand as home decision headlines.
 */
export function PageHeader({ title, description, className, actions }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-snug max-w-prose">
            {description}
          </p>
        )}
      </div>
      {/* Keep actions on the title row at all widths so icon controls (e.g. Hide map)
          don't drop under the subtitle and read as an orphaned close. */}
      {actions && <div className="flex items-center gap-2 shrink-0 pt-0.5">{actions}</div>}
    </div>
  );
}
