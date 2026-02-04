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
*   **Weather Widget**: Show/hide local weather conditions with persistent preferences.
*   **Custom Appliances**: Create and save custom appliances in Power Planner (persists between sessions).
*   **Tesla Integration**:
    *   **Vehicle Status**: View real-time battery level, range, and charging status for all your Tesla vehicles.
    *   **Energy Sites**: Monitor solar generation and Powerwall status.
    *   **Smart Charging Impact**: Track how much Carbon (CO₂) you've saved by charging during greener times compared to grid average.
    *   **Seamless Linking**: Secure OAuth connection to your Tesla account.

## 🆕 Recent Updates (v1.4.1 - 2026-02-04)

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
*   **Tesla Integration**: Full support for vehicles and energy sites with carbon impact tracking.
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
*   **Mobile Engine**: [Capacitor](https://capacitorjs.com/) (iOS & Android)
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

3.  **Run the web development server**
    ```sh
    npm run dev
    ```
    Visit `http://localhost:8080` to see the app in your browser.

### Mobile Development (iOS)

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

*   `src/pages`: Main application screens (Index, Planner, History, Settings, Glossary, Help, FeatureGuides).
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
*   `src/hooks`: Custom React hooks (useCarbonData, useTeslaEnergy, useOctopusEnergy, useCoalFreeStreak, useSettings, useEnergyFacts, useNotifications).
*   `ios/App/GridSenseWidget`: Native Swift code for the iOS Widget.

## 📄 License

This project is open-source and available under the MIT License.
