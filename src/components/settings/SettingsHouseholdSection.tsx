import { Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { HouseType, OFGEM_TDCV_2025 } from '@/lib/energy-standards';
import { settingsItemVariants } from './settingsMotion';
import { SettingsSectionHeading } from './SettingsSectionHeading';

interface SettingsHouseholdSectionProps {
  houseType: HouseType;
  setHouseType: (value: HouseType) => void;
  customAnnualKwh: number;
  setCustomAnnualKwh: (value: number) => void;
}

export function SettingsHouseholdSection({
  houseType,
  setHouseType,
  customAnnualKwh,
  setCustomAnnualKwh,
}: SettingsHouseholdSectionProps) {
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <SettingsSectionHeading>Household Profile</SettingsSectionHeading>
      <div className="sheet-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-medium">House Type</h3>
            <p className="text-sm text-muted-foreground">Used for benchmarks.</p>
          </div>
        </div>

        <RadioGroup
          value={houseType}
          onValueChange={(val) => setHouseType(val as HouseType)}
          className="flex flex-col gap-2 pt-1"
        >
          {(Object.entries(OFGEM_TDCV_2025) as [HouseType, (typeof OFGEM_TDCV_2025)['LOW']][]).map(
            ([key, value]) => (
              <div
                key={key}
                className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value={key} id={`house-${key}`} className="mt-1" />
                <div className="grid gap-0.5">
                  <Label htmlFor={`house-${key}`} className="font-medium">
                    {value.label}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ~{value.annualKwh.toLocaleString()} kWh/year
                  </span>
                </div>
              </div>
            ),
          )}

          <div className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="CUSTOM" id="house-CUSTOM" className="mt-1" />
            <div className="grid gap-2 w-full pr-2">
              <Label htmlFor="house-CUSTOM" className="font-medium">
                Custom Estimate
              </Label>
              <div className="text-xs text-muted-foreground mb-1">
                Know your yearly usage? Enter it here.
              </div>

              {houseType === 'CUSTOM' && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="relative flex-1 max-w-[140px]">
                    <input
                      type="number"
                      value={customAnnualKwh || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 0) {
                          setCustomAnnualKwh(val);
                        }
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="2900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      kWh
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </RadioGroup>
      </div>
    </motion.div>
  );
}
