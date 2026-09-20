# GridSense

GridSense is a mobile-first companion app designed to help UK (and future) energy consumers make smarter decisions about their electricity usage. By tracking real-time and forecast carbon intensity data, it empowers users to shift their energy consumption to greener times, reducing their carbon footprint.

## 🌟 Key Features

### 🏠 Dynamic Home Screen
*   **Real-time Carbon Intensity**: Visualises the current grid status.
*   **Energy Insights**: Smart, data-driven advice at the top of the feed (e.g. "Wait until 2pm for cleaner energy").
*   **Immersive Scenes**: A dynamic background that changes based on air quality/cleanliness.
    *   **Interactive Elements**: Click wind turbines for "overdrive" mode, tap the Sun/Moon to toggle Synthwave mode with vibrant colors.
    *   **Atmospheric Grading**: Visual filters (contrast, saturation, sepia) dynamically adjust based on carbon intensity to simulate air quality.
    *   **Hybrid Scene Logic**: Both renewable energy and fossil fuel elements coexist, with prominence scaled by carbon intensity.
    *   **Random Events**: Periodic interactive events like UFOs, shooting stars, and rainbows that add delight and engagement.
    *   **Roaming Sheep**: Animated sheep that wander across the landscape and can be clicked for playful interactions.
*   **System Dark Mode**: Fully supported dark theme that respects your device settings.
*   **Desktop Support**: Responsive layout with a dedicated sidebar and grid dashboard for larger screens.
*   **macOS Menu Bar App**: Native Swift companion app for your menu bar (Download via Settings).
*   **Web Notifications**: Notification support for desktop browsers (Chrome/Safari) when the tab is open.
*   **iOS Home Screen Widget**: Check live carbon intensity directly from your home screen (supports Region selection).
*   **Haptic Feedback**: Tactile responses for interactive elements (Wind Turbines, Sun/Moon, Pull-to-Refresh).
*   **Dynamic Status Bar**: The native iOS status bar adapts to match the changing sky color for a seamless look.
*   **Reduced Motion**: Respects system accessibility settings to disable parallax and complex animations.

### ⚡ Power Planner
*   **Smart Scheduling**: Plan usage for EVs, Washing Machines, and custom appliances.
*   **Reminders**: Set notifications for optimal start times directly from the planner.
*   **Carbon Savings**: Quantified impact (e.g. "Save 120g CO₂ vs Now").
*   **Fixed View**: Distraction-free, single-screen experience.

### 📊 Data History
*   **Comprehensive Charts**: View carbon intensity trends over the last **24 hours** or **7 days**.
*   **Energy Overlay**: Overlay your actual **Octopus Energy** consumption (kWh) and Total Carbon Mass (gCO2) directly onto the intensity graph.
*   **Stats**: Track average intensity, total footprint, and performance trends.

### 🏆 Leaderboard & Map
*   **Regional Ranking**: See a live leaderboard of the greenest UK regions.
*   **High-Fidelity Map**: A beautiful, geometrically accurate SVG map of the UK (GB + NI) showing real-time intensity bubbles.

### ⚙️ Settings & Integrations
*   **Smart Alerts**: Configurable notifications for low-carbon windows.
*   **Live Accuracy Mode**: Optional **Background Fetch** support to check real-time grid data periodically (offline-first by default).
*   **Test Notifications**: Verify notification system is working with one tap.
*   **Octopus Energy Integration**:
    *   **Multi-User Support**: Securely link multiple Octopus accounts on one device.
    *   **Smart Meter Sync**: Sync historical consumption data to calculate your **Real Carbon Footprint**.
    *   **Green Score**: Get a personalized "Green Energy Score" based on your usage timing with detailed explanations.
    *   **Meter Management**: Easy-to-use settings for syncing, switching accounts, or disconnecting.
    *   **Comprehensive Onboarding**: Learn what you'll unlock before linking your meter.
*   **Account Sync**:
    *   **Cross-Device**: Sign in with Apple or Google to sync consumption, settings, and footprint data.
    *   **Data Portability**: Export your data directly from the app.
    *   **Secure Backup**: Never lose your history when switching phones.
*   **Weather Widget**: Show/hide local weather conditions with persistent preferences.
*   **Custom Appliances**: Create and save custom appliances in Power Planner (persists between sessions).

