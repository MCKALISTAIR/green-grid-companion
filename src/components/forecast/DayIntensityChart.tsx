import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import {
  type DayDetail,
  formatWindow,
  layoutChips,
  londonDayTicks,
  slotValueText,
  yDomain,
} from '@/lib/dayForecast';
import { formatLondonTime } from '@/lib/londonTime';
import { cn } from '@/lib/utils';

const UNIT = 'gCO\u2082/kWh';
const FORECAST_COLOR = 'hsl(var(--chart-2))';
const ACTUAL_COLOR = 'hsl(var(--foreground))';
const CLEAN_COLOR = 'hsl(var(--intensity-very-low))';
const DIRTY_COLOR = 'hsl(var(--intensity-high))';

const MARGIN = { top: 8, right: 4, bottom: 0, left: 20 };
const Y_AXIS_WIDTH = 34;
const X_AXIS_HEIGHT = 22;
const CHIP_HEIGHT = 20;
const CHIP_GAP = 4;

export interface DayIntensityChartProps {
  detail: DayDetail;
  /** Currently scrubbed slot index, or null when not scrubbing. */
  scrubIndex: number | null;
  onScrub: (index: number | null) => void;
  reducedMotion: boolean;
  /** id of the element holding the text summary (aria-describedby). */
  summaryId?: string;
  height?: number;
}

function estimateChipWidth(text: string): number {
  return Math.ceil(text.length * 6.1 + 16);
}

