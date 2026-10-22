import { Leaf, Sun, Trophy, Zap, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingsSectionHeading } from '@/components/settings/SettingsSectionHeading';

const OctopusLogo = ({ className }: { className?: string }) => (
  <img src="/octopus_logo.png" alt="" className={`${className} object-contain`} />
);

interface OctopusBenefitsIntroProps {
  onContinue: () => void;
}

/**
 * Pre-credential benefits sheet so first-time linking explains meter truth
 * before asking for an API key.
 */
export function OctopusBenefitsIntro({ onContinue }: OctopusBenefitsIntroProps) {
  return (
    <div className="space-y-4">
      <SettingsSectionHeading>Energy Integrations</SettingsSectionHeading>
      <Card className="p-5 border-primary/20 bg-primary/5 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <OctopusLogo className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold text-foreground tracking-tight">
              Octopus Energy
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              See when you used power, from your meter.
            </p>
          </div>
        </div>

        <ul className="space-y-2.5">
          {[
            {
              icon: Leaf,
              label: 'True daily emissions from your meter',
              detail: 'Not a household estimate',
            },
            {
              icon: Trophy,
              label: 'Green Score for timing demand',
              detail: '% of your kWh used in low-carbon windows — timing beats thrift alone',
            },
            {
              icon: Sun,
              label: 'Solar & renewables impact',
              detail: 'See when your usage matched clean generation',
            },
          ].map(({ icon: Icon, label, detail }) => (
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
          ))}
        </ul>

        <div className="space-y-2">
          <Button className="w-full font-semibold" size="lg" onClick={onContinue}>
            <Zap className="w-4 h-4 mr-2" />
            Continue to connect
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            You’ll enter your Octopus account number and API key next. Your key is sent once over
            HTTPS and stored encrypted on our servers — never kept on this device.
          </p>
          <p className="text-[11px] text-center text-muted-foreground">
            Not with Octopus yet?{' '}
            <a
              href="https://share.octopus.energy/light-sheep-695"
              target="_blank"
              rel="noreferrer"
              className="tap-target underline font-medium text-primary hover:text-primary/80"
            >
              Join with £50 free credit
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