## 🆕 Recent Updates (v1.4.7 - 2026-07-13)

### ✨ Premium Polish & Interaction Design
*   **Dynamic Versioning**: Injected the real `npm_package_version` into Vite build definitions, ensuring the custom React Splash Screen displays the correct version (e.g. `v1.2.1`) instead of `v1.0.0`.
*   **Bottom Nav Active Tab Slide**: Added a physics-based layout-animated `motion.div` active tab pill behind the navigation buttons, enabling a smooth sliding transition between views.
*   **Accessible Tablist Switcher**: Refactored the Intensity/Demand/Footprint segmented control into a semantic `role="tablist"` + `role="tab"` element with full arrow-key keyboard navigation and a sliding active background pill.
*   **Background Refresh Loader**: Added a rotating `RefreshCw` spinner next to the location selection headers on both mobile and desktop views when background fetching is active.
*   **Accessible Fact Bubble**: Integrated keyboard accessibility (`role="button"`, `tabIndex={0}`, Space/Enter triggers) and a discoverable `(tap to cycle)` hint label for the `EnergyFactBubble` component.
*   **Immersive Onboarding**: Set the dynamic `IntensityScene` (at clean midday state) as a full-bleed backdrop behind a glassmorphic steps card in forced dark mode.
*   **Reduced Motion**: Wired `useReducedMotion()` into `AnimatedIntensity`, `EnergyFactBubble`, and other core components to disable number counting springs and scale/position animations when requested.
*   **Landscape Height Clipping Fix**: Updated `IntensityScene` to support style overrides and merge them reactively (`...style`) over the default `clamp(...)` values. Passed `style={{ height: "100%" }}` from all parent pages (`Index`, `History`, `Onboarding`, and `SceneTest`) to prevent gaps and cut-off trees on tall-aspect viewports and snapshot cards.

## Previous Updates (v1.4.6 - 2026-02-27)

### 🐛 Visual & Tour Fixes
*   **Product Tour Viewports**: The interactive tour properly distinguishing between Desktop (`#side-nav`) and Mobile (`#bottom-nav`) viewports to prevent layout anchors from floating aimlessly on window resizes.
*   **Forecast Chart Ribbon**: Condensed consecutive "BEST" hours on the 24-hour forecast chart into a sleek, unified ribbon instead of endlessly repeating individual badges.
*   **Advanced Accessibility**: Added `sr-only` data tables to represent re-charts canvases for visual impairments, enforced ARIA Live regions for disconnect notifications, and deployed a robust CSS reset to globally mute complex animations when "Prefers reduced motion" is requested.

## Previous Updates (v1.4.5 - 2026-02-20)

### 🐛 Visual & UI Fixes
*   **Scene SVG Clipping**: Fixed layout overlapping and standardized `preserveAspectRatio` on generation layers (Nuclear, Offshore Wind, Biomass) ensuring they stretch to fill wide desktop viewports perfectly without revealing the background.
*   **Dialog Scroll Lock**: Enforced flexbox boundaries (`overflow-hidden`, `min-h-0`) on the "Generation Mix Breakdown" dialog so users can smoothly scroll through all items on smaller screens.
*   **Desktop Tour Anchors**: Restored missing `data-tour` targets to the desktop navigation sidebar to prevent the Product Tour from floating aimlessly.
*   **Sun Render Styling**: Removed the faint transparent bounding box appearing around the `Sun` SVG during interactive clicks.
*   **API Key Storage Copy**: Clarified the Octopus Integration empty-state warning to explicitly mention "synced via end-to-end encryption" for cross-device iCloud/Google Keychain setups.

## Previous Updates (v1.4.4 - 2026-02-16)

### 🎓 Enhanced User Experience
*   **Power Planner Onboarding**: Dismissible welcome card explaining how to use the shiftable appliance scheduler
*   **Terminology Tooltips**: Clear definitions for technical terms like "Gigawatt (GW)" in Demand and Generation Mix views
*   **History Tab Guidance**: New user tip explaining solid line (actual) vs dotted line (forecast) in charts

### ✨ Premium Tour Experience
*   **Glassmorphism Styling**: Backdrop blur effects and smooth animations for tour popovers
*   **Improved Content**: Tour now mentions interactive features (clickable turbines, Time Machine)
*   **Better Accessibility**: Redesigned "Take a Tour" button in Settings with gradient styling
*   **Instant Replay**: New `replayTour()` function - no page reload required

