import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const png = readFileSync(resolve(__dirname, '../../public/apple-touch-icon.png'));

describe('mobile accessibility and home-screen icon', () => {
  it('allows browser pinch zoom', () => {
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toContain('maximum-scale');
    expect(viewport).not.toContain('minimum-scale');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/);
  });

  it('has a real 180 by 180 PNG for apple-touch-icon', () => {
    // PNG stores IHDR width and height as big-endian UInt32 at offsets 16 and 20.
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
    expect(html).toContain(
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
    );
    expect(html).not.toContain('rel="apple-touch-icon" href="/icon-192.png"');
  });
});
