import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const publicFile = (path: string) => readFileSync(resolve(__dirname, '../../public', path), 'utf8');

describe('crawler discovery', () => {
  it('lists the public informational pages on the production origin', () => {
    const sitemap = publicFile('sitemap.xml');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    for (const path of ['/', '/help', '/feature-guides', '/privacy', '/terms', '/support']) {
      expect(sitemap).toContain(`<loc>https://getgridsense.com${path}</loc>`);
    }
    expect(sitemap).not.toContain('lovable.app');
    expect(sitemap).not.toContain('/auth');
    expect(sitemap).not.toContain('/settings');
  });

  it('advertises the sitemap from robots.txt', () => {
    expect(publicFile('robots.txt')).toContain('Sitemap: https://getgridsense.com/sitemap.xml');
  });
});
