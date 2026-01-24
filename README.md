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
*   **Tesla Integration**: Coming Soon.

## 🆕 Recent Updates (2026-01-24)

### Performance Improvements ⚡
*   **Instant Tab Switching**: 80-95% faster loading with smart data caching
*   **Optimized Queries**: Enhanced React Query cache configurations across all pages
*   **Better User Experience**: Professional skeleton loaders replace spinners

### New Features
*   **Weather Widget Controls**: Hide/show local conditions with one click
*   **Green Energy Score Info**: Detailed popover explaining score calculation and ratings
*   **Footprint Onboarding**: Always-visible Footprint tab with comprehensive setup guide
*   **Octopus Settings Management**: Three-dot menu for sync, account switching, and disconnect
*   **Test Notifications**: Verify your notification setup is working correctly
*   **Persistent Custom Appliances**: Your Power Planner settings save automatically


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

*   `src/pages`: Main application screens (Index, Planner, History, Settings, Glossary).
*   `src/components`: Reusable UI blocks and Widgets.
    *   `src/components/scene`: Interactive scene elements (Landscape, Sheep, CarrotEvents).
    *   Error boundaries (ComponentErrorBoundary, ErrorBoundary, ErrorState) for robust error handling.
*   `src/lib/carbonApi.ts`: Types and fetchers for the Carbon Intensity API.
*   `src/hooks`: Custom React hooks (useCarbonData, useNotifications, useOctopusEnergy).
*   `ios/App/GridSenseWidget`: Native Swift code for the iOS Widget.

## 📄 License

This project is open-source and available under the MIT License.
