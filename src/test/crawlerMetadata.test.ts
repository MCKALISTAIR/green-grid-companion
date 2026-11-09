import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`${name}="([^"]+)"`))?.[1];
}

describe('crawler metadata', () => {
  it('leaves page addresses to each route and uses the public origin for share images', () => {
    const canonical = html.match(/<link\s+rel="canonical"[^>]*>/)?.[0];
    const ogUrl = html.match(/<meta\s+property="og:url"[^>]*>/)?.[0];
    const ogImage = html.match(/<meta\s+property="og:image"[^>]*>/)?.[0];
    const twitterImage = html.match(/<meta\s+name="twitter:image"[^>]*>/)?.[0];

    // Each route sets its own canonical/og:url, so the static head must not claim the homepage.
    expect(canonical).toBeUndefined();
    expect(ogUrl).toBeUndefined();
    expect(attribute(ogImage ?? '', 'content')).toBe('https://getgridsense.com/og-image.png');
    expect(attribute(twitterImage ?? '', 'content')).toBe('https://getgridsense.com/og-image.png');
  });

  it('keeps the existing GB description and Twitter large-image card', () => {
    expect(html).toContain(
      'content="Track GB carbon intensity and find the cleanest times to use electricity."',
    );
    expect(html).toMatch(/<meta\s+name="twitter:card"\s+content="summary_large_image"\s*\/>/);
  });
});
