import { useSceneDirector } from '@/hooks/useSceneDirector';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, CloudRain, Snowflake, CloudLightning } from 'lucide-react';
import { TimeOfDay } from '@/hooks/useTimeOfDay';

export function DirectorPanel() {
  const {
    unlocked,
    active,
    setActive,
    overrides,
    setExactOverride,
    updateOverride,
    clearOverrides,
  } = useSceneDirector();

  if (!unlocked) return null;

  if (!active) {
    return (
      <div className="fixed bottom-24 right-4 z-50">
        <Button
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-md border-amber-500/50 text-amber-500 shadow-lg"
          onClick={() => setActive(true)}
        >
          🎬 Director Mode
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-24 right-4 z-50 w-80 p-4 bg-background/90 backdrop-blur-lg border-amber-500/30 shadow-2xl max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-amber-500 flex items-center gap-2">🎬 Director Controls</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActive(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Visuals */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            Environment
          </Label>

          <div className="space-y-2">
            <Label>Time of Day</Label>
            <Select
              value={overrides.timeOfDay || 'system'}
              onValueChange={(val) =>
                setExactOverride('timeOfDay', val === 'system' ? undefined : (val as TimeOfDay))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="System Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System Default</SelectItem>
                <SelectItem value="dawn">Dawn</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="midday">Midday</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="sunset">Sunset</SelectItem>
                <SelectItem value="dusk">Dusk</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scene Type</Label>
            <Select
              value={overrides.sceneType || 'auto'}
              onValueChange={(val) =>
                setExactOverride(
                  'sceneType',
                  val === 'auto' ? undefined : (val as 'countryside' | 'city' | 'coastal'),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="countryside">🌿 Countryside</SelectItem>
                <SelectItem value="city">🏙️ City</SelectItem>
                <SelectItem value="coastal">🌊 Coastal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Intensity</Label>
              <span className="text-xs text-muted-foreground">
                {overrides.intensity ?? 'Live'}g
              </span>
            </div>
            <Slider
              min={0}
              max={500}
              step={10}
              value={[overrides.intensity ?? 150]}
              onValueChange={(vals) => setExactOverride('intensity', vals[0])}
            />
          </div>
        </div>

        {/* Weather */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Weather</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="rain"
                checked={!!overrides.weather?.isRaining}
                onCheckedChange={(c) => updateOverride('weather', { isRaining: c })}
              />
              <Label htmlFor="rain" className="flex items-center gap-1">
                <CloudRain className="w-3 h-3" /> Rain
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="snow"
                checked={!!overrides.weather?.isSnowing}
                onCheckedChange={(c) => updateOverride('weather', { isSnowing: c })}
              />
              <Label htmlFor="snow" className="flex items-center gap-1">
                <Snowflake className="w-3 h-3" /> Snow
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="storm"
                checked={!!overrides.weather?.isThunderstorm}
                onCheckedChange={(c) => updateOverride('weather', { isThunderstorm: c })}
              />
              <Label htmlFor="storm" className="flex items-center gap-1">
                <CloudLightning className="w-3 h-3" /> Storm
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="fog"
                checked={!!overrides.weather?.isFoggy}
                onCheckedChange={(c) => updateOverride('weather', { isFoggy: c })}
              />
              <Label htmlFor="fog" className="flex items-center gap-1">
                🌫️ Fog
              </Label>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="destructive" size="sm" className="w-full" onClick={clearOverrides}>
            Reset All Overrides
          </Button>
        </div>
      </div>
    </Card>
  );
}
