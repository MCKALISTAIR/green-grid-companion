import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Native Sentry (Sentry Cocoa via @sentry/capacitor) caches envelopes on disk and
// tracks sessions by default. It must never start before consent; today it never
// starts at all because only @sentry/react is initialised. Fail loudly if that changes.
function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'Pods' || name.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

describe('native Sentry is not started', () => {
  it('no app code imports @sentry/capacitor', () => {
    const files = walk(join(process.cwd(), 'src'), ['.ts', '.tsx']).filter(
      (f) => !f.endsWith('.test.ts'),
    );
    const offenders = files.filter((f) =>
      /from ['"]@sentry\/capacitor['"]|require\(['"]@sentry\/capacitor/.test(
        readFileSync(f, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('no iOS/Android code calls SentrySDK.start / SentryAndroid.init', () => {
    const roots = ['ios', 'android'].map((d) => join(process.cwd(), d)).filter(existsSync);
    const files = roots.flatMap((r) => walk(r, ['.swift', '.m', '.kt', '.java']));
    const offenders = files.filter((f) =>
      /SentrySDK\.start|SentryAndroid\.init/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
