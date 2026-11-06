import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Copy, ExternalLink, Inbox, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import {
  contrastRatio,
  getSwatch,
  getSwatches,
  gradeContrast,
  type TokenSwatch,
  type WcagGrade,
} from '@/lib/designTokens';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SceneContrastMatrix } from '@/components/SceneContrastMatrix';

const SEMANTIC_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
];

const INTENSITY_TOKENS = [
  'intensity-very-low',
  'intensity-low',
  'intensity-moderate',
  'intensity-high',
  'intensity-very-high',
];

const GEN_TOKENS = [
  'gen-wind',
  'gen-solar',
  'gen-nuclear',
  'gen-gas',
  'gen-coal',
  'gen-hydro',
  'gen-biomass',
  'gen-imports',
  'gen-other',
];

const CONTRAST_PAIRS: Array<{ fg: string; bg: string; usage: string }> = [
  { fg: 'foreground', bg: 'background', usage: 'Body text on page' },
  { fg: 'card-foreground', bg: 'card', usage: 'Body text on card' },
  { fg: 'muted-foreground', bg: 'background', usage: 'Secondary text' },
  { fg: 'primary-foreground', bg: 'primary', usage: 'Text on primary button' },
  { fg: 'secondary-foreground', bg: 'secondary', usage: 'Text on secondary chip' },
  { fg: 'accent-foreground', bg: 'accent', usage: 'Text on accent surface' },
  { fg: 'destructive-foreground', bg: 'destructive', usage: 'Text on destructive' },
];

function gradeBadgeVariant(grade: WcagGrade): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (grade === 'AAA' || grade === 'AA') return 'default';
  if (grade === 'AA Large') return 'secondary';
  return 'destructive';
}

function copy(value: string, label: string) {
  navigator.clipboard?.writeText(value).then(
    () => toast.success(`Copied ${label}`),
    () => toast.error(`Couldn't copy ${label}`),
  );
}

function Swatch({ token }: { token: TokenSwatch }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => copy(`hsl(var(--${token.name}))`, `--${token.name}`)}
          className="group flex flex-col items-stretch gap-2 rounded-lg border border-border bg-card p-2 text-left transition hover:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="block h-16 w-full rounded-md border border-border/60"
            style={{ backgroundColor: token.cssColor }}
            aria-hidden
          />
          <span className="flex items-center justify-between gap-2">
            <code className="font-mono text-xs">--{token.name}</code>
            <Copy
              className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100"
              aria-hidden
            />
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{token.hex}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono text-xs">hsl({token.raw || '—'})</p>
        <p className="text-xs text-muted-foreground">Click to copy class</p>
      </TooltipContent>
    </Tooltip>
  );
}

function TokenGrid({
  title,
  tokens,
  version,
}: {
  title: string;
  tokens: string[];
  version: number;
}) {
  const swatches = useMemo(() => {
    void version; // theme flip remount signal from parent
    return getSwatches(tokens);
  }, [tokens, version]);
  return (
    <section aria-labelledby={`group-${title}`}>
      <h3
        id={`group-${title}`}
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {swatches.map((s) => (
          <Swatch key={s.name} token={s} />
        ))}
      </div>
    </section>
  );
}

