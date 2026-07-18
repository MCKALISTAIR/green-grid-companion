
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
    // --- ELECTRIC VEHICLES ---
    {
        id: 'ev_friendly_1',
        text: "EVs become greener than petrol cars after just 30,000 miles - including manufacturing!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ev_friendly_2',
        text: "Electric motors are 95% efficient vs petrol engines at just 20-30%. Physics wins.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ev_friendly_3',
        text: "Charging an EV overnight (7 hours) costs about £3-£5 for 200 miles of range.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ev_friendly_4',
        text: "An EV charged during low-carbon periods can emit 3x less CO₂ than the same journey in a petrol car.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ev_friendly_5',
        text: "Regenerative braking in EVs can recover up to 70% of energy when slowing down.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ev_friendly_6',
        text: "The average UK EV driver saves £1,000+ per year on fuel compared to petrol.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ev_snark_1',
        text: "Your EV uses the energy of a hairdryer to go a mile. Your petrol car? A bonfire.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'ev_snark_2',
        text: "EVs: 95% efficient. Petrol cars: 20% efficient. The other 80%? Literally just heat.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'ev_snark_3',
        text: "A full EV 'tank' costs less than a fancy coffee. Checkmate, fossil fuels.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- HEAT PUMPS (Air Source) ---
    {
        id: 'ashp_friendly_1',
        text: "Air source heat pumps deliver 3-4 kWh of heat for every 1 kWh of electricity used!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ashp_friendly_2',
        text: "Heat pumps work efficiently even at -15°C, making them perfect for UK winters.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ashp_friendly_3',
        text: "Switching from a gas boiler to a heat pump can cut your heating emissions by 70%.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ashp_friendly_4',
        text: "Heat pumps can both heat AND cool your home - perfect for those rare UK heatwaves!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'ashp_snark_1',
        text: "Heat pumps are literally fridges running backwards. Science is wild.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'ashp_snark_2',
        text: "300% efficient heating? Your GCSE physics teacher is screaming. But it's true.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- GROUND SOURCE HEAT PUMPS ---
    {
        id: 'gshp_friendly_1',
        text: "Ground source heat pumps can achieve 400% efficiency - 4x more heat than electricity used!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'gshp_friendly_2',
        text: "The ground stays a constant 10-15°C year-round, making GSHPs incredibly stable and efficient.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'gshp_friendly_3',
        text: "Ground source heat pump systems can last 50+ years with minimal maintenance.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'gshp_friendly_4',
        text: "GSHPs are virtually silent and invisible once installed - all the action is underground!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'gshp_snark_1',
        text: "Your garden is sitting on a free, infinite heat source. Ground source heat pumps: nature's cheat code.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'gshp_snark_2',
        text: "Ground source heat pumps: because why burn gas when you can harvest free underground warmth?",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- HOME ENERGY EFFICIENCY ---
    {
        id: 'efficiency_friendly_1',
        text: "LED bulbs use 75% less energy than traditional bulbs and last 25x longer!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'efficiency_friendly_2',
        text: "Proper loft insulation can save £355/year and prevent 1 tonne of CO₂ emissions.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'efficiency_friendly_3',
        text: "A smart thermostat can reduce heating bills by 20-30% through automated scheduling.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'efficiency_friendly_4',
        text: "Switching one bulb to LED saves £7/year and 40kg CO₂ - imagine your whole house!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'efficiency_snark_1',
        text: "Your old lightbulbs are basically tiny space heaters that happen to glow. Upgrade already.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'efficiency_snark_2',
        text: "Leaving your TV on standby all year wastes £80. That's like 16 fancy coffees. You monster.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- BATTERY STORAGE & GRID BALANCING ---
    {
        id: 'battery_friendly_1',
        text: "The UK's largest battery storage facility can power 300,000 homes for 2 hours!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'battery_friendly_2',
        text: "Home battery systems let you store cheap overnight electricity for daytime use.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'battery_friendly_3',
        text: "Vehicle-to-Grid (V2G) technology lets your EV power your home during peak times!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'battery_friendly_4',
        text: "Grid-scale batteries respond to frequency changes in milliseconds, keeping the lights on.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'battery_snark_1',
        text: "Your EV is basically a giant battery on wheels. Why not use it to power your kettle?",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'battery_snark_2',
        text: "Grid batteries: because wind doesn't blow on demand. Revolutionary, I know.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- HYDROELECTRIC POWER ---
    {
        id: 'hydro_friendly_1',
        text: "Dinorwig power station can go from 0 to 1,800MW in just 16 seconds - Europe's fastest!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'hydro_friendly_2',
        text: "Pumped storage hydro is like a giant rechargeable battery using gravity and water.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'hydro_friendly_3',
        text: "Dinorwig's reservoir holds enough water to make 2.4 billion cups of tea!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'hydro_friendly_4',
        text: "Small-scale hydro systems can generate power for rural homes 24/7 from streams.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'hydro_snark_1',
        text: "Dinorwig is carved inside a mountain. Because regular power stations are too mainstream.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'hydro_snark_2',
        text: "Pumped hydro: pump water uphill when power is cheap, release when it's expensive. Gravity wins.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- DOMESTIC SOLAR PANELS ---
    {
        id: 'solar_domestic_1',
        text: "A typical UK home solar system produces 3,500 kWh/year - enough to run all your appliances!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'solar_domestic_2',
        text: "Solar panels work on cloudy days - UK homes can still generate 10-25% capacity in diffuse light.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'solar_domestic_3',
        text: "Over 1.3 million UK homes now have solar panels - enough to power a city twice the size of Leeds!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'solar_domestic_4',
        text: "Solar panels typically pay for themselves in 10-15 years and last 25+ years.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'solar_domestic_snark_1',
        text: "Your roof is just sitting there. Doing nothing. Put some panels on it already.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'solar_domestic_snark_2',
        text: "Solar panels work in the UK? Shocking. Almost like they need light, not heat.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- SMART ENERGY USAGE ---
    {
        id: 'smart_usage_1',
        text: "Running your dishwasher at 2am instead of 6pm can cut carbon emissions by 50%!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'smart_usage_2',
        text: "Time-of-use tariffs can save £300+/year if you shift usage to off-peak hours.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'smart_usage_3',
        text: "Charging your EV between midnight and 5am can cost 70% less than peak times.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'smart_usage_4',
        text: "Smart meters show real-time energy use, helping UK households save an average of £75/year.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'smart_usage_snark_1',
        text: "Washing clothes at 3am is weird. Saving 60% on carbon? Worth it.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'smart_usage_snark_2',
        text: "Your oven doesn't need to preheat for 20 minutes. That's a scam by Big Oven.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- GRID INTERCONNECTORS ---
    {
        id: 'interconnector_1',
        text: "The UK can import 7,400MW from Europe via undersea cables - enough for 7 million homes!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'interconnector_2',
        text: "The North Sea Link to Norway brings renewable hydro power to the UK via a 720km cable.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'interconnector_3',
        text: "UK interconnectors help balance the grid - importing when we need it, exporting our surplus wind.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'interconnector_4',
        text: "The France interconnector runs through the Channel Tunnel - sharing power and infrastructure!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'interconnector_snark_1',
        text: "Giant undersea power cables to Europe. Brexit didn't stop electron migration.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'interconnector_snark_2',
        text: "Why generate power when you can just import Norway's mountains? Smart.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },

    // --- EVERYDAY CARBON COMPARISONS ---
    {
        id: 'comparison_friendly_1',
        text: "Boiling only the water you need saves 11kg CO₂/year - same as 55 miles of driving!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'comparison_friendly_2',
        text: "Streaming 1 hour of Netflix uses about 100g CO₂ - the same as driving 400 metres.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'comparison_friendly_3',
        text: "Sending 65 emails equals 1km of driving. Maybe skip 'reply all' next time!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'comparison_friendly_4',
        text: "Drying clothes on a rack instead of a tumble dryer saves 440kg CO₂/year per household.",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'comparison_friendly_5',
        text: "Your phone charger uses about 5 kWh/year. That's roughly 1.5kg CO₂ - basically nothing!",
        category: 'general',
        tone: 'friendly',
        condition: () => true
    },
    {
        id: 'comparison_snark_1',
        text: "You're boiling enough water for 12 teas when you need one. Calm down.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'comparison_snark_2',
        text: "Leaving your laptop charger plugged in wastes power. It's not going to run away.",
        category: 'general',
        tone: 'snarky',
        condition: () => true
    },
    {
        id: 'comparison_snark_3',
        text: "Bitcoin mining uses more electricity than Argentina. The entire country. Let that sink in.",
        category: 'general',
        tone: 'snarky',
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
    let eligible = [...ENERGY_FACTS];
    if (tonePref !== 'mixed') {
        eligible = eligible.filter(f => f.tone === tonePref);
    }

    // 2. Filter by condition
    eligible = eligible.filter(f => !f.condition || f.condition(context));

    // Dynamic insertion of active coal-free streak if eligible under friendly tone
    if (tonePref === 'friendly' || tonePref === 'mixed') {
        try {
            const stored = typeof window !== 'undefined' ? localStorage.getItem('coal-free-streak') : null;
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
                            tone: 'friendly'
                        });
                    }
                }
            }
        } catch (e) {
            // fail-silent
        }
    }

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
