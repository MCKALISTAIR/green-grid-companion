import { Link } from 'react-router-dom';
import {
  Activity,
  Vibrate,
  MapPin,
  MessageSquare,
  Paintbrush,
  Play,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { CommentaryTone } from '@/lib/tone';
import type { SceneType } from '@/hooks/useSceneType';
import { settingsItemVariants } from './settingsMotion';
import { SettingsSectionHeading } from './SettingsSectionHeading';
import { PrivacyChoiceRow } from '@/components/settings/PrivacyChoiceRow';
import { useHapticsPreference } from '@/hooks/useHaptics';

type TonePreference = CommentaryTone;
type ScenePreference = 'auto' | SceneType;

interface SettingsPreferencesSectionProps {
  tone: TonePreference;
  setTone: (tone: TonePreference) => void;
  showGridFrequency: boolean;
  setShowGridFrequency: (value: boolean) => void;
  scenePreference: ScenePreference;
  setScenePreference: (value: ScenePreference) => void;
  autoDetected: string;
  replayTour: () => void;
}

export function SettingsPreferencesSection({
  tone,
  setTone,
  showGridFrequency,
  setShowGridFrequency,
  scenePreference,
  setScenePreference,
  autoDetected,
  replayTour,
}: SettingsPreferencesSectionProps) {
  const haptics = useHapticsPreference();
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <SettingsSectionHeading>Preferences</SettingsSectionHeading>

      <div className="flex flex-col gap-3">
        <div className="sheet-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="font-medium">Commentary Style</h3>
              <p className="text-sm text-muted-foreground">
                Cheeky adds a short line about the grid on the home screen and in some alerts. Plain
                sticks to the facts. The numbers and advice are the same in both.
              </p>
            </div>
          </div>

          <RadioGroup
            value={tone}
            onValueChange={(val) => setTone(val as TonePreference)}
            className="flex flex-wrap gap-4 pt-1"
            aria-label="Commentary style"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cheeky" id="tone-cheeky" />
              <Label htmlFor="tone-cheeky">Cheeky</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="plain" id="tone-plain" />
              <Label htmlFor="tone-plain">Plain</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="sheet-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Vibrate className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-medium" id="haptics-label">
                  Haptics
                </h3>
                <p className="text-sm text-muted-foreground" id="haptics-desc">
                  Small taps for things that matter. Playful ones skip when Reduce Motion is on.
                </p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={haptics.enabled}
              aria-labelledby="haptics-label"
              aria-describedby="haptics-desc"
              onClick={() => haptics.setEnabled(!haptics.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${haptics.enabled ? 'bg-primary' : 'bg-input'}`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${haptics.enabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        <div className="sheet-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Show Grid Frequency</h3>
                <p className="text-sm text-muted-foreground">Display live 50Hz frequency data</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={showGridFrequency}
              onClick={() => setShowGridFrequency(!showGridFrequency)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${showGridFrequency ? 'bg-primary' : 'bg-input'}`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${showGridFrequency ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        <div className="sheet-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-medium">Scene Theme</h3>
              <p className="text-sm text-muted-foreground">
                Choose your landscape style
                {scenePreference === 'auto' && (
                  <span className="ml-1 text-xs text-primary">(detected: {autoDetected})</span>
                )}
              </p>
            </div>
          </div>

          <RadioGroup
            value={scenePreference}
            onValueChange={(val) => setScenePreference(val as ScenePreference)}
            className="flex flex-wrap gap-4 pt-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="scene-auto" />
              <Label htmlFor="scene-auto" className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Auto
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="countryside" id="scene-countryside" />
              <Label htmlFor="scene-countryside">🌿 Countryside</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="city" id="scene-city" />
              <Label htmlFor="scene-city">🏙️ City</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="coastal" id="scene-coastal" />
              <Label htmlFor="scene-coastal">🌊 Coastal</Label>
            </div>
          </RadioGroup>
        </div>

        <Link to="/locations">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            className="flex items-center justify-between sheet-surface p-4 hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Manage Locations</h3>
                <p className="text-sm text-muted-foreground">
                  Edit saved locations & clear history
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </Link>

        <PrivacyChoiceRow />

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg hover:from-primary/15 hover:to-primary/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Take a Tour</h3>
              <p className="text-sm text-muted-foreground">Discover all the app's features</p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              replayTour();
              toast.success('Starting tour...');
            }}
          >
            Start
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
