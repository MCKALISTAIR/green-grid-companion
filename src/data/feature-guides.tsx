import { Home, Zap, Calendar, Bell, Map, LineChart, Plug, MapPin } from 'lucide-react';

export const FEATURE_GUIDES = [
  {
    id: 'home-dashboard',
    title: 'Home',
    icon: Home,
    description: 'What the scene, numbers and colours mean',
    content: (
      <div className="space-y-4">
        <p>
          <strong>Home</strong> shows you how clean the grid is right now, at a glance.
        </p>

        <h3 className="text-lg font-semibold pt-2">The Dynamic Scene</h3>
        <p>The background scene isn&apos;t just pretty. It moves with the data.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Clean grid (green/blue sky):</strong> When carbon intensity is low (lots of wind
            or solar), the scene is bright and clear.
          </li>
          <li>
            <strong>Dirty grid (orange/grey):</strong> When fossil fuels are doing most of the work,
            the scene gets hazier and darker.
          </li>
          <li>
            <strong>Wind Turbines:</strong> Their speed reflects how much of the current mix comes
            from wind. Fast spinning means wind is supplying a lot of power!
          </li>
        </ul>

        <h3 className="text-lg font-semibold pt-2">Reading the Numbers</h3>
        <p>
          The big number in the middle is the <strong>carbon intensity</strong>, in gCO₂/kWh.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>0-50 (Very Low):</strong> Excellent time to use energy.
          </li>
          <li>
            <strong>50-100 (Low):</strong> Good time for most tasks.
          </li>
          <li>
            <strong>100-200 (Moderate):</strong> Average mix of renewables and gas.
          </li>
          <li>
            <strong>200+ (High):</strong> Try to save energy if possible.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'carbon-intensity',
    title: 'Carbon Intensity Explained',
    icon: Zap,
    description: "What it means, how it's calculated, and why it matters",
    content: (
      <div className="space-y-4">
        <p>
          <strong>Carbon Intensity</strong> is a measure of how much carbon dioxide (CO₂) is
          released to produce one kilowatt-hour (kWh) of electricity.
        </p>

        <h3 className="text-lg font-semibold pt-2">Why does it change?</h3>
        <p>The electricity grid uses a mix of sources:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Renewables (Wind, Solar, Hydro):</strong> Produce almost zero CO₂. When these
            are active, intensity drops.
          </li>
          <li>
            <strong>Nuclear:</strong> Low carbon, provides steady baseload power.
          </li>
          <li>
            <strong>Gas & Coal:</strong> Burn fossil fuels and release CO₂. These are used when
            demand is high or renewables are low.
          </li>
        </ul>

        <p>
          By checking GridSense, you can choose to use electricity when the grid is powered by wind
          and sun, rather than gas. This is called <strong>load shifting</strong>, and it massively
          reduces your personal carbon footprint.
        </p>
      </div>
    ),
  },
  {
    id: 'power-planner',
    title: 'Power Planner',
    icon: Calendar,
    description: 'Find the best times to charge devices and run appliances',
    content: (
      <div className="space-y-4">
        <p>
          The <strong>Power Planner</strong> finds the cleanest time to run your big appliances.
        </p>

        <h3 className="text-lg font-semibold pt-2">How to use it</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Tap the <strong>Plan</strong> tab at the bottom.
          </li>
          <li>Pick an appliance (like EV Charge or Washing).</li>
          <li>
            GridSense finds the <strong>best time to run</strong> from the next 24-48 hours of
            forecast.
          </li>
          <li>
            Tap <strong>"Remind me"</strong> to get a notification 15 minutes before the window
            starts.
          </li>
        </ol>

        <p className="text-sm text-muted-foreground pt-2">
          <strong>Tip:</strong> You can add your own appliance with its own run time and power.
        </p>
      </div>
    ),
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    description: 'Set up alerts and choose what you hear about',
    content: (
      <div className="space-y-4">
        <p>Let GridSense tell you when it matters, so you don&apos;t have to keep checking.</p>

        <h3 className="text-lg font-semibold pt-2">Types of Alerts</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Daily Energy Outlook:</strong> A morning rundown of today&apos;s cleanest times,
            like &quot;Best window: 10:00 to 14:00 (4h)&quot;.
          </li>
          <li>
            <strong>Avoid High Carbon Times:</strong> A heads-up when the grid gets dirty, so you
            can hold off big loads.
          </li>
          <li>
            <strong>Best Time to Use Energy:</strong> Tells you when the grid&apos;s clean. A good
            time to charge things, run the dishwasher or do the washing.
          </li>
        </ul>

        <p>
          Go to <strong>Settings &gt; Notifications</strong> to toggle these alerts and choose your
          preferred time for the daily outlook.
        </p>
      </div>
    ),
  },
  {
    id: 'leaderboard',
    title: 'Rank',
    icon: Map,
    description: 'Compare regions across the UK and understand rankings',
    content: (
      <div className="space-y-4">
        <p>
          See how your region compares to the rest of the UK with <strong>Rank</strong>.
        </p>

        <h3 className="text-lg font-semibold pt-2">Regional Ranking</h3>
        <p>Regions are ranked from lowest carbon intensity (cleanest) to highest.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Scotland & North:</strong> Often rank highly due to strong wind generation.
          </li>
          <li>
            <strong>South & Cities:</strong> May have higher intensity depending on local generation
            mix and demand.
          </li>
        </ul>

        <p>
          Tap the <strong>map icon</strong> (top right) to see each region&apos;s carbon intensity
          on a map.
        </p>
      </div>
    ),
  },
  {
    id: 'history',
    title: 'History & Trends',
    icon: LineChart,
    description: 'Look back at patterns and compare periods',
    content: (
      <div className="space-y-4">
        <p>
          The <strong>History</strong> tab shows how the grid did, over 24 hours or 7 days.
        </p>

        <h3 className="text-lg font-semibold pt-2">Charts</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>24 hours:</strong> How intensity changed, hour by hour.
          </li>
          <li>
            <strong>7 days:</strong> How the last week went, day by day.
          </li>
        </ul>

        <p>Handy for spotting daily and seasonal patterns where you live.</p>
      </div>
    ),
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Plug,
    description: 'Connect Octopus Energy for real meter-based footprint',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Octopus Energy</h3>
        <p>
          Link your Octopus account to pull in your smart meter&apos;s half-hourly usage. We work
          out your real footprint, and a Green Score for how much of it landed in cleaner hours.
        </p>
      </div>
    ),
  },
  {
    id: 'saved-locations',
    title: 'Saved Locations',
    icon: MapPin,
    description: 'Keep a few places handy and switch between them',
    content: (
      <div className="space-y-4">
        <p>Keep an eye on the grid in more than one place, like home, work or family.</p>

        <h3 className="text-lg font-semibold pt-2">Adding a Location</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Tap your current location name on Home.</li>
          <li>Search for a new postcode or town.</li>
          <li>
            After selecting, you'll see an option to <strong>"Save this location"</strong>.
          </li>
        </ol>

        <p>Switch between them any time, handy for checking the grid where your family live.</p>
      </div>
    ),
  },
];
