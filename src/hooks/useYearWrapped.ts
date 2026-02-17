import { useState, useCallback } from 'react';
import { getNationalHistoryAndForecast, ForecastData } from '@/lib/carbonApi';
import { startOfYear, endOfYear, subDays, min } from 'date-fns';
import { processYearData, YearWrappedData } from '@/lib/yearWrappedUtils';

// The Carbon Intensity API only allows 30-day queries, so we need to chunk
const MAX_QUERY_DAYS = 14; // Use 14 for reliability

export function useYearWrapped() {
    const [data, setData] = useState<YearWrappedData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchYearData = useCallback(async (year: number) => {
        setIsLoading(true);
        setProgress(0);
        setError(null);
        setData(null);

        try {
            const yearStart = startOfYear(new Date(year, 0, 1));
            const yearEnd = min([endOfYear(new Date(year, 0, 1)), new Date()]);
            
            // Break the year into chunks we can query
            const chunks: { from: Date; to: Date }[] = [];
            let currentStart = yearStart;
            
            while (currentStart < yearEnd) {
                const chunkEnd = min([subDays(currentStart, -MAX_QUERY_DAYS), yearEnd]);
                chunks.push({ from: currentStart, to: chunkEnd });
                currentStart = new Date(chunkEnd.getTime() + 1);
            }

            const allData: ForecastData[] = [];
            
            // Fetch each chunk with progress updates
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                try {
                    const chunkData = await getNationalHistoryAndForecast(
                        chunk.from.toISOString(),
                        chunk.to.toISOString()
                    );
                    allData.push(...chunkData);
                } catch (err) {
                    console.warn(`Failed to fetch chunk ${i + 1}:`, err);
                    // Continue with other chunks
                }
                
                setProgress(Math.round(((i + 1) / chunks.length) * 100));
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (allData.length === 0) {
                setError('No data available for this year');
                setIsLoading(false);
                return;
            }

            // Process the data
            const result = processYearData(allData, year);
            setData(result);
        } catch (err) {
            console.error('Error fetching year wrapped data:', err);
            setError('Failed to load year data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { data, isLoading, progress, error, fetchYearData };
}
