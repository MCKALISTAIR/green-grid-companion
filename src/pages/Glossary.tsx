import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wind, Sun, Zap, Flame, Leaf, Droplets, Factory, Ship, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFuelColor } from "@/lib/carbonApi";

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
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="md:hidden sticky top-0 z-40 flex items-center px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-background/80 backdrop-blur-md border-b">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-semibold ml-2">Energy Literacy</h1>
            </div>

            <div className="md:p-8 max-w-4xl mx-auto space-y-8 p-4 pt-4">

                {/* Intro */}
                <section className="space-y-4">
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
                </section>

                {/* Units */}
                <section className="space-y-4">
                    <h3 className="text-xl font-semibold px-1">Key Metrics</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
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
                        <Card>
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
                    </div>
                </section>

                {/* Data Sources & Embedded Generation */}
                <section className="space-y-4">
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
                                We source our data directly from the **National Grid ESO** (Electricity System Operator). They manage the flow of electricity across Great Britain in real-time.
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
                                    To solve this, the National Grid uses sophisticated **AI and weather models** to estimate how much "Embedded Generation" is happening.
                                    <br />
                                    So when you see "Solar" data here, it's actually a smart blend of real meter readings and high-tech weather forecasting!
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Fuel Sources */}
                <section className="space-y-4">
                    <h3 className="text-xl font-semibold px-1">Fuel Sources</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {fuelTypes.map((fuel) => {
                            const Icon = fuel.icon;
                            const colorClass = getFuelColor(fuel.id); // e.g. "bg-gen-wind"
                            // Note: getFuelColor returns a class like 'bg-gen-wind'. 
                            // We want to use that for the icon background.

                            return (
                                <Card key={fuel.id} className="overflow-hidden">
                                    <div className="flex items-start p-4 gap-4">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${colorClass} bg-opacity-20 text-foreground`}>
                                            {/* We need to apply the color more carefully if getFuelColor returns a bg class. 
                           Ideally we want the bg to be the fuel color. 
                           Let's trust the Tailwind class works. */}
                                            <Icon className="w-5 h-5 text-white/90 drop-shadow-sm" />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-semibold">{fuel.name}</h4>
                                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-50 border px-1.5 py-0.5 rounded-full">
                                                    {fuel.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-snug">
                                                {fuel.description}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </section>

            </div>
        </div>
    );
}
