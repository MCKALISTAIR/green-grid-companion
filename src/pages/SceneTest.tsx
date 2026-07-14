import { useEffect, useState } from 'react';
import { IntensityScene } from '@/components/IntensityScene';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';

/**
 * Dev-only visual regression test page for IntensityScene.
 * Renders the scene at multiple viewport sizes side-by-side so visual issues
 * (especially on tall phones like iPhone 17 Pro Max) are easy to spot.
 *
 * Visit at /__scene-test
 */

interface ViewportPreset {
  label: string;
  width: number;
  height: number;
  aspect: string;
}

const VIEWPORTS: ViewportPreset[] = [
  { label: 'iPhone SE', width: 375, height: 667, aspect: '16:9' },
  { label: 'iPhone 14', width: 390, height: 844, aspect: '19.5:9' },
  { label: 'iPhone 17 Pro Max', width: 440, height: 956, aspect: '19.5:9' },
  { label: 'iPad Mini', width: 768, height: 1024, aspect: '4:3' },
  { label: 'iPad Pro 12.9"', width: 1024, height: 1366, aspect: '4:3' },
  { label: 'Desktop', width: 1280, height: 800, aspect: '16:10' },
  { label: 'Ultrawide', width: 1920, height: 1080, aspect: '16:9' },
];

interface SceneCase {
  label: string;
  intensity: number;
  index: string;
}

const SCENE_CASES: SceneCase[] = [
  { label: 'Very clean', intensity: 30,  index: 'very low'  },
  { label: 'Clean',      intensity: 100, index: 'low'       },
  { label: 'Moderate',   intensity: 180, index: 'moderate'  },
  { label: 'Dirty',      intensity: 300, index: 'high'      },
  { label: 'Very dirty', intensity: 380, index: 'very high' },
];

type SceneTypeOpt = 'auto' | 'countryside' | 'city' | 'coastal';
const SCENE_TYPES: SceneTypeOpt[] = ['auto', 'countryside', 'city', 'coastal'];
const PREFERENCE_KEY = 'gridgreen-scene-preference';

const TIMES_OF_DAY: TimeOfDay[] = ['midday', 'sunset', 'night', 'dawn', 'dusk', 'morning', 'afternoon'];
const WEATHER_CONDITIONS: WeatherData['condition'][] = ['clear', 'cloudy', 'rain', 'snow', 'fog', 'thunderstorm'];

