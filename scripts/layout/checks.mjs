/**
 * Layout assertions shared by the CI guard (scripts/layout-guard.mjs) and the
 * screenshot sweep. They locate elements by stable test ids, roles or visible
 * text (with fallbacks for older markup), never by styling, so they keep
 * applying after GridSense Design's home-screen redesign.
 */

export const GUARD_VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 820, height: 1180 },
  { width: 1440, height: 900 },
];

const BADGE_TEXT = 'Zero-carbon power right now';

async function firstVisibleBox(page, selectors) {
  for (const sel of selectors) {
    const loc = page.locator(sel);
    const n = await loc.count();
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const box = await el.boundingBox();
      if (box && box.width > 0 && box.height > 0) return { ...box, selector: sel };
    }
  }
  return null;
}

export function intersects(a, b, tol = 1) {
  return (
    a.x + a.width - tol > b.x &&
    b.x + b.width - tol > a.x &&
    a.y + a.height - tol > b.y &&
    b.y + b.height - tol > a.y
  );
}

/** Bounding boxes of the hero's location header, zero-carbon badge, big number and band label. */
export async function heroBoxes(page, { region = 'South Scotland', band = 'Very Low' } = {}) {
  const regionRe = region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 30);
  return {
    header: await firstVisibleBox(page, [
      '[data-testid="hero-location"] button',
      '[data-testid="hero-location-desktop"] button',
      `.home-scene button:has-text("${regionRe}")`,
    ]),
    badge: await firstVisibleBox(page, [
      '[data-testid="zero-carbon-badge"]',
      `text="${BADGE_TEXT}"`,
    ]),
    number: await firstVisibleBox(page, [
      '[data-testid="hero-number"]',
      '.home-scene-gauge :text("gCO₂") >> xpath=../..',
    ]),
    band: await firstVisibleBox(page, [
      '[data-testid="hero-band"]',
      `.home-scene-gauge p:has-text("${band}")`,
    ]),
    trophy: await firstVisibleBox(page, ['[data-testid="new-badge-pill"]']),
    meta: await firstVisibleBox(page, ['[data-testid="hero-meta"]']),
    sheetTop: await page.evaluate(() => {
      const el = document.querySelector('.home-feed');
      return el ? el.getBoundingClientRect().top : null;
    }),
  };
}

/**
 * Hero checks for one scenario. Returns a list of failure strings.
 * expectBadge: true = must be visible (zero-carbon, fresh); false = must be hidden (stale).
 */
export async function checkHero(
  page,
  { scenario, expectBadge, expectMeta = false, region, viewport },
) {
  const tag = `[${scenario} ${viewport.width}x${viewport.height}]`;
  const fails = [];
  const b = await heroBoxes(page, { region });
  for (const k of ['header', 'number', 'band']) if (!b[k]) fails.push(`${tag} hero ${k} not found`);
  if (expectBadge === true && !b.badge)
    fails.push(`${tag} zero-carbon badge expected but not visible`);
  if (expectBadge === false && b.badge)
    fails.push(`${tag} zero-carbon badge shown for a stale reading`);
  if (expectMeta && !b.meta)
    fails.push(`${tag} % renewable / updated row (hero-meta) expected but not visible`);
  const named = ['header', 'badge', 'number', 'band', ...(expectMeta ? ['meta'] : [])].filter(
    (k) => b[k],
  );
  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      const [p, q] = [named[i], named[j]];
      if (intersects(b[p], b[q]))
        fails.push(`${tag} ${p} overlaps ${q} (${fmt(b[p])} vs ${fmt(b[q])})`);
    }
  }
  // Nothing in the HUD may slide under the sheet (its scalloped crests rise ~22px above it).
  if (b.sheetTop !== null) {
    for (const k of ['number', 'band', 'badge', 'meta']) {
      if (b[k] && b[k].y + b[k].height > b.sheetTop - 22 + 1)
        fails.push(
          `${tag} hero ${k} is covered by the sheet (bottom ${Math.round(b[k].y + b[k].height)}, sheet top ${Math.round(b.sheetTop)})`,
        );
    }
  }
  if (b.header) {
    if (b.trophy && intersects(b.header, b.trophy))
      fails.push(`${tag} location header overlaps the New badge pill`);
    if (b.header.x < 0 || b.header.x + b.header.width > viewport.width + 1)
      fails.push(`${tag} location header runs off-screen (${fmt(b.header)})`);
  }
  // Design: the New badge pill keeps a 44pt+ tap target.
  if (b.trophy && (b.trophy.width < 44 || b.trophy.height < 44))
    fails.push(`${tag} New badge pill tap target under 44px (${fmt(b.trophy)})`);
  if (b.trophy && b.trophy.x + b.trophy.width > viewport.width + 1)
    fails.push(`${tag} New badge pill runs off-screen (${fmt(b.trophy)})`);
  fails.push(...(await checkHeroText(page, { tag, viewport, expectMeta })));
  // Hero sun never sits behind the trophy chip (bug: 15 Oct, S3).
  const sun = await firstVisibleBox(page, ['[data-scene-sun]']);
  if (sun && b.trophy && intersects(sun, b.trophy))
    fails.push(`${tag} hero sun overlaps the trophy chip (${fmt(sun)} vs ${fmt(b.trophy)})`);
  return fails;
}

