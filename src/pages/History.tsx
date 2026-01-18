import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRegionalHistoryAndForecast, ForecastData, getIntensityColor, getIntensityTextColor } from '@/lib/carbonApi';
import { useCarbonData } from '@/hooks/useCarbonData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BottomNav } from '@/components/BottomNav';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { Loader2, CalendarRange, TrendingDown, TrendingUp } from 'lucide-react';

export default function HistoryPage() {
    const postcode = localStorage.getItem('gridgreen-postcode') || '';
    const { regionId, region, isLoading: isRegionLoading } = useCarbonData(postcode);

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
        refetchInterval: false, // Don't auto refetch history too often
        staleTime: 1000 * 60 * 30, // 30 mins
    });

    const data = historyQuery.data || [];

    // Calculate simple stats
    const avgIntensity = data.length > 0
        ? Math.round(data.reduce((acc, curr) => acc + curr.intensity.forecast, 0) / data.length)
        : 0;

    const maxIntensity = data.length > 0 ? Math.max(...data.map(d => d.intensity.forecast)) : 0;
    const minIntensity = data.length > 0 ? Math.min(...data.map(d => d.intensity.forecast)) : 0;

    const chartData = data.map(item => ({
        time: item.from,
        intensity: item.intensity.forecast,
        formattedTime: format(parseISO(item.from), timeRange === '24h' ? 'HH:mm' : 'dd MMM HH:mm'),
    }));

    // Find if we are trending up or down compared to start of period
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
                        </div>

                        {/* Chart */}
                        <Card className="p-4">
                            <CardHeader className="p-0 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{timeRange === '24h' ? '24 Hour' : '7 Day'} View</CardTitle>
                                        <CardDescription>Intensity (gCO2/kWh)</CardDescription>
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
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `${val}g`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px'
                                            }}
                                            labelFormatter={(label) => <span className="font-semibold text-foreground">{label}</span>}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="intensity"
                                            stroke="#10b981"
                                            fillOpacity={1}
                                            fill="url(#colorIntensity)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
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