export default function SceneTest() {
  const [scaleToFit, setScaleToFit] = useState(true);
  const [selectedCase, setSelectedCase] = useState<SceneCase>(SCENE_CASES[0]);
  const [sceneTypePref, setSceneTypePref] = useState<SceneTypeOpt>(() => {
    try { return (localStorage.getItem(PREFERENCE_KEY) as SceneTypeOpt) || 'auto'; }
    catch { return 'auto'; }
  });
  
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>('midday');
  const [selectedWeather, setSelectedWeather] = useState<WeatherData['condition']>('clear');
  const [windSpeed, setWindSpeed] = useState<number>(5);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Scene Visual Test — GridSense Dev';
    return () => { document.title = prev; };
  }, []);

  // Force a scene type for the duration of the test page; restore on unmount.
  // Write happens synchronously in the click handler (below) so the next render's
  // child remount (via key={sceneTypePref}) sees the new value when its hook
  // reads localStorage on mount.
  useEffect(() => {
    const previous = localStorage.getItem(PREFERENCE_KEY);
    return () => {
      if (previous === null) localStorage.removeItem(PREFERENCE_KEY);
      else localStorage.setItem(PREFERENCE_KEY, previous);
    };
  }, []);

  const handleSceneTypeChange = (t: SceneTypeOpt) => {
    localStorage.setItem(PREFERENCE_KEY, t);
    setSceneTypePref(t);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-2">Scene Visual Test</h1>
        <p className="text-muted-foreground text-sm">
          Renders <code>IntensityScene</code> at common device viewports so vertical
          stretching, ridge alignment, and sky-to-ground ratio can be eyeballed
          side-by-side. Resize the browser to test responsive behavior of the scene
          container itself; the cards below show fixed device sizes.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={scaleToFit}
                onChange={(e) => setScaleToFit(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Scale previews to fit page
            </label>

            <div className="h-4 w-[1px] bg-border hidden sm:block" />

            <div className="flex items-center gap-1.5" role="group" aria-label="Intensity state">
              <span className="text-xs text-muted-foreground font-medium mr-1">Intensity:</span>
              {SCENE_CASES.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setSelectedCase(c)}
                  className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors ${
                    selectedCase.label === c.label
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-border hidden md:block" />

            <div className="flex items-center gap-1.5" role="group" aria-label="Scene type">
              <span className="text-xs text-muted-foreground font-medium mr-1">Theme:</span>
              {SCENE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSceneTypeChange(t)}
                  className={`px-3 py-1 text-xs rounded-md border capitalize font-medium transition-colors ${
                    sceneTypePref === t
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5" role="group" aria-label="Time of day">
              <span className="text-xs text-muted-foreground font-medium mr-1">Time:</span>
              {TIMES_OF_DAY.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTimeOfDay(t)}
                  className={`px-2.5 py-1 text-xs rounded-md border capitalize font-medium transition-colors ${
                    selectedTimeOfDay === t
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-border hidden sm:block" />

            <div className="flex items-center gap-1.5" role="group" aria-label="Weather condition">
              <span className="text-xs text-muted-foreground font-medium mr-1">Weather:</span>
              {WEATHER_CONDITIONS.map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeather(w)}
                  className={`px-2.5 py-1 text-xs rounded-md border capitalize font-medium transition-colors ${
                    selectedWeather === w
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-border hidden md:block" />

            <div className="flex items-center gap-3">
              <label htmlFor="wind-slider" className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                Wind: <span className="font-mono text-foreground font-bold">{windSpeed}m/s</span>
              </label>
              <input
                id="wind-slider"
                type="range"
                min="0"
                max="25"
                step="1"
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-24 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {VIEWPORTS.map((vp) => {
          // Match the scene's actual height cap from IntensityScene
          // (clamp(400px, min(60vh, 75vw), 620px)) so previews reflect real usage
          // instead of stretching to fill the entire device viewport.
          const sceneIntrinsicH = Math.min(620, Math.max(400, Math.min(vp.height * 0.6, vp.width * 0.75)));
          const maxPreviewWidth = 380;
          const scale = scaleToFit ? Math.min(1, maxPreviewWidth / vp.width) : 1;
          const displayW = vp.width * scale;
          const displayH = sceneIntrinsicH * scale;

          return (
            <div
              key={vp.label}
              className="bg-card border rounded-lg p-4 flex flex-col items-center"
            >
              <div className="w-full mb-3 text-sm">
                <div className="font-semibold">{vp.label}</div>
                <div className="text-muted-foreground text-xs">
                  {vp.width}×{vp.height} • {vp.aspect}
                  {scale < 1 && ` • scaled ${Math.round(scale * 100)}%`}
                </div>
              </div>

              <div
                className="relative bg-black overflow-hidden border border-border shadow-lg"
                style={{ width: displayW, height: displayH }}
                aria-label={`${vp.label} viewport preview`}
              >
                <div
                  style={{
                    width: vp.width,
                    height: sceneIntrinsicH,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <IntensityScene
                    key={`${sceneTypePref}-${selectedCase.label}-${selectedTimeOfDay}-${selectedWeather}-${windSpeed}`}
                    intensity={selectedCase.intensity}
                    index={selectedCase.index}
                    sceneTypeOverride={sceneTypePref === 'auto' ? undefined : sceneTypePref}
                    timeOfDayOverride={selectedTimeOfDay}
                    weatherOverride={{
                      condition: selectedWeather,
                      temperature: 15,
                      windSpeed: windSpeed
                    }}
                    style={{ height: '100%' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="mt-8 text-xs text-muted-foreground max-w-2xl">
        <p>
          See <code>docs/SCENE_VISUAL_QA.md</code> for the full manual on-device
          checklist. The aspect-ratio cap on the scene container is defined in{' '}
          <code>IntensityScene.tsx</code> as{' '}
          <code>clamp(400px, min(60vh, 75vw), 620px)</code>.
        </p>
      </footer>
    </div>
  );
}