export function DayIntensityChart({
  detail,
  scrubIndex,
  onScrub,
  reducedMotion,
  summaryId,
  height = 190,
}: DayIntensityChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const draggingRef = useRef(false);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { bounds, slots, nowIndex } = detail;
  const nowMs = nowIndex !== null ? Date.now() : null;
  const domainX: [number, number] = [bounds.start, bounds.end];
  const [y0, y1] = yDomain(detail.min, detail.max);
  const plotLeft = MARGIN.left;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right - Y_AXIS_WIDTH);
  const toPx = useCallback(
    (ms: number) => plotLeft + ((ms - bounds.start) / (bounds.end - bounds.start)) * plotWidth,
    [plotLeft, plotWidth, bounds.start, bounds.end],
  );

  const data = useMemo(
    () =>
      slots.map((s, i) => {
        // Past part of the forecast is faded. The boundary slot belongs to both
        // series so the two segments join up.
        const isPast = nowIndex === null ? s.to <= Date.now() : i <= nowIndex;
        const isFuture = nowIndex === null ? !isPast : i >= nowIndex;
        return {
          x: s.x,
          forecastPast: isPast ? s.forecast : null,
          forecastFuture: isFuture ? s.forecast : null,
          actual: s.actual,
        };
      }),
    [slots, nowIndex],
  );

  const ticks = useMemo(() => londonDayTicks(detail.dateKey), [detail.dateKey]);
  const yTicks = detail.min === null || detail.max === null
    ? []
    : detail.min === detail.max
      ? [Math.round(detail.min)]
      : [Math.round(detail.min), Math.round(detail.max)];
  const gridLines = [0.25, 0.5, 0.75].map((f) => y0 + (y1 - y0) * f);

  // Chips: cleanest window, dirtiest half hour, now. Stacked into lanes.
  const chips = useMemo(() => {
    const list: Array<{ id: string; x: number; width: number; text: string; tone: 'clean' | 'dirty' | 'now' }> = [];
    if (detail.cleanest) {
      const text = `Cleanest ${formatWindow(detail.cleanest)}`;
      const mid = (detail.cleanest.start.getTime() + detail.cleanest.end.getTime()) / 2;
      list.push({ id: 'clean', x: toPx(mid), width: estimateChipWidth(text), text, tone: 'clean' });
    }
    if (detail.dirtiest) {
      const text = `Dirtiest ${detail.dirtiest.time}`;
      list.push({ id: 'dirty', x: toPx(detail.dirtiest.x), width: estimateChipWidth(text), text, tone: 'dirty' });
    }
    if (nowMs !== null) {
      list.push({ id: 'now', x: toPx(nowMs), width: estimateChipWidth('Now'), text: 'Now', tone: 'now' });
    }
    const placed = layoutChips(list, width);
    return list.map((c, i) => ({ ...c, ...placed[i] }));
  }, [detail.cleanest, detail.dirtiest, nowMs, toPx, width]);
  const laneCount = chips.length ? Math.max(...chips.map((c) => c.lane)) + 1 : 0;
  const chipsHeight = laneCount * (CHIP_HEIGHT + CHIP_GAP);

  // --- Scrubbing -----------------------------------------------------------
  const indexFromClientX = useCallback(
    (clientX: number, rectLeft: number, rectWidth: number) => {
      if (rectWidth <= 0) return null;
      const ratio = Math.min(1, Math.max(0, (clientX - rectLeft) / rectWidth));
      return Math.min(slots.length - 1, Math.floor(ratio * slots.length));
    },
    [slots.length],
  );

  const handlePointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const idx = indexFromClientX(e.clientX, rect.left, rect.width);
    if (idx !== null && idx !== scrubIndex) onScrub(idx);
  };

  const defaultKeyboardIndex = () => {
    if (scrubIndex !== null) return scrubIndex;
    if (nowIndex !== null) return nowIndex;
    const firstFilled = slots.findIndex((s) => s.forecast !== null);
    return firstFilled >= 0 ? firstFilled : 0;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = defaultKeyboardIndex();
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - 1;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + 1;
        break;
      case 'PageDown':
        next = current - 6;
        break;
      case 'PageUp':
        next = current + 6;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = slots.length - 1;
        break;
      case 'Escape':
        if (scrubIndex !== null) {
          e.stopPropagation();
          onScrub(null);
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    onScrub(Math.min(slots.length - 1, Math.max(0, next)));
  };

  // Release scrub if the data changes underneath (e.g. refetch to another day).
  useEffect(() => {
    if (scrubIndex !== null && scrubIndex >= slots.length) onScrub(null);
  }, [scrubIndex, slots.length, onScrub]);

  const scrubSlot = scrubIndex !== null ? slots[scrubIndex] : null;
  const sliderIndex = scrubIndex ?? defaultKeyboardIndex();

  return (
    <div ref={wrapRef} className="relative w-full select-none" data-testid="day-intensity-chart">
      {/* Marker chips, stacked so they never collide */}
      <div className="relative w-full" style={{ height: chipsHeight }} aria-hidden>
        {width > 0 &&
          chips.map((c) => (
            <span
              key={c.id}
              data-chip={c.id}
              className={cn(
                'absolute whitespace-nowrap rounded-full px-2 text-[11px] font-medium leading-5 tabular-nums',
                c.tone === 'clean' && 'bg-intensity-very-low/15 text-foreground',
                c.tone === 'dirty' && 'bg-intensity-high/15 text-foreground',
                c.tone === 'now' && 'bg-foreground text-background',
              )}
              style={{ left: c.left, top: c.lane * (CHIP_HEIGHT + CHIP_GAP), height: CHIP_HEIGHT }}
            >
              {c.text}
            </span>
          ))}
      </div>

      <div className="relative" style={{ height }}>
        {width > 0 && (
          <ComposedChart
            width={width}
            height={height}
            data={data}
            margin={MARGIN}
            aria-hidden
          >
            {gridLines.map((y) => (
              <ReferenceLine key={y} y={y} stroke="hsl(var(--border))" strokeOpacity={0.5} ifOverflow="hidden" />
            ))}
            {yTicks.map((y) => (
              <ReferenceLine key={`t${y}`} y={y} stroke="hsl(var(--border))" strokeOpacity={0.8} />
            ))}

            {detail.cleanest && (
              <ReferenceArea
                x1={detail.cleanest.start.getTime()}
                x2={detail.cleanest.end.getTime()}
                fill={CLEAN_COLOR}
                fillOpacity={0.14}
                strokeOpacity={0}
                ifOverflow="hidden"
              />
            )}

            <XAxis
              dataKey="x"
              type="number"
              domain={domainX}
              ticks={ticks}
              tickFormatter={(v: number) => formatLondonTime(new Date(v))}
              allowDataOverflow
              height={X_AXIS_HEIGHT}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              interval={0}
            />
            <YAxis
              orientation="right"
              domain={[y0, y1]}
              ticks={yTicks}
              width={Y_AXIS_WIDTH}
              tickLine={false}
              axisLine={false}
              allowDataOverflow
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />

            <Line
              dataKey="forecastPast"
              type="monotone"
              stroke={FORECAST_COLOR}
              strokeOpacity={0.4}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="forecastFuture"
              type="monotone"
              stroke={FORECAST_COLOR}
              strokeWidth={2.25}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={!reducedMotion}
              animationDuration={500}
            />
            {detail.hasActualLine && (
              <Line
                dataKey="actual"
                type="monotone"
                stroke={ACTUAL_COLOR}
                strokeOpacity={0.85}
                strokeWidth={2}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={!reducedMotion}
                animationDuration={500}
              />
            )}

            {nowMs !== null && (
              <ReferenceLine x={nowMs} stroke="hsl(var(--foreground))" strokeOpacity={0.55} strokeWidth={1} />
            )}

            {detail.dirtiest && detail.dirtiest.forecast !== null && (
              <ReferenceDot
                x={detail.dirtiest.x}
                y={detail.dirtiest.forecast}
                r={4}
                fill={DIRTY_COLOR}
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
              />
            )}

            {scrubSlot && (
              <ReferenceLine x={scrubSlot.x} stroke="hsl(var(--foreground))" strokeWidth={1.25} />
            )}
            {scrubSlot && scrubSlot.forecast !== null && (
              <ReferenceDot x={scrubSlot.x} y={scrubSlot.forecast} r={4} fill={FORECAST_COLOR} stroke="hsl(var(--background))" strokeWidth={1.5} />
            )}
            {scrubSlot && scrubSlot.actual !== null && (
              <ReferenceDot x={scrubSlot.x} y={scrubSlot.actual} r={4} fill={ACTUAL_COLOR} stroke="hsl(var(--background))" strokeWidth={1.5} />
            )}
          </ComposedChart>
        )}

        {/* Scrub surface: pointer, touch and keyboard. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Half-hour forecast"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, slots.length - 1)}
          aria-valuenow={sliderIndex}
          aria-valuetext={slotValueText(detail, sliderIndex)}
          aria-describedby={summaryId}
          data-vaul-no-drag=""
          data-testid="day-chart-scrubber"
          className="absolute cursor-crosshair rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring touch-none"
          style={{ left: plotLeft, width: plotWidth, top: MARGIN.top, bottom: X_AXIS_HEIGHT }}
          onPointerDown={(e) => {
            draggingRef.current = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            handlePointer(e);
          }}
          onPointerMove={(e) => {
            if (draggingRef.current || e.pointerType === 'mouse') handlePointer(e);
          }}
          onPointerUp={(e) => {
            draggingRef.current = false;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            if (e.pointerType !== 'mouse') onScrub(null);
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
            onScrub(null);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse' && !draggingRef.current) onScrub(null);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (scrubIndex === null) onScrub(defaultKeyboardIndex());
          }}
          onBlur={() => onScrub(null)}
        />
      </div>
    </div>
  );
}
