import {
  ATTRIBUTION,
  DERIVED_DATA_NOTE,
  elexonAttributionStatement,
  onsPostcodeStatements,
} from '@/lib/attribution';
import { cn } from '@/lib/utils';

const linkClass = 'underline hover:text-foreground transition-colors';

function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
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
        <ExternalLink href={ATTRIBUTION.neso.url}>
          {ATTRIBUTION.neso.name} {ATTRIBUTION.neso.product}
        </ExternalLink>
        , licensed under{' '}
        <ExternalLink href={ATTRIBUTION.ccBy4.url}>{ATTRIBUTION.ccBy4.label}</ExternalLink>.
      </p>
      <GridMixAttributionText />
      <p>{DERIVED_DATA_NOTE}</p>
      <p>
        <ExternalLink href={ATTRIBUTION.openMeteo.url}>{ATTRIBUTION.openMeteo.label}</ExternalLink>{' '}
        (
        <ExternalLink href={ATTRIBUTION.openMeteo.licenceUrl}>
          {ATTRIBUTION.ccBy4.label}
        </ExternalLink>
        ).
      </p>
      <p>
        Place search:{' '}
        <ExternalLink href={ATTRIBUTION.osm.url}>{ATTRIBUTION.osm.label}</ExternalLink>, data
        available under the{' '}
        <ExternalLink href={ATTRIBUTION.osm.licenceUrl}>
          {ATTRIBUTION.osm.licenceLabel}
        </ExternalLink>
        .
      </p>
      <p>
        Postcode lookups by{' '}
        <ExternalLink href={ATTRIBUTION.postcodesIo.url}>
          {ATTRIBUTION.postcodesIo.name}
        </ExternalLink>
        .{' '}
        {onsPostcodeStatements()
          .map((s) => `${s}.`)
          .join(' ')}
      </p>
    </div>
  );
}

/** Compact one-liner for popovers next to live data. */
export function CompactDataAttribution({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      Data: <ExternalLink href={ATTRIBUTION.neso.url}>{ATTRIBUTION.neso.name}</ExternalLink> (
      <ExternalLink href={ATTRIBUTION.ccBy4.url}>{ATTRIBUTION.ccBy4.label}</ExternalLink>).{' '}
      <ExternalLink href={ATTRIBUTION.openMeteo.url}>{ATTRIBUTION.openMeteo.label}</ExternalLink>.
    </p>
  );
}

/**
 * Credit for the live generation mix in GW (grid-demand): Elexon BMRS metered
 * generation plus NESO's estimate of small-scale solar and wind.
 */
function GridMixAttributionText() {
  return (
    <p>
      Live generation mix: {elexonAttributionStatement()} (
      <ExternalLink href={ATTRIBUTION.elexon.licenceUrl}>
        {ATTRIBUTION.elexon.licenceLabel}
      </ExternalLink>
      ). Small-scale solar and wind are NESO estimates. {ATTRIBUTION.nesoDataPortal.statement} (
      <ExternalLink href={ATTRIBUTION.nesoDataPortal.licenceUrl}>
        {ATTRIBUTION.nesoDataPortal.licenceLabel}
      </ExternalLink>
      ).
    </p>
  );
}

/** Credit line shown under the live generation mix (Demand view). */
export function GridMixAttribution({ className }: { className?: string }) {
  return (
    <div className={cn('text-xs text-muted-foreground', className)}>
      <GridMixAttributionText />
    </div>
  );
}
