import {} from './carbonApi';

export type FactCategory =
  'clean_energy' | 'dirty_energy' | 'windy' | 'night' | 'solar' | 'general' | 'rain' | 'cold';

export type FactTone = 'snarky' | 'friendly';

export interface FactContext {
  intensity: number;
  windSpeed: number; // in mph or km/h (depending on source, usually km/h from open-meteo)
  isDay: boolean;
  generationMix?: { fuel: string; perc: number }[];
  isRaining?: boolean;
  isSnowing?: boolean;
  temperature?: number; // Celsius
}

export interface EnergyFact {
  id: string;
  text: string;
  category: FactCategory;
  tone: FactTone;
  condition?: (context: FactContext) => boolean;
  /**
   * Where the claim was checked (reputable source URL; several separated by " ; ").
   * Required for any line that states a number, date or record
   * (enforced by src/lib/energyFacts.test.ts). Unverified facts were removed.
   */
  source?: string;
}

export const ENERGY_FACTS: EnergyFact[] = [
  // --- LOW CARBON (< 50g) ---
  {
    id: 'clean_snark_1',
    text: 'The grid is cleaner than my search history right now.',
    category: 'clean_energy',
    tone: 'snarky',
    condition: (c) => c.intensity < 50,
  },
  {
    id: 'clean_snark_2',
    text: 'Basically breathing pure oxygen. Go charge everything.',
    category: 'clean_energy',
    tone: 'snarky',
    condition: (c) => c.intensity < 50,
  },
  {
    id: 'clean_snark_3',
    text: 'Carbon levels are lower than a limbo champion.',
    category: 'clean_energy',
    tone: 'snarky',
    condition: (c) => c.intensity < 50,
  },
  {
    id: 'clean_friendly_1',
    text: 'Great news! The grid is running on ultra-low carbon energy.',
    category: 'clean_energy',
    tone: 'friendly',
    condition: (c) => c.intensity < 50,
  },
  {
    id: 'clean_friendly_2',
    text: "It's a perfect time to run high-energy appliances.",
    category: 'clean_energy',
    tone: 'friendly',
    condition: (c) => c.intensity < 50,
  },

  // --- MEDIUM/HIGH CARBON (> 200g) ---
  {
    id: 'dirty_snark_1',
    text: 'The grid is coughing. Maybe unplug the toaster?',
    category: 'dirty_energy',
    tone: 'snarky',
    condition: (c) => c.intensity > 200,
  },
  {
    id: 'dirty_snark_3',
    text: 'Eww. The electricity is spicy today.',
    category: 'dirty_energy',
    tone: 'snarky',
    condition: (c) => c.intensity > 200,
  },
  {
    id: 'dirty_friendly_1',
    text: 'The grid is running dirtier than usual right now. Try to save energy if you can.',
    category: 'dirty_energy',
    tone: 'friendly',
    condition: (c) => c.intensity > 200,
  },
  {
    id: 'dirty_friendly_2',
    text: 'Consider delaying your dishwasher run until the grid cleans up.',
    category: 'dirty_energy',
    tone: 'friendly',
    condition: (c) => c.intensity > 200,
  },

  // --- WINDY (> 15mph) ---
  {
    id: 'windy_snark_1',
    text: "It's blowing a hooley! Wind turbines are going Brrr.",
    category: 'windy',
    tone: 'snarky',
    condition: (c) => c.windSpeed > 15,
  },
  {
    id: 'windy_snark_2',
    text: 'Free energy falling from the sky (sideways).',
    category: 'windy',
    tone: 'snarky',
    condition: (c) => c.windSpeed > 15,
  },
  {
    id: 'windy_snark_3',
    text: 'RIP to anyone with an umbrella right now.',
    category: 'windy',
    tone: 'snarky',
    condition: (c) => c.windSpeed > 20,
  },
  {
    id: 'windy_friendly_2',
    text: 'Wind farms generate significant power during gusty weather like this.',
    category: 'windy',
    tone: 'friendly',
    condition: (c) => c.windSpeed > 15,
  },

  // --- NIGHT ---
  {
    id: 'night_snark_1',
    text: 'The sun is sleeping, but the nuclear plants are caffeinated.',
    category: 'night',
    tone: 'snarky',
    condition: (c) => !c.isDay,
  },
  {
    id: 'night_snark_2',
    text: 'Dark mode enabled. Vampires love this grid status.',
    category: 'night',
    tone: 'snarky',
    condition: (c) => !c.isDay,
  },
  {
    id: 'night_friendly_1',
    text: 'Base load power like nuclear keeps the lights on while we sleep.',
    category: 'night',
    tone: 'friendly',
    condition: (c) => !c.isDay,
  },

  // --- GENERAL / RANDOM ---
  {
    id: 'general_snark_2',
    text: "If you're reading this, go drink some water.",
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },
  {
    id: 'general_snark_3',
    text: "Generating electricity is hard. Don't waste it.",
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },
  {
    id: 'general_friendly_3',
    text: 'Shifting usage to off-peak times helps balance the grid.',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'general_friendly_5',
    text: 'In 2020, Britain went a record 67 days, 22 hours and 55 minutes without coal power.',
    source:
      'https://www.nationalgrideso.com/news/record-breaking-2020-becomes-greenest-year-britains-electricity ; https://www.independent.co.uk/climate-change/news/coal-free-power-uk-record-time-2020-how-long-renewable-energy-a9570891.html',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'general_friendly_6',
    text: 'The Hornsea 2 offshore wind farm covers 462 km², more than the land area of the Maldives.',
    source:
      'https://cdn.orsted.com/-/media/www/docs/corp/uk/hornsea-project-two/hornsea-two-project-summary.pdf ; https://www.cia.gov/the-world-factbook/countries/maldives/',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'general_friendly_9',
    text: "Britain's first offshore wind farm, at Blyth, opened in 2000 with just 2 turbines.",
    source: 'https://en.wikipedia.org/wiki/Blyth_Offshore_Wind_Farm',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'general_friendly_11',
    text: 'Many nuclear reactors run for 18 to 24 months between refuelling outages.',
    source: 'https://www.eia.gov/todayinenergy/detail.php?id=37252',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'general_friendly_12',
    text: 'Britain had its first full day without coal power since 1882 on 21 April 2017.',
    source: 'https://www.bbc.co.uk/news/uk-39675418',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'coal_power_ended',
    text: "Britain's last coal power station, Ratcliffe-on-Soar, closed on 30 September 2024.",
    source: 'https://www.uniper.energy/united-kingdom/power-plants-united-kingdom/ratcliffe-soar',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  // --- ELECTRIC VEHICLES ---

  // --- HEAT PUMPS (Air Source) ---
  {
    id: 'ashp_friendly_1',
    text: 'Air source heat pumps deliver 3-4 kWh of heat for every 1 kWh of electricity used!',
    source: 'https://energysavingtrust.org.uk/advice/in-depth-guide-to-heat-pumps/',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'ashp_snark_1',
    text: 'Heat pumps are literally fridges running backwards. Science is wild.',
    source: 'https://energysavingtrust.org.uk/advice/in-depth-guide-to-heat-pumps/',
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },
  {
    id: 'ashp_snark_2',
    text: "300% efficient heating? Your GCSE physics teacher is screaming. But it's true.",
    source: 'https://energysavingtrust.org.uk/advice/in-depth-guide-to-heat-pumps/',
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },

  // --- GROUND SOURCE HEAT PUMPS ---

  // --- HOME ENERGY EFFICIENCY ---
  {
    id: 'efficiency_snark_1',
    text: 'Your old lightbulbs are basically tiny space heaters that happen to glow. Upgrade already.',
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },

  // --- BATTERY STORAGE & GRID BALANCING ---
  {
    id: 'battery_friendly_2',
    text: 'Home battery systems let you store cheap overnight electricity for daytime use.',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'battery_snark_1',
    text: 'Your EV is basically a giant battery on wheels. Why not use it to power your kettle?',
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },
  {
    id: 'battery_snark_2',
    text: "Grid batteries: because wind doesn't blow on demand. Revolutionary, I know.",
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },

  // --- HYDROELECTRIC POWER ---
  {
    id: 'hydro_friendly_1',
    text: 'Dinorwig power station can go from 0 to 1,728MW in about 16 seconds.',
    source:
      'https://www.power-technology.com/features/featuredinorwig-a-unique-power-plant-in-the-north-of-wales-5773187/',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'hydro_friendly_2',
    text: 'Pumped storage hydro is like a giant rechargeable battery using gravity and water.',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'hydro_snark_1',
    text: 'Dinorwig is carved inside a mountain. Because regular power stations are too mainstream.',
    source:
      'https://www.ice.org.uk/what-is-civil-engineering/infrastructure-projects/dinorwig-power-station',
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },
  {
    id: 'hydro_snark_2',
    text: "Pumped hydro: pump water uphill when power is cheap, release when it's expensive. Gravity wins.",
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },

  // --- DOMESTIC SOLAR PANELS ---
  {
    id: 'solar_domestic_snark_1',
    text: 'Your roof is just sitting there. Doing nothing. Put some panels on it already.',
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },
  {
    id: 'solar_domestic_snark_2',
    text: 'Solar panels work in the UK? Shocking. Almost like they need light, not heat.',
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },

  // --- SMART ENERGY USAGE ---

  // --- GRID INTERCONNECTORS ---
  {
    id: 'interconnector_2',
    text: 'The North Sea Link to Norway brings renewable hydro power to the UK via a 720km cable.',
    source: 'https://www.northsealink.com/north-sea-link/overview',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'interconnector_3',
    text: 'UK interconnectors help balance the grid - importing when we need it, exporting our surplus wind.',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'interconnector_4',
    text: 'ElecLink, one of the power links to France, runs through the Channel Tunnel.',
    source: 'https://www.eleclink.co.uk/about-us/what-we-do',
    category: 'general',
    tone: 'friendly',
    condition: () => true,
  },
  {
    id: 'interconnector_snark_1',
    text: "Giant undersea power cables to Europe. Brexit didn't stop electron migration.",
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },
  {
    id: 'interconnector_snark_2',
    text: "Why generate power when you can just import Norway's mountains? Smart.",
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },

  // --- EVERYDAY CARBON COMPARISONS ---
  {
    id: 'comparison_snark_2',
    text: "Leaving your laptop charger plugged in wastes power. It's not going to run away.",
    category: 'general',
    tone: 'snarky',
    condition: () => true,
  },

  // Note: coal_free_current fact will be added dynamically by useEnergyFacts hook
];

export function getRandomFact(
  context: FactContext,
  tonePref: 'snarky' | 'friendly' | 'mixed' = 'mixed',
  lastFactId?: string,
): EnergyFact {
  // 1. Filter by tone
  let eligible = [...ENERGY_FACTS];
  if (tonePref !== 'mixed') {
    eligible = eligible.filter((f) => f.tone === tonePref);
  }

  // 2. Filter by condition
  eligible = eligible.filter((f) => !f.condition || f.condition(context));

  // Dynamic insertion of active coal-free streak if eligible under friendly tone
  if (tonePref === 'friendly' || tonePref === 'mixed') {
    try {
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem('coal-free-streak') : null;
      if (stored) {
        const streakData = JSON.parse(stored);
        if (streakData && streakData.streakStarted) {
          const start = new Date(streakData.streakStarted);
          const current = new Date();
          const diffMs = current.getTime() - start.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours >= 24) {
            eligible.push({
              id: 'coal_free_current',
              text: 'The UK is running coal-free!',
              category: 'general',
              tone: 'friendly',
            });
          }
        }
      }
    } catch {
      // fail-silent
    }
  }

  // 3. Prevent duplicate consecutive selections
  if (lastFactId && eligible.length > 1) {
    const uniqueOptions = eligible.filter((f) => f.id !== lastFactId);
    if (uniqueOptions.length > 0) {
      eligible = uniqueOptions;
    }
  }

  // 4. Fallback if empty (shouldn't happen with general facts, but safety first)
  if (eligible.length === 0) {
    return {
      id: 'fallback',
      text: 'Save energy, save money.',
      category: 'general',
      tone: 'friendly',
    };
  }

  // 5. Random pick
  return eligible[Math.floor(Math.random() * eligible.length)];
}
