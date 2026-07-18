import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRegionalHistoryAndForecast, getNationalHistoryAndForecast, ForecastData } from '@/lib/carbonApi';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { format, parseISO, subDays, isSameHour, isSameDay } from 'date-fns';
import { Loader2, TrendingDown, TrendingUp, Zap, BarChart3, Info, X } from 'lucide-react';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { getErrorInfo } from '@/lib/errorUtils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

import { useHistoricalCarbon } from '@/hooks/useHistoricalCarbon';
import { IntensityScene } from '@/components/IntensityScene';
import { useAchievements } from '@/hooks/useAchievements';
import { useAppLocation } from '@/contexts/LocationContext';

export default function HistoryPage() {
    const { postcode } = useAppLocation();
    const { regionId, region, isLoading: isRegionLoading, isError: isRegionError, error: regionError } = useCarbonData(postcode);
    const { footprint, isLinked } = useOctopusEnergy();
    const navigate = useNavigate();

    const [timeRange, setTimeRange] = useState<'24h' | '7d'>('7d');
    const [date, setDate] = useState<Date | undefined>(undefined); // If defined, we are in Time Machine mode
    const [showChartTip, setShowChartTip] = useState(() => !localStorage.getItem('history-chart-tip-seen'));

    const dismissChartTip = () => {
        setShowChartTip(false);
        localStorage.setItem('history-chart-tip-seen', 'true');
    };

    // Standard History Query (Live/Recent)
    const historyQuery = useQuery<ForecastData[]>({
        queryKey: ['history', regionId, timeRange],
        queryFn: () => {
            const now = new Date();
            const from = subDays(now, timeRange === '24h' ? 1 : 7).toISOString();
            const to = now.toISOString();

            if (regionId) {
                return getRegionalHistoryAndForecast(regionId, from, to);
            } else {
                return getNationalHistoryAndForecast(from, to);
            }
        },
        enabled: !date, // Only fetch if NOT in time machine mode
        refetchInterval: false,
        staleTime: 1000 * 60 * 30, // 30 mins
        gcTime: 1000 * 60 * 60, // 1 hour - keep in cache
    });

    // Time Machine Query
    const { data: historicalData, isLoading: isHistoricalLoading, isError: isHistoricalError } = useHistoricalCarbon(date);

    // Determine which data to show
    const displayData = date ? historicalData : (historyQuery.data || []);
    const isLoading = date ? isHistoricalLoading : historyQuery.isLoading;
    const isError = date ? isHistoricalError : historyQuery.isError;
    const error = date ? null : historyQuery.error; // Historical hook handles its own error retrieval if needed

    // Logic for "Vintage" mode - just a flag for now, could be passed to scene later
    const isVintage = !!date;

    const { unlock } = useAchievements();

    // Unlock Time Traveler achievement if using Time Machine
    useEffect(() => {
        if (date) {
            unlock('time_traveler');
        }
    }, [date, unlock]);

    const data = displayData;

    // Calculate simple stats
    const avgIntensity = data.length > 0
        ? Math.round(data.reduce((acc, curr) => acc + curr.intensity.forecast, 0) / data.length)
        : 0;

    // Merge consumption data
    const chartData = useMemo(() => {
        return data.map(item => {
            const itemDate = parseISO(item.from);

            // Find matching consumption record (approximate match to hour/30min slot)
            // Octopus data is typically 30m slots. 
            // We'll try to find a record that starts within the same 30m window.
            const consumptionRecord = footprint?.records.find(r => {
                const rDate = parseISO(r.interval_start);
                // Use date-fns for robust comparison (handles ISO format differences)
                return rDate.getTime() === itemDate.getTime();
            });

            // Fallback: Group by hour if slots don't align perfectly? 
            // For now, strict match or null.

            return {
                time: item.from,
                forecast: item.intensity.forecast,
                actual: item.intensity.actual ?? null,
                consumption: consumptionRecord ? consumptionRecord.consumption_kwh : null,
                carbonMass: consumptionRecord ? consumptionRecord.carbon_g : null,
                formattedTime: format(itemDate, timeRange === '24h' ? 'HH:mm' : 'dd MMM HH:mm'),
            };
        });
    }, [data, footprint, timeRange]);

    // Compute consumption stats if available
    const totalConsumption = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + (curr.consumption || 0), 0);
    }, [chartData]);

    // Compute total carbon mass
    const totalCarbonMass = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + (curr.carbonMass || 0), 0);
    }, [chartData]);


    const startVal = data[0]?.intensity.forecast || 0;
    const endVal = data[data.length - 1]?.intensity.forecast || 0;
    const trend = endVal < startVal ? 'improving' : 'worsening';

    // Handle error state
    if (isRegionError || isError) {
        const errorInfo = getErrorInfo(regionError || error);
        return (
            <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
                <div className="p-4 space-y-6 pt-[calc(max(env(safe-area-inset-top),59px)+2rem)]">
                    <div>
                        <h1 className="text-2xl font-bold">Grid History</h1>
                        <p className="text-muted-foreground">{region || 'National'} carbon intensity over time.</p>
                    </div>
                    <ErrorState
                        title={errorInfo.title}
                        description={errorInfo.description}
                        retry={() => date ? window.location.reload() : historyQuery.refetch()}
                        fullScreen
                    />
                </div>
            </div>
        );
    }

    // Empty state when no history data
    if (!isRegionLoading && !isLoading && data.length === 0) {
        return (
            <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
                <div className="p-4 space-y-6 pt-[calc(max(env(safe-area-inset-top),59px)+2rem)]">
                    <div>
                        <h1 className="text-2xl font-bold">Grid History</h1>
                        <p className="text-muted-foreground">{region || 'National'} carbon intensity over time.</p>
                    </div>
                    <EmptyState
                        icon={BarChart3}
                        title="No Historical Data"
                        description="We couldn't find any historical carbon intensity data for this region."
                        fullScreen
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <motion.div 
                className="p-4 space-y-6 pt-[calc(max(env(safe-area-inset-top),59px)+2rem)]"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {date ? '🕰️ Time Machine' : 'Grid History'}
                        </h1>
                        <p className="text-muted-foreground">
                            {date
                                ? `Viewing archives for ${format(date, 'MMMM do, yyyy')}`
                                : `${region || 'National'} carbon intensity over time.`
                            }
                        </p>
                    </div>

                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "justify-start text-left font-normal w-[240px]",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a past date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        {date && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDate(undefined)}
                                title="Return to Present"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </motion.div>

                {!postcode ? (
                    <motion.div variants={itemVariants}>
                        <Card className="p-6 text-center">
                            <p>Please enter a postcode in Settings to see regional history.</p>
                        </Card>
                    </motion.div>
                ) : isRegionLoading || isLoading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 animate-pulse bg-card">
                                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                                <div className="h-8 bg-muted rounded w-3/4"></div>
                            </Card>
                            <Card className="p-4 animate-pulse bg-card">
                                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                                <div className="h-8 bg-muted rounded w-3/4"></div>
                            </Card>
                        </div>
                        <Card className="p-4 animate-pulse bg-card">
                            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                            <div className="h-[300px] bg-muted rounded"></div>
                        </Card>
                    </div>
                ) : (
                    <>
                        {showChartTip && (
                            <motion.div variants={itemVariants}>
                                <Card className="mb-4 bg-muted/30 border-dashed relative animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={dismissChartTip}
                                        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label="Dismiss tip"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="p-4 flex gap-3 pr-8">
                                        <div className="p-2 bg-background rounded-full border shadow-sm h-fit">
                                            <Info className="w-4 h-4 text-primary shrink-0" />
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="font-semibold">Understanding the Graph</p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                The <span className="font-medium text-foreground">solid line</span> shows actual carbon intensity, while the <span className="font-medium text-foreground">dotted line</span> shows the forecast. Compare them to see how accurate the predictions were!
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* Time Machine Scene Visualisation */}
                        {date && data.length > 0 && (
                            <motion.div variants={itemVariants}>
                                <Card className="overflow-hidden border-2 border-primary/20">
                                    <div className="relative h-[200px] w-full">
                                        <IntensityScene
                                            intensity={avgIntensity}
                                            index={data[Math.floor(data.length / 2)]?.intensity.index || 'moderate'}
                                            generationMix={data[Math.floor(data.length / 2)]?.generationmix}
                                            isVintage={true}
                                            className="h-full"
                                            style={{ height: '100%' }}
                                        />
                                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono">
                                            SNAPSHOT: {format(date, 'yyyy')}
                                        </div>
                                    </div>
                                    <CardContent className="p-4 bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-full border">
                                                {avgIntensity < (historyQuery.data && historyQuery.data.length > 0 ? (historyQuery.data.reduce((acc, curr) => acc + curr.intensity.forecast, 0) / historyQuery.data.length) : 0) ? (
                                                    <TrendingDown className="w-5 h-5 text-green-600 animate-bounce" />
                                                ) : (
                                                    <TrendingUp className="w-5 h-5 text-red-600 animate-bounce" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">Time Travel Analysis</div>
                                                <div className="text-xs text-muted-foreground">
                                                    This day was <span className="font-bold text-foreground">{Math.abs(avgIntensity - Math.round(historyQuery.data && historyQuery.data.length > 0 ? (historyQuery.data.reduce((acc, curr) => acc + curr.intensity.forecast, 0) / historyQuery.data.length) : avgIntensity))} gCO2/kWh {avgIntensity < (historyQuery.data && historyQuery.data.length > 0 ? Math.round(historyQuery.data.reduce((acc, curr) => acc + curr.intensity.forecast, 0) / historyQuery.data.length) : avgIntensity) ? 'cleaner' : 'dirtier'}</span> than the current 7-day average.
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Stats Cards */}
                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                            <motion.div className="h-full" whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 450, damping: 22 }}>
                                <Card className="p-4 border-primary/20 bg-primary/5 h-full">
                                    <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Average</div>
                                    <div className="text-2xl font-bold mt-1">{avgIntensity} <span className="text-sm font-normal text-muted-foreground">gCO2/kWh</span></div>
                                    <div className="text-xs text-muted-foreground mt-1">Last {timeRange === '7d' ? '7 Days' : '24 Hours'}</div>
                                </Card>
                            </motion.div>
                            {isLinked && totalConsumption > 0 ? (
                                <motion.div className="h-full" whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 450, damping: 22 }}>
                                    <Card className="p-4 border-muted h-full">
                                        <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Footprint</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Zap className="w-6 h-6 text-yellow-500" />
                                            <div className="flex flex-col">
                                                <span className="text-xl font-bold">{(totalCarbonMass / 1000).toFixed(2)}kg</span>
                                                <span className="text-xs text-muted-foreground">{totalConsumption.toFixed(1)} kWh used</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Total carbon footprint</div>
                                    </Card>
                                </motion.div>
                            ) : (
                                <motion.div className="h-full" whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 450, damping: 22 }}>
                                    <Card className="p-4 border-muted h-full">
                                        <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Trend</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {trend === 'improving' ? (
                                                <TrendingDown className="w-6 h-6 text-green-500" />
                                            ) : (
                                                <TrendingUp className="w-6 h-6 text-red-500" />
                                            )}
                                            <span className={`text-sm font-bold ${trend === 'improving' ? 'text-green-600' : 'text-red-600'}`}>
                                                {Math.abs(endVal - startVal)} gCO2/kWh
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Currently {trend === 'improving' ? 'lower' : 'higher'} than start</div>
                                    </Card>
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Chart */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4">
                            <CardHeader className="p-0 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{timeRange === '24h' ? '24 Hour' : '7 Day'} View</CardTitle>
                                        <CardDescription>
                                            <div className="flex items-center gap-3 text-xs mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Forecast
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Actual
                                                </span>
                                                {isLinked && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Usage (kWh)
                                                    </span>
                                                )}
                                            </div>
                                        </CardDescription>
                                    </div>
                                    <div className="flex bg-muted rounded-md p-1">
                                        <button
                                            onClick={() => setTimeRange('24h')}
                                            className={`px-3 py-1 text-xs rounded-sm transition-all ${timeRange === '24h' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                                        >
                                            24h
                                        </button>
                                        <button
                                            onClick={() => setTimeRange('7d')}
                                            className={`px-3 py-1 text-xs rounded-sm transition-all ${timeRange === '7d' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                                        >
                                            7d
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <div className="sr-only">
                                <table aria-label={`Carbon Intensity History for ${timeRange === '24h' ? '24 Hours' : '7 Days'}`}>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Forecast (gCO₂/kWh)</th>
                                            <th>Actual (gCO₂/kWh)</th>
                                            {isLinked && <th>Usage (kWh)</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chartData.map((item, i) => (
                                            <tr key={i}>
                                                <td>{item.formattedTime}</td>
                                                <td>{item.forecast}</td>
                                                <td>{item.actual ?? 'N/A'}</td>
                                                {isLinked && <td>{item.consumption ?? 'N/A'}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis
                                            dataKey="formattedTime"
                                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `${val} g`}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `${val}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px'
                                            }}
                                            labelFormatter={(label) => <span className="font-semibold text-foreground">{label}</span>}
                                            formatter={(value: number | string, name: string, props: { payload: { carbonMass?: number } }) => {
                                                if (name === 'Actual' || name === 'Forecast') return [`${value} gCO2/kWh`, name];
                                                if (name === 'Usage (kWh)') {
                                                    const carbonMass = props.payload.carbonMass;
                                                    return [
                                                        <div key="usage">
                                                            <div>{value} kWh</div>
                                                            {carbonMass && <div className="text-yellow-600 font-bold mt-1">Total: {carbonMass} gCO2</div>}
                                                        </div>,
                                                        ""
                                                    ];
                                                }
                                                return [value, name];
                                            }}
                                        />
                                        {/* Energy Usage Bar */}
                                        <Bar
                                            yAxisId="right"
                                            dataKey="consumption"
                                            name="Usage (kWh)"
                                            fill="hsl(var(--chart-3))"
                                            opacity={0.6}
                                            barSize={8}
                                            radius={[2, 2, 0, 0]}
                                        />
                                        {/* Intensity Areas */}
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="forecast"
                                            name="Forecast"
                                            stroke="hsl(var(--chart-2))"
                                            fillOpacity={1}
                                            fill="url(#colorForecast)"
                                            strokeWidth={2}
                                            strokeDasharray="4 4"
                                        />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="actual"
                                            name="Actual"
                                            stroke="hsl(var(--chart-1))"
                                            fillOpacity={1}
                                            fill="url(#colorActual)"
                                            strokeWidth={2}
                                        />
                                        {/* Interactive Brush for zooming/panning */}
                                        <Brush
                                            dataKey="formattedTime"
                                            height={30}
                                            stroke="hsl(var(--primary))"
                                            fill="hsl(var(--muted))"
                                            tickFormatter={() => ''}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        </motion.div>
                    </>
                )}
            </motion.div>

        </div>
    );
}
