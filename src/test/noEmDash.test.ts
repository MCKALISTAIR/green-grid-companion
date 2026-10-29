import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import {
  findEmDashes,
  findEmDashesInSource,
  findEmDashesInHtml,
} from '../../scripts/check-no-em-dash.mjs';

type Hit = { file?: string; line: number; text: string };

describe('no em dashes in user-facing copy (Design copy pass, check 2)', () => {
  it('finds none in src/, index.html, manifest.json or edge function entry points', () => {
    const hits: Hit[] = findEmDashes(resolve(__dirname, '../..'));
    expect(hits.map((h) => `${h.file}:${h.line} ${h.text}`)).toEqual([]);
  });

  it('flags string, template and JSX text, but not comments', () => {
    const src = [
      '// a comment — fine',
      '/* block — fine */',
      "const a = 'quoted — bad';",
      'const b = `template — bad`;',
      'const c = <p>{/* jsx comment — fine */}JSX text — bad</p>;',
    ].join('\n');
    const hits: Hit[] = findEmDashesInSource('x.tsx', src);
    expect(hits.map((h) => h.line)).toEqual([3, 4, 5]);
  });

  it('ignores HTML comments', () => {
    const hits: Hit[] = findEmDashesInHtml('<!-- note — fine -->\n<meta content="bad — here">');
    expect(hits.map((h) => h.line)).toEqual([2]);
  });
});
