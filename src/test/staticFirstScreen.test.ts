import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script>/)?.[1] ?? '';

describe('static first screen', () => {
  it('contains useful product content in the source, before JavaScript runs', () => {
    expect(root).toContain('<h1>Know when your electricity is cleanest.</h1>');
    expect(root).toContain(
      'Track GB carbon intensity and find the cleanest times to use electricity.',
    );
    expect(root).toContain('href="/"');
    expect(root).toContain("See today's intensity");
    expect(root).toContain('How it works');
    expect(root).toContain("Great Britain's electricity, at a glance");
    expect(root).toContain('href="/privacy"');
    expect(root).toContain('src="/og-image.png"');
  });

  it('has no loading placeholder, status role or splash-only artwork', () => {
    expect(root).not.toMatch(/role="status"|aria-label="Loading|Loading|gs-dot|gs-splash/);
    expect(html).not.toContain('Z Z Z');
    expect(root).not.toContain('>0<');
  });
});