/**
 * Design review of #94: hero subline keeps visible word gaps, the (i) sits on the
 * band label's line with the label centred, and at <360px wide the compact meta
 * row stacks into two centred lines.
 */
async function checkHeroText(page, { tag, viewport, expectMeta }) {
  const r = await page.evaluate(() => {
    const out = { gaps: [], text: null, info: null, meta: null };
    const quip = document.querySelector("[data-testid='hero-quip']");
    if (quip) {
      out.text = quip.textContent;
      const node = quip.firstChild;
      if (node && node.nodeType === 3) {
        const t = node.textContent;
        for (let i = 1; i < t.length - 1; i++) {
          if (t[i] !== ' ') continue;
          const range = document.createRange();
          range.setStart(node, i - 1);
          range.setEnd(node, i);
          const before = range.getBoundingClientRect();
          range.setStart(node, i + 1);
          range.setEnd(node, i + 2);
          const after = range.getBoundingClientRect();
          out.gaps.push(after.left - before.right);
        }
      }
    }
    const label = document.querySelector("[data-testid='hero-band-label']");
    const info = document.querySelector("[aria-label='What is carbon intensity?']");
    if (label && info) {
      const l = label.getBoundingClientRect();
      const i = info.getBoundingClientRect();
      out.info = {
        dy: Math.abs(i.top + i.height / 2 - (l.top + l.height / 2)),
        labelCentre: l.left + l.width / 2,
        right: i.left >= l.right - 1,
      };
    }
    const metaEl = document.querySelector("[data-testid='hero-meta']");
    const sheet = document.querySelector('.home-feed');
    out.metaGap =
      metaEl && sheet
        ? sheet.getBoundingClientRect().top - metaEl.getBoundingClientRect().bottom
        : null;
    const meta = document.querySelector("[data-testid='hero-meta']");
    if (meta && meta.children.length >= 2) {
      const [a, b] = [...meta.children].map((c) => c.getBoundingClientRect());
      out.meta = {
        stacked: b.top >= a.bottom - 1,
        aC: a.left + a.width / 2,
        bC: b.left + b.width / 2,
      };
    }
    return out;
  });
  const fails = [];
  if (r.text !== null) {
    if (r.text.trim().includes(' ') && r.gaps.length === 0)
      fails.push(`${tag} hero quip lost its spaces in the DOM ("${r.text}")`);
    const tight = r.gaps.filter((g) => g < 2.5);
    if (tight.length)
      fails.push(
        `${tag} hero quip word gap collapsed (${tight.map((g) => g.toFixed(1)).join(', ')}px) in "${r.text}"`,
      );
  }
  if (r.info) {
    if (r.info.dy > 3)
      fails.push(`${tag} info icon is off the band label's line (${r.info.dy.toFixed(1)}px)`);
    if (!r.info.right) fails.push(`${tag} info icon overlaps the band label`);
    // Phones only: on tablet/desktop the badge shares the band row by design.
    if (viewport.width < 768 && Math.abs(r.info.labelCentre - viewport.width / 2) > 3)
      fails.push(
        `${tag} band label off-centre (${r.info.labelCentre.toFixed(1)} vs ${viewport.width / 2})`,
      );
  }
  if (expectMeta && viewport.width < 360 && viewport.height <= 640 && r.meta) {
    if (!r.meta.stacked) fails.push(`${tag} meta row should wrap to two lines below 360px`);
    for (const c of [r.meta.aC, r.meta.bC])
      if (Math.abs(c - viewport.width / 2) > 3) fails.push(`${tag} meta lines not centred`);
  }
  return fails;
}

/**
 * Scalloped sheet edge: just under the scallop, at both outer edges of the sheet,
 * the pixel must belong to the sheet, not the scene behind it (the old rounded
 * corners left a sliver of dark scene there).
 */
