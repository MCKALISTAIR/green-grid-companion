import { OCTOPUS_ENTRY_COPY as COPY, OCTOPUS_REFERRAL_URL } from '@/lib/voice/octopusLinkCopy';

/** "Not with Octopus yet? Join through our referral link." No amount stated (Design, 23 Oct). */
export function OctopusReferralLine({ className }: { className?: string }) {
  return (
    <p className={className}>
      {COPY.referralLead}{' '}
      <a
        href={OCTOPUS_REFERRAL_URL}
        target="_blank"
        rel="noreferrer"
        className="tap-target underline font-medium text-primary hover:text-primary/80"
      >
        {COPY.referralLink}
      </a>
    </p>
  );
}
