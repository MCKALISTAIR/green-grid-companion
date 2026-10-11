import { ATTRIBUTION, DERIVED_DATA_NOTE } from '@/lib/attribution';
import { cn } from '@/lib/utils';

const linkClass = 'underline hover:text-foreground transition-colors';

function ExternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(linkClass, className)}>
      {children}
    </a>
  );
}

/** Full credits block (Settings footer, Help). */
export function DataAttribution({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <p>
        Carbon data from{' '}
        <ExternalLink href={ATTRIBUTION.neso.url}>{ATTRIBUTION.neso.name} {ATTRIBUTION.neso.product}</ExternalLink>
        , licensed under{' '}
        <ExternalLink href={ATTRIBUTION.ccBy4.url}>{ATTRIBUTION.ccBy4.label}</ExternalLink>.
      </p>
      <p>{DERIVED_DATA_NOTE}</p>
      <p>
        <ExternalLink href={ATTRIBUTION.openMeteo.url}>{ATTRIBUTION.openMeteo.label}</ExternalLink> (
        <ExternalLink href={ATTRIBUTION.openMeteo.licenceUrl}>{ATTRIBUTION.ccBy4.label}</ExternalLink>).
      </p>
    </div>
  );
}

/** Compact one-liner for popovers next to live data. */
export function CompactDataAttribution({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      Data:{' '}
      <ExternalLink href={ATTRIBUTION.neso.url}>{ATTRIBUTION.neso.name}</ExternalLink> (
      <ExternalLink href={ATTRIBUTION.ccBy4.url}>{ATTRIBUTION.ccBy4.label}</ExternalLink>).{' '}
      <ExternalLink href={ATTRIBUTION.openMeteo.url}>{ATTRIBUTION.openMeteo.label}</ExternalLink>.
    </p>
  );
}