export async function checkSheetEdge(page, { viewport }) {
  const tag = `[sheet-edge ${viewport.width}x${viewport.height}]`;
  // Large-text / tall HUDs can push the sheet below the fold; elementFromPoint
  // only works for on-screen pixels, so scroll the seam into view first.
  await page.evaluate(() => {
    const sheet = document.querySelector('.home-feed');
    if (!sheet) return;
    const top = sheet.getBoundingClientRect().top + window.scrollY;
    const target = Math.max(0, top - 40);
    window.scrollTo(0, target);
  });
  await page.waitForTimeout(100);
  const r = await page.evaluate(() => {
    const sheet = document.querySelector('.home-feed');
    const divider = document.querySelector(
      '[data-testid="scene-wave-divider"], .scene-wave-divider',
    );
    if (!sheet || !divider) return { missing: !sheet ? 'sheet' : 'divider' };
    const s = sheet.getBoundingClientRect();
    const d = divider.getBoundingClientRect();
    const y = s.top + 6;
    if (y < 0 || y > innerHeight) return { offscreen: true };
    const probe = (x) => {
      if (x < 0 || x > innerWidth) return false;
      const el = document.elementFromPoint(x, y);
      return el ? sheet.contains(el) || el === sheet : false;
    };
    return {
      divider: { left: d.left, right: d.right },
      sheet: { left: s.left, right: s.right, top: s.top },
      leftOk: probe(s.left + 1.5),
      rightOk: probe(s.right - 1.5),
      y,
    };
  });
  if (r.missing) return [`${tag} ${r.missing} not found`];
  if (r.offscreen) return [`${tag} sheet seam still off-screen after scroll`];
  const fails = [];
  if (r.divider.left > r.sheet.left + 0.5 || r.divider.right < r.sheet.right - 0.5)
    fails.push(`${tag} scallop doesn't span the sheet's full width`);
  if (!r.leftOk) fails.push(`${tag} gap at the sheet's left edge under the scallop`);
  if (!r.rightOk) fails.push(`${tag} gap at the sheet's right edge under the scallop`);
  return fails;
}

/**
 * Scroll space: after scrolling to the bottom, the last visible content must sit
 * fully above the bottom nav, and the page must not scroll more than the nav
 * allowance (bar height + one page bottom padding, 128px) past its last visible
 * content.
 */
export async function checkScrollSpace(
  page,
  { route, viewport, allowance = 128, minClearance = 0 },
) {
  const tag = `[scroll ${route} ${viewport.width}x${viewport.height}]`;
  const r = await page.evaluate(() => {
    // html has `scroll-behavior: smooth`, so a plain scrollTo animates and
    // scrollY is still 0 when we measure. Jump instantly (BH-77).
    window.scrollTo({ top: document.scrollingElement.scrollHeight, behavior: 'instant' });
    const nav = document.querySelector('[data-testid="bottom-nav"], .nav-dock');
    const navBox =
      nav && nav.getBoundingClientRect().height > 0 ? nav.getBoundingClientRect() : null;
    const isClipped = (el) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (
          cs.position === 'fixed' ||
          cs.display === 'none' ||
          cs.visibility === 'hidden' ||
          Number(cs.opacity) === 0
        )
          return true;
        if (cs.clip && cs.clip !== 'auto' && e.getBoundingClientRect().width <= 1) return true; // sr-only
      }
      return false;
    };
    const root = document.querySelector('main') || document.body;
    let last = 0;
    for (const el of root.querySelectorAll('*')) {
      if (el.childElementCount > 0 && el.tagName.toLowerCase() !== 'svg') continue; // leaves (+ whole svgs)
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      if (isClipped(el)) continue;
      last = Math.max(last, rect.bottom + scrollY);
    }
    return {
      scrollH: document.scrollingElement.scrollHeight,
      innerH: innerHeight,
      scrollY,
      last,
      navTop: navBox ? navBox.top + scrollY : null,
      navH: navBox ? innerHeight - navBox.top : 0,
    };
  });
  const fails = [];
  // Measuring before the page reaches the bottom compares content below the
  // fold with the dock's on-screen position, a false failure (BH-77).
  if (r.scrollY + r.innerH < r.scrollH - 1)
    fails.push(
      `${tag} did not reach the bottom (scrollY ${Math.round(r.scrollY)} + ${r.innerH} < scrollHeight ${r.scrollH})`,
    );
  if (r.navTop !== null && r.last > r.navTop + 1 - minClearance)
    fails.push(
      `${tag} last content (bottom ${Math.round(r.last)}) sits under the bottom nav (top ${Math.round(r.navTop)})` +
        (minClearance ? ` or within ${minClearance}px of it` : ''),
    );
  const limit = Math.max(r.innerH, r.last + r.navH + allowance);
  if (r.scrollH > limit + 1)
    fails.push(
      `${tag} ${Math.round(r.scrollH - limit)}px of empty scroll below the last content (scrollHeight ${r.scrollH}, last content ${Math.round(r.last)})`,
    );
  // 320 follow-up (a): meta line clears the skyline strip above the scallop.
  if (viewport.width < 360 && viewport.height <= 640 && r.metaGap !== null && r.metaGap < 72)
    fails.push(
      `${tag} meta line sits on the skyline (${Math.round(r.metaGap)}px above the sheet, need 72)`,
    );
  return fails;
}

const fmt = (b) =>
  `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`;
