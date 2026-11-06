import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { DataAttribution } from '@/components/attribution/DataAttribution';
import { NI_ALL_ISLAND_GRID } from '@/lib/voice/errorStatesCopy';
import { OCTOPUS_API_PAGE_URL, OCTOPUS_HELP_COPY } from '@/lib/voice/octopusLinkCopy';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 25 } },
};

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="bg-background lg:pb-6">
      <motion.div
        className="p-4 pt-[calc(max(env(safe-area-inset-top),59px)+1rem)] max-w-2xl mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="-ml-4 hover:translate-x-[-2px] transition-transform duration-200"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold">Help & Tips</h1>
          <p className="text-muted-foreground">Quick answers to common questions</p>
        </motion.div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          <motion.div variants={itemVariants}>
            <AccordionItem
              value="getting-started"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Getting Started</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>What is GridSense?</strong>
                  </p>
                  <p>
                    GridSense shows carbon intensity data for the GB electricity grid, updated every
                    half hour, so you can use power when it&apos;s cleanest.
                  </p>

                  <p className="pt-2">
                    <strong>How do I change my region?</strong>
                  </p>
                  <p>
                    Tap the region name at the top of the intensity card on Home. You can search by
                    postcode, town name, or use your current location.
                  </p>

                  <p className="pt-2">
                    <strong>What do the numbers mean?</strong>
                  </p>
                  <p>
                    The main number is grams of CO₂ per kilowatt-hour (gCO₂/kWh). Lower is cleaner.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="understanding-data"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Understanding Your Data</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Intensity Levels:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Very Low</strong>: A great time for big loads
                    </li>
                    <li>
                      <strong>Low</strong>: A good time for big loads
                    </li>
                    <li>
                      <strong>Moderate</strong>: Average carbon intensity
                    </li>
                    <li>
                      <strong>High</strong>: Worth waiting if you can
                    </li>
                    <li>
                      <strong>Very High</strong>: Hold off if you can
                    </li>
                  </ul>
                  <p className="text-muted-foreground">
                    These bands come from NESO&apos;s Carbon Intensity API. NESO sets the gCO₂/kWh
                    thresholds and lowers them over time as the grid gets cleaner, so the same
                    number can land in a different band from one year to the next.
                  </p>

                  <p className="pt-2">
                    <strong>How often does data update?</strong>
                  </p>
                  <p>NESO updates the data every 30 minutes. Pull down on Home to refresh.</p>

                  <p className="pt-2">
                    <strong>Where does the data come from?</strong>
                  </p>
                  <DataAttribution className="text-muted-foreground" />

                  <p className="pt-2">
                    <strong>Why do regions differ?</strong>
                  </p>
                  <p>
                    GB&apos;s grid is split into regions with different generation mixes. Windy
                    Scotland often has lower intensity than areas leaning on gas.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="interactive-features"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Interactive Features</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Navigation:</strong>
                  </p>
                  <p>
                    Swipe or tap the tabs at the bottom to get to Plan, History, Rank and Settings.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="notifications"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Notifications</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>How do I set up alerts?</strong>
                  </p>
                  <p>
                    Go to Settings → Notifications. Turn on low intensity alerts for a nudge when
                    the grid&apos;s clean, or high intensity alerts for a warning when it&apos;s
                    dirty.
                  </p>

                  <p className="pt-2">
                    <strong>What are daily forecasts?</strong>
                  </p>
                  <p>
                    A summary of the day&apos;s forecast, sent each morning at a time you choose.
                  </p>

                  <p className="pt-2">
                    <strong>Why aren't I receiving notifications?</strong>
                  </p>
                  <p>
                    On iOS: Settings → GridSense → Notifications. On web: allow notifications in the
                    browser for this site, then refresh. And check the alerts are switched on in the
                    app.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="data-accuracy"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Where the numbers come from</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Live readings</strong>
                  </p>
                  <p>
                    Carbon intensity comes from NESO. For a region, the live number is always
                    NESO&apos;s forecast, a modelled estimate. For Great Britain as a whole, we show
                    NESO&apos;s after-the-fact figure once it&apos;s published, otherwise its
                    forecast. That figure is also an estimate, worked out from metered power
                    stations plus NESO&apos;s estimate of small-scale solar and wind. Forecasts can
                    change.
                  </p>

                  <p className="pt-2">
                    <strong>What does "Estimate" mean?</strong>
                  </p>
                  <p>
                    NESO doesn&apos;t publish after-the-fact figures for regions, so past regional
                    readings are worked out by GridSense from the fuel mix. They're marked
                    "Estimate" and aren't NESO figures.
                  </p>

                  <p className="pt-2">
                    <strong>Northern Ireland</strong>
                  </p>
                  <p>
                    {NI_ALL_ISLAND_GRID} For BT postcodes, we&apos;ll show the GB average instead.
                  </p>

                  <p className="pt-2">
                    <strong>Footprint and Green Score</strong>
                  </p>
                  <p>
                    Without a linked smart meter, your footprint is a rough benchmark from Ofgem
                    typical usage for your home size. Your Green Score needs a linked Octopus meter,
                    because it uses your real half-hourly usage. Both are guides only, not exact
                    measurements.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="power-planner"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Power Planner</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>How does it work?</strong>
                  </p>
                  <p>
                    The Power Planner shows the best and worst times to use power, from the
                    forecast. Green periods are good for charging or running appliances.
                  </p>

                  <p className="pt-2">
                    <strong>Planning strategies:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Run the dishwasher and washing machine in green periods</li>
                    <li>Charge EVs and devices overnight when intensity is low</li>
                    <li>Hold off big loads in the red, dirtiest times</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="saved-locations"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Saved Locations</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>How do I save locations?</strong>
                  </p>
                  <p>
                    When changing your region, look for the "Save as..." option after selecting a
                    region. Give it a name like "Home" or "Work" for quick access.
                  </p>

                  <p className="pt-2">
                    <strong>Managing saved locations:</strong>
                  </p>
                  <p>
                    In Settings, open &quot;Manage Locations&quot; to rename or delete saved places.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="troubleshooting"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Troubleshooting</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Data not updating:</strong>
                  </p>
                  <p>Pull down to refresh. Still stuck? Check your internet connection.</p>

                  <p className="pt-2">
                    <strong>Scene not loading:</strong>
                  </p>
                  <p>
                    Try restarting the app. The animated scene is quite demanding, so it may be
                    simplified on older devices.
                  </p>

                  <p className="pt-2">
                    <strong>Integration issues:</strong>
                  </p>
                  <p>{OCTOPUS_HELP_COPY.troubleshooting}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="linking-octopus"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>{OCTOPUS_HELP_COPY.itemTitle}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>{OCTOPUS_HELP_COPY.need}</p>
                  <p>
                    {OCTOPUS_HELP_COPY.apiKey}{' '}
                    <a
                      href={OCTOPUS_API_PAGE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="tap-target font-medium text-primary underline"
                    >
                      {OCTOPUS_HELP_COPY.apiKeyLink}
                    </a>
                  </p>
                  <p>{OCTOPUS_HELP_COPY.account}</p>
                  <p>{OCTOPUS_HELP_COPY.electricityOnly}</p>
                  <p>{OCTOPUS_HELP_COPY.noUsage}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AccordionItem
              value="privacy"
              className="border rounded-lg px-3 bg-card/40 hover:bg-card/70 transition-colors duration-200"
            >
              <AccordionTrigger>Privacy & Data</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>What data do you collect?</strong>
                  </p>
                  <p>
                    We use your location to find your grid region and local weather. We round it to
                    about 1 km before it leaves your device, and only keep the first half of your
                    postcode. Lookups go to postcodes.io and OpenStreetMap (region and place names),
                    Open-Meteo through our server (weather) and NESO&apos;s Carbon Intensity API
                    (postcode area only). If you sign in, your saved places sync to your account; if
                    you turn on alerts, we store your postcode area to send them.
                  </p>

                  <p className="pt-2">
                    <strong>Account data:</strong>
                  </p>
                  <p>
                    Octopus: you paste your account number and API key. The key is sent once over
                    HTTPS and stored encrypted on our servers (never on your device). Only our
                    server-side functions can decrypt it, and we use it only to fetch your meter
                    data. You can remove it at any time by disconnecting.
                  </p>

                  <p className="pt-2">
                    For full details, see our Privacy Policy in Settings → Resources.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        </Accordion>

        <motion.div
          variants={itemVariants}
          className="pt-6 text-center text-sm text-muted-foreground"
        >
          <p>
            Still need help? Check out our detailed{' '}
            <Button
              variant="link"
              onClick={() => navigate('/feature-guides')}
              className="h-auto p-0 hover:scale-105 transition-transform duration-200"
            >
              Feature Guides
            </Button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
