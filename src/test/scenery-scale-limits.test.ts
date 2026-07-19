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
            .map(m => parseFloat(m[1]));

        const midTreeScales = [...content.matchAll(/scale:\s*([0-9.]+)/g)]
            .slice(6, 11) // Next 5 are in midTrees definition
            .map(m => parseFloat(m[1]));

        const frontTreeScales = [...content.matchAll(/scale:\s*([0-9.]+)/g)]
            .slice(11, 14) // Next 3 are in frontTrees definition
            .map(m => parseFloat(m[1]));

        console.log('Detected tree scales:', { backTreeScales, midTreeScales, frontTreeScales });

        // 1. Check background tree scale limits (should be small and far away)
        for (const scale of backTreeScales) {
            expect(scale).toBeLessThanOrEqual(0.4);
            expect(scale).toBeGreaterThanOrEqual(0.1);
        }

        // 2. Check midground tree scale limits
        for (const scale of midTreeScales) {
            expect(scale).toBeLessThanOrEqual(0.6);
            expect(scale).toBeGreaterThanOrEqual(0.3);
        }

        // 3. Check foreground tree scale limits (must not be giant compared to cottage/wind turbines)
        for (const scale of frontTreeScales) {
            expect(scale).toBeLessThanOrEqual(0.8);
            expect(scale).toBeGreaterThanOrEqual(0.4);
        }

        // 4. Verify perspective depth scale gradient (background < midground < foreground)
        if (backTreeScales.length && midTreeScales.length && frontTreeScales.length) {
            expect(backTreeScales[0]).toBeLessThan(midTreeScales[0]);
            expect(midTreeScales[0]).toBeLessThan(frontTreeScales[0]);
        }
    });

    test('Wind turbines should be appropriately scaled and taller than local trees', () => {
        const intensityScenePath = path.resolve(__dirname, '../components/IntensityScene.tsx');
        expect(fs.existsSync(intensityScenePath)).toBe(true);

        const content = fs.readFileSync(intensityScenePath, 'utf-8');

        // Isolate the allSlots array block to only parse turbine scales
        const startIndex = content.indexOf('const allSlots =');
        const endIndex = content.indexOf('// How many turbines to show');
        expect(startIndex).toBeGreaterThan(-1);
        expect(endIndex).toBeGreaterThan(-1);
        
        const allSlotsBlock = content.substring(startIndex, endIndex);
        const turbineScales = [...allSlotsBlock.matchAll(/scale:\s*([0-9.]+)/g)]
            .map(m => parseFloat(m[1]));

        console.log('Detected turbine scales:', turbineScales);

        // Expect background turbines to be small, foreground to be large
        expect(turbineScales.length).toBeGreaterThan(0);
        
        // Background turbine scales (first elements in slots definition)
        const bgTurbineScale = turbineScales[0]; // back left 18 slot
        expect(bgTurbineScale).toBeLessThanOrEqual(0.45);

        // Foreground turbine scales (last elements in slots definition)
        const fgTurbineScale = turbineScales[turbineScales.length - 1]; // front left 45 slot
        expect(fgTurbineScale).toBeGreaterThanOrEqual(0.7);
    });
});
