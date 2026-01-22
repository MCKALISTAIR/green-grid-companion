import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCarbonData } from './useCarbonData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Setup Wrapper
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCarbonData', () => {
    it('returns loading state initially', async () => {
        const { result } = renderHook(() => useCarbonData(''), {
            wrapper: createWrapper(),
        });

        // Should start loading national data defaults
        expect(result.current.isLoading).toBe(true);
    });
});
