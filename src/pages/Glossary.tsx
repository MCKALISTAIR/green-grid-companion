import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wind, Sun, Zap, Flame, Leaf, Droplets, Factory, Ship, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFuelColor } from "@/lib/carbonApi";
import { motion } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
        opacity: 1, 
        y: 0, 
        transition: { type: 'spring' as const, stiffness: 350, damping: 25 } 
    }
};

export default function Glossary() {
    const navigate = useNavigate();

    const fuelTypes = [
        {
            id: "wind",
            name: "Wind",
            description: "Clean, renewable energy generated from wind turbines both onshore and offshore.",
            icon: Wind,
            category: "Renewable"
        },
        {
            id: "solar",
            name: "Solar",
            description: "Clean energy generated from sunlight via photovoltaic panels. Highly time-dependent.",
            icon: Sun,
            category: "Renewable"
        },
        {
            id: "hydro",
            name: "Hydro",
            description: "Energy generated from flowing water (dams, rivers). Consistent and clean.",
            icon: Droplets,
            category: "Renewable"
        },
        {
            id: "nuclear",
            name: "Nuclear",
            description: "Low-carbon baseload power generated via nuclear fission. Very stable output.",
            icon: Zap,
            category: "Low Carbon"
        },
        {
            id: "biomass",
            name: "Biomass",
            description: "Energy produced by burning organic materials. While often technically classified as renewable, it emits CO₂ during combustion.",
            icon: Leaf,
            category: "Combustion"
        },
        {
            id: "gas",
            name: "Gas (CCGT)",
            description: "Burning natural gas. The main flexible source used to balance the grid when renewables are low.",
            icon: Flame,
            category: "Fossil Fuel"
        },
        {
            id: "coal",
            name: "Coal",
            description: "Burning coal. The most carbon-intensive form of electricity generation. Being phased out.",
            icon: Factory,
            category: "Fossil Fuel"
        },
        {
            id: "imports",
            name: "Imports",
            description: "Electricity brought in via subsea interconnectors from France, Norway, Belgium, etc.",
            icon: Ship,
            category: "Mixed"
        },
        {
            id: "other",
            name: "Other",
            description: "Miscellaneous sources including oil and pumped storage.",
            icon: HelpCircle,
            category: "Other"
        }
    ];

    return (
        <div className="bg-background lg:pb-6">
            {/* Header */}
            <div className="md:hidden sticky top-0 z-40 flex items-center px-4 pb-4 pt-[calc(max(env(safe-area-inset-top),59px)+1rem)] bg-background/80 backdrop-blur-md border-b">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2" aria-label="Go back">
                    <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                </Button>
                <h1 className="text-lg font-semibold ml-2">Energy Literacy</h1>
            </div>

            <motion.div 
                className="md:p-8 max-w-4xl mx-auto space-y-8 p-4 pt-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {/* Intro */}
                <motion.section variants={itemVariants} className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight hidden md:block mb-6">Energy Literacy</h2>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-primary" />
                                What is Carbon Intensity?
                            </CardTitle>
                            <CardDescription>
                                Understanding the numbers behind your energy.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                            <p>
                                **Carbon Intensity** measures the amount of CO₂ released to produce one unit of electricity (`kWh`).
                            </p>
                            <p>
                                When the wind is blowing and sun is shining, we use clean sources, so intensity is **Low**.
                                When demand is high (like evening peaks) or weather is calm, we burn gas to keep the lights on, so intensity is **High**.
                            </p>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Units */}
                <motion.section variants={itemVariants} className="space-y-4">
                    <h3 className="text-xl font-semibold px-1">Key Metrics</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}>
                            <Card className="h-full">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-medium">gCO₂/kWh</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        "Grams of Carbon Dioxide per Kilowatt-hour". This is the standard unit. <br />
                                        <span className="font-semibold text-foreground">0 g</span> = Pure clean energy.<br />
                                        <span className="font-semibold text-foreground">300+ g</span> = Heavy fossil fuel usage.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}>
                            <Card className="h-full">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-medium">National vs Regional</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        **National**: The average for the entire UK grid.<br />
                                        **Regional**: Your specific local grid (DNO). Does your area produce more wind? Are you near a nuclear plant?
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Data Sources & Embedded Generation */}
                <motion.section variants={itemVariants} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Factory className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-semibold">Behind the Scenes</h3>
                    </div>
                    <Card className="bg-gradient-to-br from-background to-muted/50">
                        <CardHeader>
                            <CardTitle className="text-base font-medium">Where does this data come from?</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                We source our data directly from **NESO** (the National Energy System Operator). They manage the flow of electricity across Great Britain in real-time.
                            </p>
                            <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                                    <Sun className="w-4 h-4 text-orange-500" />
                                    The "Embedded Generation" Challenge
                                </h4>
                                <p>
                                    Big power stations (like nuclear or wind farms) are easy to track because they have massive meters.
                                    But millions of homes have **rooftop solar panels** that feed energy directly into local wires. These are "invisible" to the main national grid meters.
                                </p>
                                <p className="mt-2">
                                    To solve this, NESO uses sophisticated **AI and weather models** to estimate how much "Embedded Generation" is happening.
                                    <br />
                                    So when you see "Solar" data here, it's actually a smart blend of real meter readings and high-tech weather forecasting!
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Fuel Sources */}
                <motion.section variants={itemVariants} className="space-y-4">
                    <h3 className="text-xl font-semibold px-1">Fuel Sources</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {fuelTypes.map((fuel) => {
                            const Icon = fuel.icon;
                            const colorClass = getFuelColor(fuel.id);

                            return (
                                <motion.div
                                    key={fuel.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -3, scale: 1.02 }}
                                    transition={{ type: 'spring' as const, stiffness: 450, damping: 22 }}
                                >
                                    <Card className="overflow-hidden h-full shadow-sm hover:shadow-md transition-shadow duration-300">
                                        <div className="flex items-start p-4 gap-4">
                                            <motion.div 
                                                className={`p-2.5 rounded-xl shrink-0 ${colorClass} bg-opacity-20 text-foreground`}
                                                whileHover={{ scale: 1.15, rotate: [0, -12, 12, 0] }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <Icon className="w-5 h-5 text-white/90 drop-shadow-sm" />
                                            </motion.div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1 gap-1">
                                                    <h4 className="font-semibold truncate">{fuel.name}</h4>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-50 border px-1.5 py-0.5 rounded-full shrink-0">
                                                        {fuel.category}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-snug">
                                                    {fuel.description}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>

            </motion.div>
        </div>
    );
}

