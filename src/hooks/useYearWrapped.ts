import { useState, useCallback } from 'react';
import { getNationalHistoryAndForecast, ForecastData } from '@/lib/carbonApi';
import { startOfYear, endOfYear, subDays, min } from 'date-fns';
import { processYearData, YearWrappedData } from '@/lib/yearWrappedUtils';

// The Carbon Intensity API only allows 30-day queries, so we need to chunk
const MAX_QUERY_DAYS = 30; // Use 30 for max efficiency

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

      // Fetch chunks in batches to balance speed and rate limits
      const BATCH_SIZE = 5;
      let completedChunks = 0;

      const processChunk = async (chunk: { from: Date; to: Date }, index: number) => {
        try {
          const chunkData = await getNationalHistoryAndForecast(
            chunk.from.toISOString(),
            chunk.to.toISOString(),
          );
          return chunkData;
        } catch (err) {
          console.warn(`Failed to fetch chunk ${index + 1}:`, err);
          return [];
        } finally {
          completedChunks++;
          setProgress(Math.round((completedChunks / chunks.length) * 100));
        }
      };

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map((chunk, idx) => processChunk(chunk, i + idx));

        const batchResults = await Promise.all(batchPromises);

        for (const result of batchResults) {
          allData.push(...result);
        }

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (allData.length === 0) {
        setError('No data for this year yet');
        setIsLoading(false);
        return;
      }

      // Process the data
      const result = processYearData(allData, year);
      setData(result);
    } catch (err) {
      console.error('Error fetching year wrapped data:', err);
      setError("Couldn't load your year");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, progress, error, fetchYearData };
}
