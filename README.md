# GridSense

GridSense is a mobile-first companion app designed to help UK (and future) energy consumers make smarter decisions about their electricity usage. By tracking real-time and forecast carbon intensity data, it empowers users to shift their energy consumption to greener times, reducing their carbon footprint.

## 🌟 Key Features

### 🏠 Dynamic Home Screen
*   **Real-time Carbon Intensity**: Visualises the current grid status.
*   **Energy Insights**: Smart, data-driven advice at the top of the feed (e.g. "Wait until 2pm for cleaner energy").
*   **Immersive Scenes**: A dynamic background that changes based on air quality/cleanliness.
*   **iOS Home Screen Widget**: Check live carbon intensity directly from your home screen.

### ⚡ Power Planner
*   **Smart Scheduling**: Plan usage for EVs, Washing Machines, and custom appliances.
*   **Carbon Savings**: Quantified impact (e.g. "Save 120g CO₂ vs Now").
*   **Fixed View**: Distraction-free, single-screen experience.

### 📊 Data History
*   **Comprehensive Charts**: View carbon intensity trends over the last **24 hours** or **7 days**.
*   **Stats**: Track average intensity and performance trends.

### 🏆 Leaderboard (formerly Map)
*   **Regional Ranking**: See a live leaderboard of the greenest UK regions.
*   **Dot Map**: An interactive, geographically accurate dot map (toggleable) showing real-time intensity across the country.

### ⚙️ Settings & Integrations
*   **Smart Alerts**: Configurable notifications for low-carbon windows.
*   **Live Accuracy Mode**: Optional **Background Fetch** support to check real-time grid data periodically (offline-first by default).
*   **Integrations**: Link **Octopus Energy** and **Tesla** accounts for personalized insights and automation (Coming Soon).

## 🛠️ Technology Stack

*   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Mobile Engine**: [Capacitor](https://capacitorjs.com/) (iOS & Android)
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

*   `src/pages`: Main application screens (Index, Planner, History, Settings).
*   `src/components`: Reusable UI blocks and Widgets.
*   `src/lib/carbonApi.ts`: Types and fetchers for the Carbon Intensity API.
*   `src/hooks`: Custom React hooks (useCarbonData, useNotifications).
*   `ios/App/GridSenseWidget`: Native Swift code for the iOS Widget.

## 📄 License

This project is open-source and available under the MIT License.
