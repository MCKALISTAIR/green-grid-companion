

# Seamless Carbon Intensity Data Refresh

## Overview
Transform the data update experience from showing a "Waiting..." label to a seamless, background refresh with subtle animations when the intensity value changes.

## Current Behavior Analysis
The app already has smart refresh logic:
- `useCarbonData.ts` calculates time until the next half-hour boundary (when the grid updates)
- A stale data check runs every 60 seconds in `Index.tsx` 
- React Query handles caching and background refetches

**The problem**: When data becomes stale (waiting for the grid to publish), users see an orange "Waiting..." label, which feels broken even though it's technically correct behavior.

## Solution Architecture

### 1. Silent Background Refresh (No UI Flicker)
Instead of showing loading states during background refetches, we'll:
- Keep displaying the current cached value while fetching new data
- Only show loading spinners on the *initial* load (no data at all)
- Use React Query's `placeholderData` to maintain the previous value during refetch

### 2. Smart Polling Aligned to Grid Schedule
Enhance the refresh timing:
- Calculate the **exact moment** the next grid update should be available (on :00 or :30)
- Add a 90-second buffer for API processing delay
- Set a `setTimeout` to fetch precisely at that moment rather than using arbitrary intervals
- Chain timeouts so each fetch schedules the next one

### 3. Animated Value Transition
When the intensity value changes:
- Detect the change by comparing previous vs new values
- Animate the number "counting up" or "counting down" using Framer Motion
- Show a subtle directional indicator (small arrow) that fades out after 2 seconds
- Apply a brief color pulse to draw attention without being distracting

---

## Technical Implementation

### Changes to `src/hooks/useCarbonData.ts`

```text
New capabilities:
- Export `previousIntensity` alongside `intensity` for animation logic
- Create a custom hook `useSmartRefetch` that:
  1. Calculates exact ms until next :00 or :30 plus buffer
  2. Uses setTimeout (not setInterval) for precise timing
  3. Triggers refetch and schedules the next timeout
- Add `isBackgroundFetching` flag to distinguish initial vs refresh loads
```

### Changes to `src/pages/Index.tsx`

```text
Intensity Display Updates:
- Replace static number with animated counter component
- Track `previousIntensity` using useRef
- When intensity changes:
  - Animate number transition (0.5s duration)
  - Show small up/down arrow indicator
  - Trigger subtle haptic feedback on native devices
- Remove "Waiting..." label entirely
- Update "Next update" time to always show future time even if past expected
```

### New Component: `src/components/AnimatedIntensity.tsx`

```text
Props:
- value: number (current intensity)
- previousValue: number | null
- animationDuration?: number (default 500ms)

Features:
- Uses Framer Motion's `animate` to count between values
- Displays directional arrow (TrendingUp/TrendingDown icons)
- Arrow auto-fades after 2 seconds
- Optional color pulse effect based on direction
```

### Changes to `src/App.tsx` (QueryClient config)

```text
Update default query options:
- Add `placeholderData: keepPreviousData` to prevent UI jumps
- Ensure `isLoading` only true on first fetch, not refetches
```

---

## User Experience Flow

```text
Initial Load:
┌─────────────────────────────────────┐
│  [Turbine Spinner]                  │
│  "Loading..."                       │
└─────────────────────────────────────┘

Data Displayed:
┌─────────────────────────────────────┐
│         South Scotland              │
│            156                      │
│         gCO₂/kWh                    │
│          moderate                   │
│  Updated 14:00 • Next 14:30         │
└─────────────────────────────────────┘

Background Refresh (invisible):
- At 14:31:30 (30 seconds after grid publishes)
- Fetch happens silently in background
- User sees no loading indicator

New Data Arrives (animated):
┌─────────────────────────────────────┐
│         South Scotland              │
│        142 ↓                        │  ← Arrow fades out
│         gCO₂/kWh                    │     after 2 seconds
│          moderate                   │
│  Updated 14:30 • Next 15:00         │  ← Timestamps update
└─────────────────────────────────────┘
```

---

## Detailed File Changes

| File | Changes |
|------|---------|
| `src/hooks/useCarbonData.ts` | Add `useSmartRefetch` hook with precise setTimeout scheduling; export `previousIntensity` and `isBackgroundFetching` |
| `src/components/AnimatedIntensity.tsx` | **NEW** - Animated number counter with direction arrows using Framer Motion |
| `src/pages/Index.tsx` | Replace static intensity number with `AnimatedIntensity`; remove "Waiting..." label; integrate haptic feedback on value change |
| `src/App.tsx` | Update QueryClient to use `placeholderData: keepPreviousData` for seamless refetches |

---

## Benefits

- **No more "Waiting..." label** - Data appears fresh at all times
- **Battery efficient** - Single fetch per 30-min cycle, no polling
- **Delightful UX** - Subtle animations make updates feel alive
- **Accurate timing** - Synced precisely to National Grid's publication schedule
- **Native feel** - Haptic feedback reinforces data changes on iOS

