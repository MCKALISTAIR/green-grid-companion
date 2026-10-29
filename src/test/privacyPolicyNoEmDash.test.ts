import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// C2-15: the Privacy Policy is punctuation-clean, so the shared no-em-dash
// check (PR-C1, scripts/check-no-em-dash.mjs) can drop its allowlist entry.
const FILES = [
  'src/pages/PrivacyPolicy.tsx',
  'src/pages/Help.tsx',
  'src/pages/Glossary.tsx',
  'src/components/AccountBackup.tsx',
  'index.html',
  'public/manifest.json',
];

describe('C2a copy has no em dashes', () => {
  it.each(FILES)('%s', (file) => {
    const text = readFileSync(resolve(process.cwd(), file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(text).not.toContain('\u2014');
  });
});
