import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRegionalHistoryAndForecast, ForecastData } from '@/lib/carbonApi';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BottomNav } from '@/components/BottomNav';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, subDays, isSameHour, isSameDay } from 'date-fns';
import { Loader2, TrendingDown, TrendingUp, Zap } from 'lucide-react';

export default function HistoryPage() {
    const postcode = localStorage.getItem('gridgreen-postcode') || '';
    const { regionId, region, isLoading: isRegionLoading } = useCarbonData(postcode);
    const { footprint, isLinked } = useOctopusEnergy();

    const [timeRange, setTimeRange] = useState<'24h' | '7d'>('7d');

    const historyQuery = useQuery<ForecastData[]>({
        queryKey: ['history', regionId, timeRange],
        queryFn: () => {
            if (!regionId) return Promise.resolve([]);
            const now = new Date();
            const from = subDays(now, timeRange === '24h' ? 1 : 7).toISOString();
            const to = now.toISOString();
            return getRegionalHistoryAndForecast(regionId, from, to);
        },
        enabled: !!regionId,
        refetchInterval: false,
        staleTime: 1000 * 60 * 30, // 30 mins
    });

    const data = historyQuery.data || [];

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
    }, [data, footprint]);

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

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 space-y-6 pt-[max(2rem,env(safe-area-inset-top))]">
                <div>
                    <h1 className="text-2xl font-bold">Grid History</h1>
                    <p className="text-muted-foreground">{region || 'National'} carbon intensity over time.</p>
                </div>

                {!postcode ? (
                    <Card className="p-6 text-center">
                        <p>Please enter a postcode in Settings to see regional history.</p>
                    </Card>
                ) : isRegionLoading || historyQuery.isLoading ? (
                    <div className="flex justify-center items-center h-[300px]">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 border-primary/20 bg-primary/5">
                                <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Average</div>
                                <div className="text-2xl font-bold mt-1">{avgIntensity}g</div>
                                <div className="text-xs text-muted-foreground mt-1">Last {timeRange === '7d' ? '7 Days' : '24 Hours'}</div>
                            </Card>
                            {isLinked && totalConsumption > 0 ? (
                                <Card className="p-4 border-muted">
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
                            ) : (
                                <Card className="p-4 border-muted">
                                    <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Trend</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {trend === 'improving' ? (
                                            <TrendingDown className="w-6 h-6 text-green-500" />
                                        ) : (
                                            <TrendingUp className="w-6 h-6 text-red-500" />
                                        )}
                                        <span className={`text-sm font-bold ${trend === 'improving' ? 'text-green-600' : 'text-red-600'}`}>
                                            {Math.abs(endVal - startVal)}g
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">Currently {trend === 'improving' ? 'lower' : 'higher'} than start</div>
                                </Card>
                            )}
                        </div>

                        {/* Chart */}
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
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
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
                                            tickFormatter={(val) => `${val}g`}
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
                                            fill="#facc15"
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
                                            stroke="#3b82f6"
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
                                            stroke="#22c55e"
                                            fillOpacity={1}
                                            fill="url(#colorActual)"
                                            strokeWidth={2}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
