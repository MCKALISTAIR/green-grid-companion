import { useEffect, useState } from 'react';
import { IntensityScene } from '@/components/IntensityScene';

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
  { label: 'Very clean', intensity: 30, index: 'very low' },
  { label: 'Moderate', intensity: 180, index: 'moderate' },
  { label: 'Very dirty', intensity: 380, index: 'very high' },
];

export default function SceneTest() {
  const [scaleToFit, setScaleToFit] = useState(true);
  const [selectedCase, setSelectedCase] = useState<SceneCase>(SCENE_CASES[0]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Scene Visual Test — GridSense Dev';
    return () => { document.title = prev; };
  }, []);

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

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scaleToFit}
              onChange={(e) => setScaleToFit(e.target.checked)}
            />
            Scale previews to fit page
          </label>

          <div className="flex gap-2">
            {SCENE_CASES.map((c) => (
              <button
                key={c.label}
                onClick={() => setSelectedCase(c)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  selectedCase.label === c.label
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-accent'
                }`}
              >
                {c.label}
              </button>
            ))}
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
                    intensity={selectedCase.intensity}
                    index={selectedCase.index}
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