## Previous Updates (v1.4.3 - 2026-02-15)

### 🎨 UI Improvements
*   **Hourly Forecast Chart**: Simplified visualization with modern factory icon and improved color scheme.
*   **Visual Bug Fixes**: Fixed transparency issues and grey bar overlay on home screen.
*   **Past vs Future Clarity**: Forecast comparison indicators now only appear for historical data.

### 🔔 User-Friendly Notifications
*   **Actionable Wording**: Rewrote notification labels from technical terms to user-friendly language
    *   "Low Intensity Alert" → "Best Time to Use Energy"
    *   "High Intensity Alert" → "Avoid High Carbon Times"
    *   "Daily Forecast" → "Daily Energy Outlook"
*   **Best Time Windows**: Daily forecast now shows the longest green energy period (e.g., "Best window: 10:00-14:00 (4h)")
*   **Whole Day View**: Notifications now count green hours from midnight to midnight for complete daily picture

## Previous Updates (v1.5.0 - 2026-02-07)

### 🖥️ Desktop Companion & Experience
*   **macOS Menu Bar App**: Keep an eye on the grid from your desktop. Native performance, tiny footprint.
*   **Desktop Download**: easily download the app from the Settings page.
*   **Product Tour**: Interactive guide for new users explaining every part of the dashboard.

### 🔐 Account & Onboarding
*   **Cloud Sync**: Sign in to back up your Octopus credentials and carbon history.
*   **Enhanced Onboarding**: 
    *   **Welcome Slides**: Clear introduction to GridSense features.
    *   **Household Profiling**: Select your house type (Flat/Mid/Large) for instant accurate benchmarks.
    *   **Smart Location**: Auto-detect region or enter postcode manually.
*   **Cookie Consent**: Transparent, privacy-focused consent flow.

## Previous Updates (v1.4.1 - 2026-02-04)

### 📚 Help & Learning
*   **Feature Guides**: Comprehensive in-depth guides for all major features accessible from Settings
    *   Home Dashboard, Carbon Intensity, Power Planner, Notifications
    *   Leaderboard, History & Trends, Interactive Scene, Integrations
    *   Saved Locations management
*   **Help & Tips**: Quick-reference FAQ with accordion sections for common questions
    *   Getting Started, Understanding Data, Interactive Features
    *   Troubleshooting, Privacy & Data, and more
*   **Professional Splash Screen**: Branded loading experience with TurbineLogo and smooth transitions

### 💡 Enhanced Energy Insights
*   **60+ Contextual Facts**: Dramatically expanded energy insights with new categories
    *   Storage, Savings, Nuclear, Grid Balancing, Weather-based tips
    *   Real-world impact comparisons (car miles, tree offsets, smartphone charges)
*   **Coal-Free Streak Tracker**: Monitor continuous periods without coal in the grid
    *   Tracks days and hours since last coal usage
    *   Persists across sessions
    *   Celebration messages in Energy Insights
*   **Smart Fact Selection**: Dynamic filtering based on intensity, time of day, weather, and generation mix

### 🔧 Energy Standards & Conversions
*   **UK House Types**: Integrated energy standards for different housing types
    *   Flat, Terraced, Semi-Detached, Detached
    *   Average consumption data for accurate impact calculations
*   **Real-World Conversions**: Convert gCO₂ to relatable equivalents
    *   Car miles driven, trees needed for offset
    *   Smartphone charges, cups of tea, LED bulb hours
*   **User Settings System**: Centralized configuration management

## Previous Updates (v1.3.0 - 2026-01-30)

