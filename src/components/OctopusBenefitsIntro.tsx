import { Leaf, Moon, Trophy, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OctopusReferralLine } from '@/components/OctopusReferralLine';
import { OCTOPUS_ENTRY_COPY as COPY } from '@/lib/voice/octopusLinkCopy';

const OctopusLogo = ({ className }: { className?: string }) => (
  <img src="/octopus_logo.png" alt="" className={`${className} object-contain`} />
);

const ICONS = [Leaf, Trophy, Moon];

interface OctopusBenefitsIntroProps {
  onContinue: () => void;
}

/** Entry card (brief 3.1): what linking gets you, then one button that opens the linking sheet. */
export function OctopusBenefitsIntro({ onContinue }: OctopusBenefitsIntroProps) {
  return (
    <Card className="p-5 border-primary/20 bg-primary/5 space-y-5" data-testid="octopus-entry-card">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <OctopusLogo className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold text-foreground tracking-tight">
            {COPY.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{COPY.line}</p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {COPY.benefits.map(({ label, detail }, i) => {
          const Icon = ICONS[i];
          return (
            <li
              key={label}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5"
            >
              <div className="p-1.5 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <Button className="w-full h-12 font-semibold text-base" onClick={onContinue}>
          <Zap className="w-4 h-4 mr-2" />
          {COPY.primary}
        </Button>
        <p className="text-xs text-center text-muted-foreground leading-relaxed">{COPY.under}</p>
        <OctopusReferralLine className="text-xs text-center text-muted-foreground" />
      </div>
    </Card>
  );
}
