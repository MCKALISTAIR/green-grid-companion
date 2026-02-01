
import { ForecastData } from './carbonApi';

export type FactCategory =
    | 'clean_energy'
    | 'dirty_energy'
    | 'windy'
    | 'night'
    | 'solar'
    | 'general'
    | 'rain'
    | 'cold';

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
}

export const ENERGY_FACTS: EnergyFact[] = [
    // --- LOW CARBON (< 50g) ---
    {
        id: 'clean_snark_1',
        text: "The grid is cleaner than my search history right now.",
        category: 'clean_energy',
        tone: 'snarky',
        condition: (c) => c.intensity < 50
    },
    {
        id: 'clean_snark_2',
        text: "Basically breathing pure oxygen. Go charge everything.",
        category: 'clean_energy',
        tone: 'snarky',
        condition: (c) => c.intensity < 50
    },
    {
        id: 'clean_snark_3',
        text: "Carbon levels are lower than a limbo champion.",
        category: 'clean_energy',
        tone: 'snarky',
        condition: (c) => c.intensity < 50
    },
    {
        id: 'clean_friendly_1',
        text: "Great news! The grid is running on ultra-low carbon energy.",
        category: 'clean_energy',
        tone: 'friendly',
        condition: (c) => c.intensity < 50
    },
    {
        id: 'clean_friendly_2',
        text: "It's a perfect time to run high-energy appliances.",
        category: 'clean_energy',
        tone: 'friendly',
        condition: (c) => c.intensity < 50
    },

    // --- MEDIUM/HIGH CARBON (> 200g) ---
    {
        id: 'dirty_snark_1',
        text: "The grid is coughing. Maybe unplug the toaster?",
        category: 'dirty_energy',
        tone: 'snarky',
        condition: (c) => c.intensity > 200
    },
    {
        id: 'dirty_snark_2',
        text: "Coal is having a party and you're paying for it.",
        category: 'dirty_energy',
        tone: 'snarky',
        condition: (c) => c.intensity > 200
    },
    {
        id: 'dirty_snark_3',
        text: "Eww. The electricity is spicy today.",
        category: 'dirty_energy',
        tone: 'snarky',
        condition: (c) => c.intensity > 200
    },
    {
        id: 'dirty_friendly_1',
        text: "Carbon intensity is high right now. Try to save energy if you can.",
        category: 'dirty_energy',
        tone: 'friendly',
        condition: (c) => c.intensity > 200
    },
    {
        id: 'dirty_friendly_2',
        text: "Consider delaying your dishwasher run until the grid cleans up.",
        category: 'dirty_energy',
        tone: 'friendly',
        condition: (c) => c.intensity > 200
    },

    // --- WINDY (> 15mph) ---
    {
        id: 'windy_snark_1',
        text: "It's blowing a hooley! Wind turbines are going Brrr.",
        category: 'windy',
        tone: 'snarky',
        condition: (c) => c.windSpeed > 15
    },
    {
        id: 'windy_snark_2',
        text: "Free energy falling from the sky (sideways).",
        category: 'windy',
        tone: 'snarky',
        condition: (c) => c.windSpeed > 15
    },
    {
        id: 'windy_snark_3',
        text: "RIP to anyone with an umbrella right now.",
        category: 'windy',
        tone: 'snarky',
        condition: (c) => c.windSpeed > 20
    },
    {
        id: 'windy_friendly_1',
        text: "High winds mean plenty of renewable energy from turbines today.",
        category: 'windy',
        tone: 'friendly',
        condition: (c) => c.windSpeed > 15
    },
    {
        id: 'windy_friendly_2',
        text: "Wind farms generate significant power during gusty weather like this.",
        category: 'windy',
        tone: 'friendly',
        condition: (c) => c.windSpeed > 15
    },

    // --- NIGHT ---
    {
        id: 'night_snark_1',
        text: "The sun is sleeping, but the nuclear plants are caffeinated.",
        category: 'night',
        tone: 'snarky',
        condition: (c) => !c.isDay
    },
    {
        id: 'night_snark_2',
        text: "Dark mode enabled. Vampires love this grid status.",
        category: 'night',
        tone: 'snarky',
        condition: (c) => !c.isDay
    },
    {
        id: 'night_friendly_1',
        text: "Base load power like nuclear keeps the lights on while we sleep.",
        category: 'night',
        tone: 'friendly',
        condition: (c) => !c.isDay
    },

    // --- GENERAL / RANDOM ---
    {
        id: 'general_snark_1',
        text: "The UK hasn't burned coal for 0 days... oh wait.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'general_snark_2',
        text: "If you're reading this, go drink some water.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'general_snark_3',
        text: "Generating electricity is hard. Don't waste it.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'general_friendly_1',
        text: "Did you know? A single wind turbine can power 1,500 homes.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_2',
        text: "Switching to LEDs can save up to 75% lighting energy.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_3',
        text: "Shifting usage to off-peak times helps balance the grid.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_4',
        text: "The MySE 16-260 wind turbine stands 242m tall - that's taller than the Golden Gate Bridge towers!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_5',
        text: "In 2020, the UK went a record-breaking 67 days, 22 hours without burning any coal.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_6',
        text: "The Hornsea 2 offshore wind farm covers an area larger than the Maldives!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_7',
        text: "Scotland generates enough renewable energy to power all its homes twice over.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_8',
        text: "One rotation of a giant wind turbine can power a UK home for an entire day.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_9',
        text: "The UK's first offshore wind farm opened in 2000 with just 2 turbines. Now we have thousands!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_10',
        text: "Solar panels in the UK generate enough electricity to power 4 million homes.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_11',
        text: "Nuclear power plants can run continuously for 18-24 months before refueling.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_12',
        text: "The UK achieved its first coal-free day in over 130 years on April 21, 2017.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_13',
        text: "Wind turbines can operate at over 95% availability throughout their lifetime.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_14',
        text: "Renewable energy created over 44,000 jobs in the UK renewable electricity sector.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_15',
        text: "A single offshore wind turbine blade can be longer than a football pitch!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_16',
        text: "The UK has the world's largest installed offshore wind capacity.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_17',
        text: "Tidal power is predictable up to 100 years in advance - unlike wind or solar!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_18',
        text: "UK renewable energy capacity has quadrupled in the last decade.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_19',
        text: "Modern wind turbines can generate power at wind speeds as low as 7 mph.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'general_friendly_20',
        text: "Hydroelectric dams can switch from zero to full power in just 90 seconds!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'coal_free_record',
        text: "The UK's record coal-free run was 67 days, 22 hours in 2020.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    // Note: coal_free_current fact will be added dynamically by useEnergyFacts hook
];

export function getRandomFact(context: FactContext, tonePref: 'snarky' | 'friendly' | 'mixed' = 'mixed'): EnergyFact {
    // 1. Filter by tone
    let eligible = ENERGY_FACTS;
    if (tonePref !== 'mixed') {
        eligible = eligible.filter(f => f.tone === tonePref);
    }

    // 2. Filter by condition
    eligible = eligible.filter(f => !f.condition || f.condition(context));

    // 3. Fallback if empty (shouldn't happen with general facts, but safety first)
    if (eligible.length === 0) {
        return {
            id: 'fallback',
            text: "Save energy, save money.",
            category: 'general',
            tone: 'friendly'
        };
    }

    // 4. Random pick
    return eligible[Math.floor(Math.random() * eligible.length)];
}