function ContrastTable({ version }: { version: number }) {
  const rows = useMemo(() => {
    void version; // theme flip remount signal from parent
    return CONTRAST_PAIRS.map((pair) => {
      const ratio = contrastRatio(pair.fg, pair.bg);
      const grade = gradeContrast(ratio);
      return { ...pair, ratio, grade };
    });
  }, [version]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3 font-medium">Sample</th>
            <th className="p-3 font-medium">Pair</th>
            <th className="p-3 font-medium">Usage</th>
            <th className="p-3 font-medium">Ratio</th>
            <th className="p-3 font-medium">WCAG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.fg}-${r.bg}`} className="border-t border-border">
              <td className="p-3">
                <span
                  className="inline-block rounded-md px-3 py-1 text-sm"
                  style={{
                    backgroundColor: `hsl(var(--${r.bg}))`,
                    color: `hsl(var(--${r.fg}))`,
                  }}
                >
                  Aa sample
                </span>
              </td>
              <td className="p-3 font-mono text-xs text-muted-foreground">
                {r.fg} / {r.bg}
              </td>
              <td className="p-3 text-muted-foreground">{r.usage}</td>
              <td className="p-3 font-mono">{r.ratio.toFixed(2)}:1</td>
              <td className="p-3">
                <Badge variant={gradeBadgeVariant(r.grade)}>{r.grade}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TypographySamples() {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
          Display · Plus Jakarta Sans 700 · 36/40
        </p>
        <p className="font-sans text-4xl font-bold leading-tight tracking-tight">
          Cleaner energy, on your schedule
        </p>
      </div>
      <div>
        <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
          Heading · Plus Jakarta Sans 600 · 24/32
        </p>
        <p className="font-sans text-2xl font-semibold">Today's grid is 62% renewable</p>
      </div>
      <div>
        <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
          Body · Plus Jakarta Sans 400 · 16/24
        </p>
        <p className="max-w-prose font-sans">
          GridSense tracks GB carbon intensity in real time and tells you the cleanest moments to
          use power.
        </p>
      </div>
      <div>
        <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
          Personality · Plus Jakarta Sans italic 500 · 18/28
        </p>
        <p className="max-w-prose font-sans text-lg italic font-medium">
          "A small shift in when you charge can mean a meaningful drop in your footprint."
        </p>
      </div>
      <div>
        <p className="mb-1 font-mono text-xs uppercase text-muted-foreground">
          Mono · Inconsolata · dense data only
        </p>
        <p className="font-mono text-base">142 gCO₂/kWh · ↓ 18% vs yesterday</p>
      </div>
    </div>
  );
}

function RadiusShadowSpacing({ version }: { version: number }) {
  const radius = useMemo(() => {
    void version; // theme flip remount signal from parent
    return getSwatch('radius');
  }, [version]);
  const radii = ['sm', 'md', 'lg', 'xl'];
  const shadows = ['sm', 'md', 'lg', 'xl'];
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Radius
        </h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Base: <code className="font-mono">{radius.raw || '—'}</code>
        </p>
        <div className="flex flex-wrap gap-3">
          {radii.map((r) => (
            <div key={r} className="flex flex-col items-center gap-1">
              <div className={`h-14 w-14 border border-border bg-secondary rounded-${r}`} />
              <code className="font-mono text-xs text-muted-foreground">rounded-{r}</code>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Shadow
        </h4>
        <div className="flex flex-wrap gap-4">
          {shadows.map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`h-14 w-14 rounded-md bg-card shadow-${s}`} />
              <code className="font-mono text-xs text-muted-foreground">shadow-{s}</code>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Spacing (Tailwind 4px scale)
        </h4>
        <div className="space-y-2">
          {[1, 2, 4, 6, 8, 12].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className="h-3 rounded-sm bg-primary" style={{ width: `${n * 4}px` }} />
              <code className="font-mono text-xs text-muted-foreground">
                p-{n} ({n * 4}px)
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkyGradients() {
  const gradients = [
    { name: 'sky-clean', label: 'Clean (low intensity)' },
    { name: 'sky-moderate', label: 'Moderate' },
    { name: 'sky-dirty', label: 'Dirty (high intensity)' },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {gradients.map((g) => (
        <div key={g.name} className="overflow-hidden rounded-lg border border-border">
          <div className="h-24" style={{ background: `var(--${g.name})` }} aria-hidden />
          <div className="flex items-center justify-between p-3">
            <span className="text-sm">{g.label}</span>
            <code className="font-mono text-xs text-muted-foreground">--{g.name}</code>
          </div>
        </div>
      ))}
    </div>
  );
}

function ComponentInventory() {
  const items: Array<{
    group: string;
    rows: Array<{ name: string; purpose: string; path: string }>;
  }> = [
    {
      group: 'Primitives (shadcn / Radix)',
      rows: [
        {
          name: 'Button',
          purpose:
            'All clickable affordances. Variants: default, secondary, outline, ghost, destructive.',
          path: 'src/components/ui/button.tsx',
        },
        {
          name: 'Card',
          purpose: 'Default surface for grouped content.',
          path: 'src/components/ui/card.tsx',
        },
        {
          name: 'Dialog / Drawer',
          purpose: 'Modal interactions. Drawer for mobile sheets.',
          path: 'src/components/ui/dialog.tsx',
        },
        {
          name: 'Tabs',
          purpose: 'Sectioning within a single screen.',
          path: 'src/components/ui/tabs.tsx',
        },
        {
          name: 'Tooltip',
          purpose: 'Definition + clarification on hover/focus.',
          path: 'src/components/ui/tooltip.tsx',
        },
        {
          name: 'Sonner Toast',
          purpose: 'Top-centre transient feedback.',
          path: 'src/components/ui/sonner.tsx',
        },
        {
          name: 'Badge',
          purpose: 'Status / categorisation labels.',
          path: 'src/components/ui/badge.tsx',
        },
      ],
    },
    {
      group: 'App components',
      rows: [
        {
          name: 'IntensityGauge',
          purpose: 'The hero number on Home — current carbon intensity.',
          path: 'src/components/AnimatedIntensity.tsx',
        },
        {
          name: 'GenerationMixBar',
          purpose: 'Stacked horizontal bar of fuel mix.',
          path: 'src/components/GenerationMixBar.tsx',
        },
        {
          name: 'ForecastChart',
          purpose: '24h forecast with cross-linked hour picker + BEST ribbon.',
          path: 'src/components/ForecastChart.tsx',
        },
        {
          name: 'StaleDataBadge',
          purpose: 'Marks data older than 35m.',
          path: 'src/components/StaleDataBadge.tsx',
        },
        {
          name: 'OfflineIndicator',
          purpose: 'Top banner on connectivity loss.',
          path: 'src/components/OfflineIndicator.tsx',
        },
        {
          name: 'TurbineSpinner',
          purpose:
            'Brand loading state — same TurbineLogo as splash/onboarding, sized for buttons and loaders.',
          path: 'src/components/ui/turbine-spinner.tsx',
        },
        {
          name: 'EmptyState / ErrorState',
          purpose: 'Standard zero/failure presentations.',
          path: 'src/components/EmptyState.tsx',
        },
      ],
    },
    {
      group: 'Scene system',
      rows: [
        {
          name: 'IntensityScene',
          purpose: 'Ambient backdrop driven by intensity, time, weather.',
          path: 'src/components/IntensityScene.tsx',
        },
        {
          name: 'Landscape variants',
          purpose: 'Countryside / City / Coastal mapped by postcode.',
          path: 'src/components/scene/',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {items.map((group) => (
        <div key={group.group}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.group}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Component</th>
                  <th className="p-3 font-medium">Purpose</th>
                  <th className="p-3 font-medium">Path</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((r) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.purpose}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function PatternsShowcase() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loading</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <TurbineSpinner />
          <span className="text-sm text-muted-foreground">
            Branded spinner — use anywhere data is in flight.
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stale data</CardTitle>
        </CardHeader>
        <CardContent>
          <StaleDataBadge lastUpdated={new Date(Date.now() - 1000 * 60 * 45).toISOString()} />
          <p className="mt-2 text-xs text-muted-foreground">
            Shown when data is &gt; 35 minutes old.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empty state</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Inbox}
            title="No data yet"
            description="Connect Octopus Energy to see your real footprint."
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Error state</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Couldn't load forecast"
            description="Check your connection and try again."
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toast</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Button onClick={() => toast.success('Saved your preference')}>Trigger success</Button>
          <Button variant="destructive" onClick={() => toast.error('Something went wrong')}>
            Trigger error
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buttons</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessibilityNotes() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        GridSense targets <strong>WCAG 2.1 AA</strong> as a floor: 4.5:1 for body text, 3:1 for
        large text. The contrast matrix above is computed live from the active theme — flip the
        toggle at the top of the page to verify both modes.
      </p>
      <ul className="list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <strong className="text-foreground">Reduced motion:</strong> a global{' '}
          <code className="font-mono">prefers-reduced-motion</code> media query in{' '}
          <code className="font-mono">index.css</code> caps animations at 1ms.
        </li>
        <li>
          <strong className="text-foreground">Screen-reader tables:</strong> Recharts canvases are
          mirrored as <code className="font-mono">sr-only</code> data tables.
        </li>
        <li>
          <strong className="text-foreground">Live regions:</strong> connectivity and stale-data
          indicators use <code className="font-mono">role="alert"</code> /{' '}
          <code className="font-mono">aria-live="polite"</code>.
        </li>
        <li>
          <strong className="text-foreground">Focus:</strong> uses the{' '}
          <code className="font-mono">--ring</code> token; never removed without replacement.
        </li>
        <li>
          <strong className="text-foreground">Touch targets:</strong> minimum 44×44px on interactive
          elements per Apple HIG.
        </li>
        <li>
          <strong className="text-foreground">Safe areas:</strong> iOS top inset honoured (see{' '}
          <code className="font-mono">platform/ios-technical-overview</code>).
        </li>
      </ul>
    </div>
  );
}

function HandoverNotes() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div>
        <h4 className="font-semibold">Adding a token</h4>
        <p className="text-muted-foreground">
          Add the HSL triple to both <code className="font-mono">:root</code> and{' '}
          <code className="font-mono">.dark</code> in
          <code className="font-mono"> src/index.css</code>, then expose it under{' '}
          <code className="font-mono">theme.extend.colors</code> in
          <code className="font-mono"> tailwind.config.ts</code>. This page picks it up on next
          reload.
        </p>
      </div>
      <div>
        <h4 className="font-semibold">Adding a component</h4>
        <p className="text-muted-foreground">
          Prefer composing existing primitives in{' '}
          <code className="font-mono">src/components/ui</code>. If you must add a new one, register
          it in the inventory above so the next contributor finds it.
        </p>
      </div>
      <div>
        <h4 className="font-semibold">Related tools</h4>
        <ul className="space-y-1">
          <li>
            <Link
              to="/__scene-test"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              /__scene-test <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
            <span className="text-muted-foreground"> — preview the scene across viewports.</span>
          </li>
          <li>
            <Link
              to="/__turbine-test"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              /__turbine-test <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
            <span className="text-muted-foreground"> — turbine spinner playground.</span>
          </li>
          <li className="text-muted-foreground">
            <code className="font-mono">docs/DESIGN_SYSTEM.md</code> — markdown companion for
            offline review.
          </li>
          <li className="text-muted-foreground">
            <code className="font-mono">docs/SCENE_VISUAL_QA.md</code> — visual QA checklist for
            scenes.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  const { resolvedTheme, setTheme } = useTheme();
  // Bump on theme change so memoised swatches re-read computed styles.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setVersion((v) => v + 1), 0);
    return () => clearTimeout(t);
  }, [resolvedTheme]);

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="container mx-auto max-w-6xl space-y-10 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Internal · /__design-system
          </p>
          <h1 className="mt-1 text-3xl font-bold font-display tracking-tight">
            GridSense Design System
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Art direction: <span className="text-foreground font-medium">Living grid paper</span> —
            one authored product (scene + sheet). Tokens below; direction &amp; one-product tests
            live in <code className="mx-1 font-mono">docs/ART_DIRECTION.md</code>. Values read from
            <code className="mx-1 font-mono">src/index.css</code> at runtime.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="gap-2"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </Button>
      </header>

      <Tabs defaultValue="foundations" className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="foundations">Foundations</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="a11y">Accessibility</TabsTrigger>
          <TabsTrigger value="handover">Handover</TabsTrigger>
        </TabsList>

        <TabsContent value="foundations" className="space-y-10 pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand &amp; voice</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Calm, confident, quietly empowering. We give people clarity about an invisible system
              (the grid) without moralising. Visuals are warm, atmospheric and slightly playful —
              never alarmist.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <TokenGrid title="Semantic" tokens={SEMANTIC_TOKENS} version={version} />
              <TokenGrid
                title="Carbon intensity scale"
                tokens={INTENSITY_TOKENS}
                version={version}
              />
              <TokenGrid title="Generation mix" tokens={GEN_TOKENS} version={version} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sky gradients</CardTitle>
            </CardHeader>
            <CardContent>
              <SkyGradients />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardContent>
              <TypographySamples />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Radius, shadow &amp; spacing</CardTitle>
            </CardHeader>
            <CardContent>
              <RadiusShadowSpacing version={version} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="pt-6">
          <ComponentInventory />
        </TabsContent>

        <TabsContent value="patterns" className="pt-6">
          <PatternsShowcase />
        </TabsContent>

        <TabsContent value="a11y" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Commitments</CardTitle>
            </CardHeader>
            <CardContent>
              <AccessibilityNotes />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Live contrast matrix (static tokens)</CardTitle>
            </CardHeader>
            <CardContent>
              <ContrastTable version={version} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Scene contrast (dynamic backgrounds)</CardTitle>
            </CardHeader>
            <CardContent>
              <SceneContrastMatrix />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  We don't claim WCAG AA on faith — we measure it. Automated audits live alongside
                  the code.
                </p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Tool:</strong> axe-core via Playwright, run
                    from <code className="font-mono">scripts/a11y-audit.ts</code>.
                  </li>
                  <li>
                    <strong className="text-foreground">Cadence:</strong> on demand before any
                    release that touches structural HTML, plus a manual VoiceOver pass on iOS.
                  </li>
                  <li>
                    <strong className="text-foreground">Reports:</strong> dated Markdown files under{' '}
                    <code className="font-mono">docs/a11y/YYYY-MM-DD.md</code>, committed to the
                    repo so reviewers can see real evidence rather than a marketing claim.
                  </li>
                  <li>
                    <strong className="text-foreground">Scope of automation:</strong> ~30–40% of
                    WCAG issues — the rest is keyboard, screen-reader narration and cognitive
                    review.
                  </li>
                </ul>
                <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {`bun run build
bunx playwright install chromium
bun scripts/a11y-audit.ts`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handover" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Handover notes</CardTitle>
            </CardHeader>
            <CardContent>
              <HandoverNotes />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
