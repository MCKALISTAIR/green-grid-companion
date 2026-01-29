# Seamless Carbon Intensity Data Refresh

## ✅ COMPLETED

### Summary
Implemented seamless background data refresh with animated intensity transitions.

### Changes Made

1. **`src/hooks/useCarbonData.ts`**
   - Added `useSmartRefetch` hook with precise setTimeout scheduling aligned to :00/:30 grid updates
   - Exported `previousIntensity` for animation logic
   - Added `isBackgroundFetching` flag to distinguish initial vs refresh loads
   - Removed refetchInterval from queries (replaced with smart setTimeout)

2. **`src/components/AnimatedIntensity.tsx`** (NEW)
   - Framer Motion spring animation for counting between values
   - Directional arrows (TrendingUp/TrendingDown) that fade out after 2 seconds
   - Haptic feedback on value change for native devices

3. **`src/pages/Index.tsx`**
   - Replaced static intensity number with `AnimatedIntensity` component
   - Removed "Waiting..." label entirely
   - Updated next update time to always show future time (calculates next slot if overdue)

### Benefits Delivered
- **No more "Waiting..." label** - Data appears fresh at all times
- **Battery efficient** - Single fetch per 30-min cycle, no polling
- **Delightful UX** - Subtle animations make updates feel alive
- **Accurate timing** - Synced precisely to National Grid's publication schedule
- **Native feel** - Haptic feedback reinforces data changes on iOS

