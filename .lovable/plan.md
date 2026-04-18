

The user wants comprehensive testing for the IntensityScene's visual appearance across devices, especially tall phones like iPhone 17 Pro Max (which has a very tall aspect ratio: ~440×956 CSS px ≈ 19.5:9).

Let me think about what I know:
- Scene uses `h-[50vh]` with `min-h-[360px]` and `overflow-hidden` (per scene-visual-integrity memory)
- Foreground priority: hills, grass, fence, cooling towers
- Multi-theme: countryside, city, coastal + winter variant
- 7 time-of-day periods + weather effects
- iOS has 59px top safe area fallback

The vertical stretching on tall phones is likely because:
1. `50vh` on a 956px-tall viewport = 478px scene, but landscape SVG uses fixed `viewBox="0 0 400 150"` with `preserveAspectRatio` defaulting to `xMidYMid meet` — this could cause the sky region above hills to dominate
2. Sky gradient fills remaining vertical space as a flat fill, exaggerating emptiness on tall screens
3. Scene elements positioned with `bottom: X%` may drift apart vertically as height grows

I'll propose a comprehensive test plan covering visual regression across viewports, themes, times, and weather — plus targeted fixes for tall aspect ratios.

Keep concise.

