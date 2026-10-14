import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const layersDir = path.resolve(__dirname, '../components/scene/layers');

function read(name: string) {
  return fs.readFileSync(path.join(layersDir, name), 'utf-8');
}

/**
 * Stress-test guardrails: props that break theme credibility must stay gated.
 * City/coastal scenes failed deep scrutiny when countryside Lucide icons,
 * hydro dams, biomass, and dual offshore wind stacks leaked in.
 */
describe('Scene theme integrity (stress-test guards)', () => {
  it('keeps Lucide leaf/flame overlays countryside-only in SceneGenerationOverlay', () => {
    const src = read('SceneGenerationOverlay.tsx');
    // Leaves block must be gated
    expect(src).toMatch(/!isCity && !isCoastal && sceneConfig\.cleanliness > 0\.75/);
    // Flames block must be gated
    expect(src).toMatch(/!isCity && !isCoastal && sceneConfig\.cleanliness < 0\.2/);
    // Solar panels countryside-only
    expect(src).toMatch(
      /!isCity && !isCoastal && sceneConfig\.showRenewables && sceneConfig\.showSun/,
    );
    // Factories already gated
    expect(src).toMatch(/showFactories && !isCity && !isCoastal/);
    // Nuclear countryside-only
    expect(src).toMatch(/nuclearPercentage > 5 && !isCity && !isCoastal/);
    // Offshore wind must not also paint on coastal (coastal has its own layer)
    expect(src).toMatch(/windPercentage > 10 && !isCity && !isCoastal/);
    // Tidal waves coastal-only
    expect(src).toMatch(/isCoastal && \(hydroPercentage > 5 \|\| marinePercentage > 0\)/);
  });

  it('keeps hydro dam and biomass smoke countryside-only in SceneAdvancedLayer', () => {
    const src = read('SceneAdvancedLayer.tsx');
    expect(src).toMatch(/!isCity && !isCoastal && isRaining && hydroPercentage > 10/);
    expect(src).toMatch(/!isCity && !isCoastal && biomassPercentage > 5/);
    // EV charger must not use countryside viewBox on city
    expect(src).toMatch(/viewBox=\{isCity \? '0 0 400 150' : '0 30 400 120'\}/);
  });

  it('grounds London Eye on the city front/road layer', () => {
    const src = read('CitySceneLayers.tsx');
    // Eye should appear once near BatteryStorage / front layer, not only in back skyline
    const eyeIdx = src.indexOf('<LondonEye');
    const bessIdx = src.indexOf('<BatteryStorageContainer');
    expect(eyeIdx).toBeGreaterThan(-1);
    expect(bessIdx).toBeGreaterThan(-1);
    expect(eyeIdx).toBeLessThan(bessIdx);
    // Must not still be nested only beside CityLandscapeBack
    const backBlock = src.slice(
      src.indexOf('<CityLandscapeBack'),
      src.indexOf('<CityLandscapeMid'),
    );
    expect(backBlock).not.toContain('<LondonEye');
  });

  it('gives dirty coastal a pollution silhouette (smog + horizon stack)', () => {
    const coastal = read('CoastalSceneLayers.tsx');
    expect(coastal).toContain('CoastalHorizonPollution');
    expect(coastal).toContain('SmogBand');
    expect(coastal).toMatch(/cleanliness > 0\.25/);
    const elements = fs.readFileSync(
      path.resolve(__dirname, '../components/scene/CoastalElements.tsx'),
      'utf-8',
    );
    expect(elements).toContain('export function CoastalHorizonPollution');
  });
});
