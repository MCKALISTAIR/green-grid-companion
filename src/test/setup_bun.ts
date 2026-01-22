import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { expect } from 'bun:test';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Bun expect with jest-dom matchers
expect.extend(matchers);

// Register Happy DOM
GlobalRegistrator.register();

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});