### 🏆 Gamification & History
*   **Grid Guardian Achievements**: Unlock badges like 'Night Owl' and 'Clean Streak' for eco-friendly habits.
*   **Grid Time Machine**: Travel back in time to view historical carbon intensity data with a vintage filter.
*   **Secret Builder Mode**: Unlockable debug panel (tap Version # 7 times) to control weather and time of day.
*   **Badges Profile**: View your earned achievements in the Settings page.

### 🎨 Enhanced Dynamic Scene
*   **Living Ecosystem**: Bees, rabbits, foxes, and owls that appear based on time/conditions.
*   **Carbon Milestones**: Special effects for <50g (Rainbow), >300g (Pollution Warning), and Net Zero.
*   **Advanced Weather**: Hydro dams during rain, Aurora Borealis on clean winter nights.
*   **Parallax Depth**: Multi-layered background with mountains and swaying grass.
*   **Interactive Elements**: Double-click the moon for a meteor shower!
*   **Generation Mix Reality**: Real-time nuclear cooling towers, offshore wind, and biomass smoke.

### Reliability & Onboarding 🛡️
*   **Production Error Tracking**: Sentry integration for monitoring stability in real-time.
*   **Enhanced Onboarding**: New wizard flow with proactive notification permissions.
*   **Automated Releases**: Version synchronization across Web, iOS, and Android configs.

### Performance Improvements ⚡
*   **Instant Integrations**: 90% faster loading for Energy Integrations via optimistic parallel fetching.
*   **Optimized Queries**: Enhanced React Query cache configurations across all pages.
*   **Better User Experience**: Professional skeleton loaders replace spinners.

### New Features
*   **Forecast Comparison**: New "Pred vs Act" comparative view in Home screen intensity cards.
*   **Weather Widget Controls**: Hide/show local weather conditions.
*   **Green Energy Score Info**: Detailed popover explaining score calculation
*   **Octopus Settings**: Enhanced management for linked accounts
*   **Notification Testing**: Verify your setup with one tap

### Technical Improvements
*   **Centralized Logging**: robust `logger` with Sentry support and environment awareness
*   **Error Handling**: Standardized error utilities across the app


## 🛠️ Technology Stack

*   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Mobile Engine**: [Capacitor](https://capacitorjs.com/) (**iOS shipping**; Android project not included yet)
*   **Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Edge Functions, RLS)
*   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Charting**: [Recharts](https://recharts.org/)
*   **Background Tasks**: `@transistorsoft/capacitor-background-fetch`
*   **Data Source**: [Carbon Intensity API](https://carbon-intensity.github.io/api-definitions/) (National Grid ESO)

## 🚀 Getting Started

### Prerequisites
*   Node.js & npm (Install via [nvm](https://github.com/nvm-sh/nvm))
*   Xcode (for iOS development)
*   CocoaPods (for native iOS dependencies)

### Installation

1.  **Clone the repository**
    ```sh
    git clone <YOUR_GIT_URL>
    cd green-grid-companion
    ```

2.  **Install web dependencies**
    ```sh
    npm install
    ```

3.  **Configure Environment Variables**
    Copy `.env.example` to `.env`.
    ```sh
    cp .env.example .env
    ```

    | Variable | Required | Description |
    |---|---|---|
    | `VITE_SUPABASE_URL` | Optional* | Supabase project REST URL |
    | `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional* | Supabase anon/public JWT key |
    | `VITE_SUPABASE_PROJECT_ID` | Optional* | Supabase project reference ID |
    | `VITE_SENTRY_DSN` | Optional | Sentry error monitoring DSN |

    > **⚠️ Important:** If you skip the `.env` file, `npm run dev` will silently use the **production** Supabase database via hardcoded fallback values in `vite.config.ts`. Always configure `.env` if you want an isolated local environment.

4.  **Run the web development server**
    ```sh
    npm run dev
    ```
    Visit `http://localhost:8080` to see the app in your browser.
## 🗄️ Backend & Local Database

GridSense uses [Supabase](https://supabase.com) for auth, database, and edge functions.
The web app works out of the box against the production project for public features, but
you'll need the Supabase CLI to run migrations or develop edge functions locally.

### Supabase CLI Setup

```sh
# Install the CLI (macOS)
brew install supabase/tap/supabase

# Start local Supabase stack (Postgres + Auth + Storage + Studio)
supabase start
```

Once running, Studio is available at `http://localhost:54323`.
Update your `.env` to point at the local instance:
```sh
VITE_SUPABASE_URL="http://localhost:54321"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key from supabase start output>"
VITE_SUPABASE_PROJECT_ID="local"
```

### Running Migrations

```sh
# Apply all 27 migrations to the local database
supabase db reset
```

> **Note:** The `setup_cron_schedules` migration enables `pg_cron` and hardcodes the
> **production** Supabase project URL in its cron jobs. It is safe to exclude locally:
> ```sh
> supabase db reset --exclude 20260713210000_setup_cron_schedules.sql
> ```

### Developing Edge Functions Locally

```sh
# Serve all edge functions on http://localhost:54321/functions/v1/
supabase functions serve
```

The project includes 12 edge functions under `supabase/functions/`:
`check-carbon-intensity`, `daily-forecast`, `weekly-digest`, `monthly-report`,
`tesla-energy`, `push-subscriptions`, `delete-account`, `export-data`,
`grid-demand`, `octopus-energy`, `weather`.

### Push Notifications (APNs / FCM)

Push notification secrets are **not** in `.env` — they are set as Supabase Edge
Function secrets in the Dashboard (Settings → Edge Functions → Secrets):

| Secret | Description |
|---|---|
| `APNS_PRIVATE_KEY` | iOS push: PEM private key from Apple developer portal (.p8) |
| `APNS_KEY_ID` | 10-character Apple key ID |
| `APNS_TEAM_ID` | 10-character Apple team ID |
| `APNS_BUNDLE_ID` | App bundle identifier |
| `APNS_USE_SANDBOX` | `"true"` for development APNs, `"false"` for production |
| `FCM_PROJECT_ID` | Firebase project ID (Android/Web push) |
| `FCM_CLIENT_EMAIL` | Firebase service account email |
| `FCM_PRIVATE_KEY` | Firebase PEM private key |

---

## 🧪 Testing

### Unit Tests (Vitest)

```sh
# Run all unit tests once
npm run test

# Watch mode (re-runs on file changes)
npm run test:watch
```

62 unit tests cover the core hooks, API clients, utility libraries, and scene components.

### E2E & Visual Regression Tests (Playwright)

E2E tests live in `e2e/`. The Playwright config (`playwright.config.ts`) will start
the dev server automatically if it isn't already running.

```sh
# Run all e2e tests
npx playwright test

# Generate baseline VRT screenshots (first run, or after intentional visual changes)
npx playwright test e2e/scene-vrt.spec.ts --update-snapshots

# Run VRT regression check (compare against baselines)
npx playwright test e2e/scene-vrt.spec.ts
```

### Developer-Only UI Routes

| Route | Purpose |
|---|---|
| `/__scene-test` | Visual QA grid — renders `IntensityScene` at 7 device sizes with controls for intensity, theme, time of day, weather, and wind speed |
| `/__design-system` | Live design token reference, components, and accessibility audit |
| `/__turbine-test` | Isolated wind turbine animation test |

---

## 📱 Mobile Development (iOS)

1.  **Sync web assets to native**
    After making changes to the React code, build and sync:
    ```sh
    npm run build
    npx cap sync ios
    ```

2.  **Open in Xcode**
    ```sh
    npx cap open ios
    ```

3.  **Run on Device/Simulator**
    *   Select your target device in Xcode.
    *   Press **Play** (Cmd+R).
    *   *Note: Native plugins (like Notifications) require running on a real device or compiled simulator build.*

## 📱 Developer Structure

*   `src/pages`: Main application screens (Index, Planner, History, Settings, Glossary, Help, FeatureGuides). Internal reference routes: `/__design-system` (live tokens, components, accessibility — see [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)), `/__scene-test`, `/__turbine-test`.
*   `src/components`: Reusable UI blocks and Widgets.
    *   `src/components/scene`: Interactive scene elements (Landscape, Sheep, CarrotEvents).
    *   Error boundaries (ComponentErrorBoundary, ErrorBoundary, ErrorState) for robust error handling.
    *   `SplashScreen.tsx`: Professional branded loading screen.
    *   `TurbineLogo.tsx`: Animated turbine logo component.
*   `src/lib`:
    *   `carbonApi.ts`: Carbon Intensity API fetchers.
    *   `logger.ts`: Centralized logging utility with Sentry integration.
    *   `energyFacts.ts`: 60+ contextual energy insights with smart filtering.
    *   `energy-standards.ts`: UK house types and consumption data.
    *   `impact-conversions.ts`: Real-world CO₂ equivalency conversions.
*   `src/hooks`: Custom React hooks (useCarbonData, useOctopusEnergy, useCoalFreeStreak, useSettings, useEnergyFacts, useNotifications).
*   `ios/App/GridSenseWidget`: Native Swift code for the iOS Widget.

## 📄 License

This project is open-source and available under the MIT License.
