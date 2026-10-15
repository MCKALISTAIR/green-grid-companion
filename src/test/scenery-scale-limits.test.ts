import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Scenery Element Scale Safeguards', () => {
  test('Landscape pine trees should have appropriate scales matching perspective depth', () => {
    const landscapePath = path.resolve(__dirname, '../components/scene/Landscape.tsx');
    expect(fs.existsSync(landscapePath)).toBe(true);

    const content = fs.readFileSync(landscapePath, 'utf-8');

    // Extract scale values from arrays
    const backTreeScales = [...content.matchAll(/scale:\s*([0-9.]+)/g)]
      .slice(0, 6) // First 6 are in backTrees definition
      .map((m) => parseFloat(m[1]));

    const midTreeScales = [...content.matchAll(/scale:\s*([0-9.]+)/g)]
      .slice(6, 11) // Next 5 are in midTrees definition
      .map((m) => parseFloat(m[1]));

    const frontTreeScales = [...content.matchAll(/scale:\s*([0-9.]+)/g)]
      .slice(11, 14) // Next 3 are in frontTrees definition
      .map((m) => parseFloat(m[1]));

    console.log('Detected tree scales:', { backTreeScales, midTreeScales, frontTreeScales });

    // 1. Check background tree scale limits (should be small and far away)
    for (const scale of backTreeScales) {
      expect(scale).toBeLessThanOrEqual(0.3);
      expect(scale).toBeGreaterThanOrEqual(0.15);
    }

    // 2. Check midground tree scale limits
    for (const scale of midTreeScales) {
      expect(scale).toBeLessThanOrEqual(0.45);
      expect(scale).toBeGreaterThanOrEqual(0.28);
    }

    // 3. Check foreground tree scale limits (must stay below turbine visual weight)
    for (const scale of frontTreeScales) {
      expect(scale).toBeLessThanOrEqual(0.55);
      expect(scale).toBeGreaterThanOrEqual(0.4);
    }

    // 4. Verify perspective depth scale gradient (background < midground < foreground)
    if (backTreeScales.length && midTreeScales.length && frontTreeScales.length) {
      expect(backTreeScales[0]).toBeLessThan(midTreeScales[0]);
      expect(midTreeScales[0]).toBeLessThan(frontTreeScales[0]);
    }
  });

  test('Wind turbines should be appropriately scaled and taller than local trees', () => {
    const turbineLayoutPath = path.resolve(__dirname, '../lib/turbineLayout.ts');
    expect(fs.existsSync(turbineLayoutPath)).toBe(true);

    const content = fs.readFileSync(turbineLayoutPath, 'utf-8');

    // Isolate the slot definitions block to only parse turbine scales
    const startIndex = content.indexOf('const TURBINE_SLOT_DEFS');
    const endIndex = content.indexOf('];', startIndex);
    expect(startIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(-1);

    const allSlotsBlock = content.substring(startIndex, endIndex);
    const turbineScales = [...allSlotsBlock.matchAll(/scale:\s*([0-9.]+)/g)].map((m) =>
      parseFloat(m[1]),
    );

    console.log('Detected turbine scales:', turbineScales);

    // Expect background turbines to be small, foreground to be large
    expect(turbineScales.length).toBeGreaterThan(0);

    // Background turbine scales (first elements in slots definition)
    const bgTurbineScale = turbineScales[0]; // back left 18 slot
    expect(bgTurbineScale).toBeLessThanOrEqual(0.5);
    expect(bgTurbineScale).toBeGreaterThanOrEqual(0.35);

    // Foreground turbine scales (last elements in slots definition)
    const fgTurbineScale = turbineScales[turbineScales.length - 1]; // front left 45 slot
    expect(fgTurbineScale).toBeGreaterThanOrEqual(0.9);
  });

  test('CityLandscape urban trees should have appropriate scales', () => {
    const cityLandscapePath = path.resolve(__dirname, '../components/scene/CityLandscape.tsx');
    expect(fs.existsSync(cityLandscapePath)).toBe(true);

    const content = fs.readFileSync(cityLandscapePath, 'utf-8');

    // Extract scale values from UrbanTree instances
    const urbanTreeScales = [...content.matchAll(/<UrbanTree[^>]*scale=\{\s*([0-9.]+)\s*\}/g)].map(
      (m) => parseFloat(m[1]),
    );

    console.log('Detected urban tree scales:', urbanTreeScales);

    expect(urbanTreeScales.length).toBeGreaterThan(0);
    for (const scale of urbanTreeScales) {
      // Enforce that urban trees are kept in a reasonable, small proportion (<= 1.0)
      expect(scale).toBeLessThanOrEqual(1.0);
      expect(scale).toBeGreaterThanOrEqual(0.4);
    }
  });

  test('IntensityScene should have a bottom-shift wrapper to prevent elements being covered', () => {
    const intensityScenePath = path.resolve(__dirname, '../components/IntensityScene.tsx');
    expect(fs.existsSync(intensityScenePath)).toBe(true);

    const content = fs.readFileSync(intensityScenePath, 'utf-8');

    // Verify the presence of the bottom-shift wrapper container
    expect(content).toContain('bottom-[40px]');
  });

  test('Pine trees in Landscape.tsx should be mathematically grounded on the hill slopes', () => {
    const landscapePath = path.resolve(__dirname, '../components/scene/Landscape.tsx');
    expect(fs.existsSync(landscapePath)).toBe(true);

    const content = fs.readFileSync(landscapePath, 'utf-8');

    // Helper to extract x, y, scale from an array content block
    const parseTrees = (arrayName: string) => {
      const startIdx = content.indexOf(`const ${arrayName} = [`);
      const endIdx = content.indexOf('];', startIdx);
      const block = content.substring(startIdx, endIdx);
      const matches = [
        ...block.matchAll(/\{\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+),\s*scale:\s*([0-9.]+)\s*\}/g),
      ];
      return matches.map((m) => ({
        x: parseFloat(m[1]),
        y: parseFloat(m[2]),
        scale: parseFloat(m[3]),
      }));
    };

    const backTrees = parseTrees('backTrees');
    const midTrees = parseTrees('midTrees');
    const frontTrees = parseTrees('frontTrees');

    // Mathematical check for backTrees:
    // Hill: Q100,50 200,100 (x<=200) and Q300,140 400,80 (x>200) starting from 0,100 and ending at 400,80
    for (const tree of backTrees) {
      let hillY = 0;
      if (tree.x <= 200) {
        const t = tree.x / 200;
        hillY = 100 * Math.pow(1 - t, 2) + 2 * t * (1 - t) * 50 + 100 * Math.pow(t, 2);
      } else {
        const t = (tree.x - 200) / 200;
        hillY = 100 * Math.pow(1 - t, 2) + 2 * t * (1 - t) * 140 + 80 * Math.pow(t, 2);
      }
      const baseOfTrunk = tree.y + 8 * tree.scale;
      // The trunk base must sink into or touch the hill (baseOfTrunk >= hillY)
      expect(
        baseOfTrunk,
        `Back tree at x=${tree.x} is floating (trunk base ${baseOfTrunk} is above hill surface ${hillY})`,
      ).toBeGreaterThanOrEqual(hillY - 0.5);
    }

    // Mathematical check for midTrees:
    // Hill: Q80,140 160,100 (x<=160), Q240,60 320,110 (160<x<=320), Q360,130 400,100 (x>320)
    for (const tree of midTrees) {
      let hillY = 0;
      if (tree.x <= 160) {
        const t = tree.x / 160;
        hillY = 120 * Math.pow(1 - t, 2) + 2 * t * (1 - t) * 140 + 100 * Math.pow(t, 2);
      } else if (tree.x <= 320) {
        const t = (tree.x - 160) / 160;
        hillY = 100 * Math.pow(1 - t, 2) + 2 * t * (1 - t) * 60 + 110 * Math.pow(t, 2);
      } else {
        const t = (tree.x - 320) / 80;
        hillY = 110 * Math.pow(1 - t, 2) + 2 * t * (1 - t) * 130 + 100 * Math.pow(t, 2);
      }
      const baseOfTrunk = tree.y + 8 * tree.scale;
      expect(
        baseOfTrunk,
        `Mid tree at x=${tree.x} is floating (trunk base ${baseOfTrunk} is above hill surface ${hillY})`,
      ).toBeGreaterThanOrEqual(hillY - 0.5);
    }

    // Mathematical check for frontTrees:
    // Hill: Q120,100 200,135 (x<=200) starting at 135, Q280,180 400,120 starting at 200,135
    for (const tree of frontTrees) {
      let hillY = 0;
      if (tree.x <= 200) {
        // For x = 240t - 40t^2, we solve quadratic: 40t^2 - 240t + x = 0
        const t = 3 - Math.sqrt(9 - tree.x / 40);
        hillY = 135 * Math.pow(1 - t, 2) + 2 * t * (1 - t) * 100 + 135 * Math.pow(t, 2);
      } else {
        // For x = 200 + 160t + 40t^2, we solve: 40t^2 + 160t + 200 - x = 0
        const t = -2 + Math.sqrt(4 + (tree.x - 200) / 40);
        hillY = 135 * Math.pow(1 - t, 2) + 2 * t * (1 - t) * 180 + 120 * Math.pow(t, 2);
      }
      const baseOfTrunk = tree.y + 8 * tree.scale;
      expect(
        baseOfTrunk,
        `Front tree at x=${tree.x} is floating (trunk base ${baseOfTrunk} is above hill surface ${hillY})`,
      ).toBeGreaterThanOrEqual(hillY - 0.5);
    }
  });

  test('Scenery components should wrap elements in nested SVGs with preserveAspectRatio="meet" to prevent aspect ratio distortion', () => {
    const landscapePath = path.resolve(__dirname, '../components/scene/Landscape.tsx');
    const cityLandscapePath = path.resolve(__dirname, '../components/scene/CityLandscape.tsx');

    // Check PineTree and Cottage in Landscape.tsx
    const landscapeContent = fs.readFileSync(landscapePath, 'utf-8');

    // PineTree should have <svg and preserveAspectRatio
    const pineTreeBlockStart = landscapeContent.indexOf('export function PineTree');
    const pineTreeBlockEnd = landscapeContent.indexOf(
      '// ⛰️ Rolling Hill Layer',
      pineTreeBlockStart,
    );
    const pineTreeBlock = landscapeContent.substring(pineTreeBlockStart, pineTreeBlockEnd);
    expect(pineTreeBlock).toContain('<svg');
    expect(pineTreeBlock).toContain('preserveAspectRatio=');
    expect(pineTreeBlock).toContain('meet');

    // Cottage should have <svg and preserveAspectRatio
    const cottageBlockStart = landscapeContent.indexOf('function Cottage');
    const cottageBlockEnd = landscapeContent.indexOf(
      'export function LandscapeFront',
      cottageBlockStart,
    );
    const cottageBlock = landscapeContent.substring(cottageBlockStart, cottageBlockEnd);
    expect(cottageBlock).toContain('<svg');
    expect(cottageBlock).toContain('preserveAspectRatio=');
    expect(cottageBlock).toContain('meet');

    // Check UrbanTree in CityLandscape.tsx
    const cityLandscapeContent = fs.readFileSync(cityLandscapePath, 'utf-8');
    const urbanTreeBlockStart = cityLandscapeContent.indexOf('function UrbanTree');
    const urbanTreeBlockEnd = cityLandscapeContent.indexOf('// Street light', urbanTreeBlockStart);
    const urbanTreeBlock = cityLandscapeContent.substring(urbanTreeBlockStart, urbanTreeBlockEnd);
    expect(urbanTreeBlock).toContain('<svg');
    expect(urbanTreeBlock).toContain('preserveAspectRatio=');
    expect(urbanTreeBlock).toContain('meet');
  });
});
