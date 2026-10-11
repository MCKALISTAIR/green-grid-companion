import { Home, Zap, Calendar, Bell, Map, LineChart, Plug, MapPin } from 'lucide-react';

export const FEATURE_GUIDES = [
    {
        id: 'home-dashboard',
        title: 'Home Dashboard',
        icon: Home,
        description: 'Understanding the intensity scene, reading data, and interpreting colors',
        content: (
            <div className="space-y-4">
                <p>
                    The <strong>Home Dashboard</strong> is your main command center for understanding the current energy status of the grid.
                </p>

                <h3 className="text-lg font-semibold pt-2">The Dynamic Scene</h3>
                <p>
                    The background scene isn't just pretty—it's data-driven!
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Clean Energy (Green/Blue Sky):</strong> When the carbon intensity is low (lots of wind/solar), the scene is bright, clean, and vibrant.</li>
                    <li><strong>Dirty Energy (Orange/Grey):</strong> When fossil fuels are dominating, the scene becomes hazier or darker to reflect the higher pollution levels.</li>
                    <li><strong>Wind Turbines:</strong> Their rotation speed matches real-time utilization. Fast spinning means wind is generating a lot of power!</li>
                </ul>

                <h3 className="text-lg font-semibold pt-2">Reading the Numbers</h3>
                <p>
                    The large number in the center is the <strong>Carbon Intensity</strong> in gCO₂/kWh.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>0-50 (Very Low):</strong> Excellent time to use energy.</li>
                    <li><strong>50-100 (Low):</strong> Good time for most tasks.</li>
                    <li><strong>100-200 (Moderate):</strong> Average mix of renewables and gas.</li>
                    <li><strong>200+ (High):</strong> Try to save energy if possible.</li>
                </ul>
            </div>
        )
    },
    {
        id: 'carbon-intensity',
        title: 'Carbon Intensity Explained',
        icon: Zap,
        description: "What it means, how it's calculated, and why it matters",
        content: (
            <div className="space-y-4">
                <p>
                    <strong>Carbon Intensity</strong> is a measure of how much carbon dioxide (CO₂) is released to produce one kilowatt-hour (kWh) of electricity.
                </p>

                <h3 className="text-lg font-semibold pt-2">Why does it change?</h3>
                <p>
                    The electricity grid uses a mix of sources:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Renewables (Wind, Solar, Hydro):</strong> Produce almost zero CO₂. When these are active, intensity drops.</li>
                    <li><strong>Nuclear:</strong> Low carbon, provides steady baseload power.</li>
                    <li><strong>Gas & Coal:</strong> Burn fossil fuels and release CO₂. These are used when demand is high or renewables are low.</li>
                </ul>

                <p>
                    By checking GridSense, you can choose to use electricity when the grid is powered by wind and sun, rather than gas. This is called <strong>load shifting</strong>, and it massively reduces your personal carbon footprint.
                </p>
            </div>
        )
    },
    {
        id: 'power-planner',
        title: 'Power Planner',
        icon: Calendar,
        description: 'Find the best times to charge devices and run appliances',
        content: (
            <div className="space-y-4">
                <p>
                    The <strong>Power Planner</strong> helps you schedule high-energy tasks for the greenest times of day.
                </p>

                <h3 className="text-lg font-semibold pt-2">How to use it</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Tap the <strong>Plan</strong> tab at the bottom.</li>
                    <li>Select an appliance (e.g., EV Charge, Washing Machine).</li>
                    <li>The app will instantly calculate the <strong>Best Time to Run</strong> based on the next 24-48 hours of forecast data.</li>
                    <li>Tap <strong>"Remind me"</strong> to get a notification 15 minutes before the window starts.</li>
                </ol>

                <p className="text-sm text-muted-foreground pt-2">
                    <strong>Pro Tip:</strong> You can also create "Custom" tasks with specific durations and power usage.
                </p>
            </div>
        )
    },
    {
        id: 'notifications',
        title: 'Notifications',
        icon: Bell,
        description: 'Set up alerts and customize notification preferences',
        content: (
            <div className="space-y-4">
                <p>
                    Stay informed without constantly checking the app by setting up smart notifications.
                </p>

                <h3 className="text-lg font-semibold pt-2">Types of Alerts</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Daily Energy Outlook:</strong> A morning summary showing best times to use energy and the longest green window (e.g., "Best window: 10:00-14:00 (4h)").</li>
                    <li><strong>Avoid High Carbon Times:</strong> Warns you when the grid gets dirty so you can delay heavy appliance use.</li>
                    <li><strong>Best Time to Use Energy:</strong> Notifies you when clean energy is abundant—perfect for charging devices, running the dishwasher, or doing laundry!</li>
                </ul>

                <p>
                    Go to <strong>Settings &gt; Notifications</strong> to toggle these alerts and choose your preferred time for the daily outlook.
                </p>
            </div>
        )
    },
    {
        id: 'leaderboard',
        title: 'Leaderboard',
        icon: Map,
        description: 'Compare regions across the UK and understand rankings',
        content: (
            <div className="space-y-4">
                <p>
                    See how your region compares to the rest of the UK with the <strong>Leaderboard</strong>.
                </p>

                <h3 className="text-lg font-semibold pt-2">Regional Ranking</h3>
                <p>
                    Regions are ranked from lowest carbon intensity (cleanest) to highest.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Scotland & North:</strong> Often rank highly due to strong wind generation.</li>
                    <li><strong>South & Cities:</strong> May have higher intensity depending on local generation mix and demand.</li>
                </ul>

                <p>
                    Tap the <strong>Map Icon</strong> (top right) to verify the live generation map provided by NESO.
                </p>
            </div>
        )
    },
    {
        id: 'history',
        title: 'History & Trends',
        icon: LineChart,
        description: 'Analyze patterns over time and compare periods',
        content: (
            <div className="space-y-4">
                <p>
                    The <strong>History</strong> tab visualizes how the grid has performed over the last 24 hours to 30 days.
                </p>

                <h3 className="text-lg font-semibold pt-2">Charts</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>24h View:</strong> Detailed breakdown of intensity changes hour-by-hour.</li>
                    <li><strong>30 Day Trend:</strong> See the bigger picture—was this week greener than last week?</li>
                </ul>

                <p>
                    Use this data to understand seasonal or daily patterns in your local grid.
                </p>
            </div>
        )
    },
    {
        id: 'integrations',
        title: 'Integrations',
        icon: Plug,
        description: 'Connect Octopus Energy for real meter-based footprint',
        content: (
            <div className="space-y-4">
                <p>
                    Supercharge GridSense by connecting your energy account.
                </p>

                <h3 className="text-lg font-semibold pt-2">Octopus Energy</h3>
                <p>
                    Connect your Octopus account to sync smart-meter consumption and calculate your <strong>real carbon footprint</strong> and Green Score from timing — not just how much you use.
                </p>
            </div>
        )
    },
    {
        id: 'saved-locations',
        title: 'Saved Locations',
        icon: MapPin,
        description: 'Manage multiple regions and quick switching',
        content: (
            <div className="space-y-4">
                <p>
                    Track the grid status for multiple places—like home, work, or family members' homes.
                </p>

                <h3 className="text-lg font-semibold pt-2">Adding a Location</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Tap your current location name on the Home screen.</li>
                    <li>Search for a new postcode or town.</li>
                    <li>After selecting, you'll see an option to <strong>"Save this location"</strong>.</li>
                </ol>

                <p>
                    You can switch between saved locations seamlessly to check if it's a good time for your family to use energy elsewhere!
                </p>
            </div>
        )
    }
];
