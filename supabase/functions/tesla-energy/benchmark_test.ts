import { syncTeslaProducts, TESLA_API_URL } from './lib.ts';

async function runBenchmark() {
  console.log('Starting benchmark...');
  const userId = 'test-user-id';
  const accessToken = 'test-access-token';

  // Mock fetch
  const originalFetch = globalThis.fetch;

  globalThis.fetch = ((input: string | URL | Request, _init?: RequestInit) => {
    const urlString = input.toString();

    if (urlString.includes(`${TESLA_API_URL}/api/1/vehicles`)) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            response: Array.from({ length: 5 }, (_, i) => ({
              id: 1000 + i,
              vin: `VIN${1000 + i}`,
              display_name: `Vehicle ${i}`,
            })),
          }),
        ),
      );
    }

    if (urlString.includes(`${TESLA_API_URL}/api/1/products`)) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            response: [],
          }),
        ),
      );
    }

    return Promise.resolve(new Response(JSON.stringify({ response: [] })));
  }) as typeof fetch;

  // Mock Supabase Client
  let upsertCount = 0;
  const mockServiceClient = {
    from: (table: string) => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upsert: async (_data: any, _options: any) => {
          if (table === 'tesla_vehicles') {
            upsertCount++;
          }
          return { error: null };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  try {
    await syncTeslaProducts(mockServiceClient, userId, accessToken);

    console.log(`Upsert called ${upsertCount} times`);
    // We check for N+1 behavior (5 calls) OR optimized behavior (1 call)
    // For baseline, we expect 5.
    if (upsertCount === 5) {
      console.log('Benchmark PASSED: N+1 behavior confirmed (5 calls).');
    } else if (upsertCount === 1) {
      console.log('Benchmark PASSED: Optimized behavior confirmed (1 call).');
    } else {
      console.error(`Benchmark FAILED: Expected 1 or 5 calls, got ${upsertCount}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Benchmark error:', error);
    process.exit(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runBenchmark();
