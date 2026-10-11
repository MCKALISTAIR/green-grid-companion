
import { UK_REGIONS, getRegionalIntensity } from './carbonApi';
import { logger } from './logger';
import { supabase } from '@/integrations/supabase/client';

// Interfaces for API responses
interface NominatimResult {
    place_id: number;
    licence: string;
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        postcode?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
    };
}

export interface LocationSearchResult {
    name: string;
    regionPostcode: string; // The specific regional code (e.g. 'SW', 'EH')
    regionName: string;     // The friendly name (e.g. 'London', 'South Scotland')
    description: string;
}

interface SearchCacheData {
    queries: Record<string, LocationSearchResult | null>;
    coordinates: Record<string, LocationSearchResult | null>;
}

const CACHE_KEY = 'gridsense-geocoding-cache-v1';

function loadCache(): SearchCacheData {
    try {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        logger.warn('Failed to parse geocoding cache', { error: e });
    }
    return { queries: {}, coordinates: {} };
}

function saveCache(cache: SearchCacheData) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        logger.warn('Failed to write geocoding cache', { error: e });
    }
}

function saveToQueryCache(query: string, result: LocationSearchResult | null) {
    const cache = loadCache();
    const cleanQuery = query.toLowerCase().trim();
    const keys = Object.keys(cache.queries);
    if (keys.length >= 100) {
        delete cache.queries[keys[0]];
    }
    cache.queries[cleanQuery] = result;
    saveCache(cache);
}

function getFromQueryCache(query: string): LocationSearchResult | null | undefined {
    const cache = loadCache();
    return cache.queries[query.toLowerCase().trim()];
}

function saveToCoordinateCache(lat: number, lon: number, result: LocationSearchResult | null) {
    const cache = loadCache();
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const keys = Object.keys(cache.coordinates);
    if (keys.length >= 100) {
        delete cache.coordinates[keys[0]];
    }
    cache.coordinates[key] = result;
    saveCache(cache);
}

function getFromCoordinateCache(lat: number, lon: number): LocationSearchResult | null | undefined {
    const cache = loadCache();
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    return cache.coordinates[key];
}

/**
 * Search for a location (postcode or place name) and return the matching Carbon Intensity Region.
 */
export async function searchLocation(query: string): Promise<LocationSearchResult | null> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    // Check query cache first
    const cached = getFromQueryCache(cleanQuery);
    if (cached !== undefined) {
        logger.debug('Geocoding query cache hit', { query: cleanQuery, result: cached });
        return cached;
    }

    let result: LocationSearchResult | null = null;

    // 1. Try as Postcode first
    if (isValidPostcodeFormat(cleanQuery)) {
        try {
            // Direct Carbon API lookup for postcodes (most accurate)
            result = await lookupByCarbonApi(cleanQuery);
        } catch (e) {
            logger.debug('Carbon API postcode lookup failed, trying backup', { error: e });
        }
    }

    // 2. Try as Place Name (Nominatim) if no postcode matched
    if (!result) {
        result = await lookupPlaceName(cleanQuery);
    }

    // Save to cache
    saveToQueryCache(cleanQuery, result);
    return result;
}

/**
 * Get region from coordinates
 */
export async function getRegionFromCoordinates(lat: number, lon: number): Promise<LocationSearchResult | null> {
    const cached = getFromCoordinateCache(lat, lon);
    if (cached !== undefined) {
        logger.debug('Coordinate geocoding cache hit', { lat, lon, result: cached });
        return cached;
    }

    let result: LocationSearchResult | null = null;
    try {
        const res = await fetch(`https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}`);
        if (!res.ok) return null;

        const data = await res.json();
        // If postcodes.io fails (e.g. offshore or remote), try Nominatim reverse geocode
        if (!data.result || data.result.length === 0) {
            logger.debug('Postcodes.io returned no results, trying Nominatim reverse geocode');
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            if (nomRes.ok) {
                const nomData = await nomRes.json();
                if (nomData.address?.postcode) {
                    result = await lookupByCarbonApi(nomData.address.postcode);
                }
            }
        } else {
            // Got a postcode, use Carbon API to resolve it to a Region
            const postcode = data.result[0].postcode;
            result = await lookupByCarbonApi(postcode);
        }
    } catch (e) {
        logger.error('Failed to resolve coordinates to region', { error: e });
    }

    saveToCoordinateCache(lat, lon, result);
    return result;
}

const FULL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/;

// One lookup per postcode per session; also de-duplicates concurrent callers
// (dashboard + status bar both resolve the same postcode on load).
const postcodeLookupCache = new Map<string, Promise<{ lat: number; lon: number } | null>>();

/** Test hook. */
export function clearPostcodeLookupCache(): void {
    postcodeLookupCache.clear();
}

/**
 * Resolve a postcode to coordinates (Lat/Lon) using postcodes.io.
 *
 * - Full postcodes ("SW1A 1AA") use /postcodes/{postcode}.
 * - Outward codes ("SW1A", "CF10") use /outcodes/{outcode}. Calling /postcodes/
 *   with an outcode always 404s, which is what the live app was doing.
 * - Broad areas / region names ("EH", "Scotland") map to a representative outcode.
 */
export async function resolvePostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
    const key = postcode.replace(/\s+/g, '').toUpperCase();
    if (!key) return null;
    const cached = postcodeLookupCache.get(key);
    if (cached) return cached;
    const lookup = resolvePostcodeUncached(postcode).then((result) => {
        // Don't pin failures for the whole session; allow a later retry.
        if (!result) postcodeLookupCache.delete(key);
        return result;
    });
    postcodeLookupCache.set(key, lookup);
    return lookup;
}

async function resolvePostcodeUncached(postcode: string): Promise<{ lat: number; lon: number } | null> {
    try {
        const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();

        // Region selections in the app are often broad postcode areas (e.g. "EH", "DG")
        // rather than full postcodes, so use a stable representative outward code.
        const representativeOutcodes: Record<string, string> = {
            GB: 'SW1A', Scotland: 'EH1', SCOTLAND: 'EH1', England: 'SW1A', ENGLAND: 'SW1A', Wales: 'CF10', WALES: 'CF10',
            AB: 'AB10', IV: 'IV1', KW: 'KW1', PH: 'PH1', ZE: 'ZE1', HS: 'HS1',
            EH: 'EH1', FK: 'FK1', G: 'G1', KA: 'KA1', KY: 'KY1', ML: 'ML1', PA: 'PA1', TD: 'TD1', DG: 'DG1',
            M: 'M1', NE: 'NE1', LS: 'LS1', LL: 'LL11', CF: 'CF10', B: 'B1', NG: 'NG1', CB: 'CB1', BS: 'BS1', SO: 'SO14',
            SW: 'SW1A', SE: 'SE1', E: 'E1', EC: 'EC1A', N: 'N1', NW: 'NW1', W: 'W1A', WC: 'WC1A', BN: 'BN1',
            PL: 'PL1', TR: 'TR1', EX: 'EX1', SA: 'SA1', TQ: 'TQ1', DT: 'DT1', BH: 'BH1', CT: 'CT1', DN: 'DN1',
            PO: 'PO1', OX: 'OX1', LE: 'LE1', BD: 'BD1', CV: 'CV1', BT: 'BT1', IM: 'IM1', JE: 'JE1', GY: 'GY1',
        };

        const lookup = async (endpoint: 'postcodes' | 'outcodes', value: string) => {
            const response = await fetch(`https://api.postcodes.io/${endpoint}/${encodeURIComponent(value)}`);
            if (!response.ok) return null;

            const data = await response.json();
            if (data.status === 200 && data.result
                && typeof data.result.latitude === 'number' && typeof data.result.longitude === 'number') {
                return {
                    lat: data.result.latitude,
                    lon: data.result.longitude
                };
            }
            return null;
        };

        if (FULL_POSTCODE_RE.test(cleanPostcode)) {
            const exact = await lookup('postcodes', cleanPostcode);
            if (exact) return exact;
            // Unknown/terminated full postcode: fall back to its outward code.
            const outward = cleanPostcode.slice(0, -3);
            return OUTCODE_RE.test(outward) ? await lookup('outcodes', outward) : null;
        }

        if (OUTCODE_RE.test(cleanPostcode)) {
            const outcode = await lookup('outcodes', cleanPostcode);
            if (outcode) return outcode;
        }

        const representative = representativeOutcodes[cleanPostcode] ?? representativeOutcodes[postcode];
        if (representative) {
            return await lookup('outcodes', representative);
        }

        return null;
    } catch (error) {
        logger.warn('Failed to resolve postcode', { postcode, error });
    }
    return null;
}

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}


/**
 * Basic validation for UK postcode format
 */
function isValidPostcodeFormat(query: string): boolean {
    // Very loose regex
    return /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(query) ||
        /^[A-Z]{1,2}[0-9][0-9A-Z]?$/i.test(query);
}

/**
 * Lookup directly via Carbon Intensity API
 * This is the source of truth for "What region is this postcode in?"
 */
async function lookupByCarbonApi(postcode: string): Promise<LocationSearchResult | null> {
    try {
        const regionData = await getRegionalIntensity(postcode);

        if (!regionData) return null;

        // We have the Region Name from API (e.g. "London")
        // We need to map this back to one of our UK_REGIONS items to get the "value" (postcode prefix)
        // we use in the app for selection state.

        // 1. Try exact name match
        let matchedHelper = UK_REGIONS.find(r =>
            r.name.toLowerCase() === regionData.shortname.toLowerCase() ||
            r.name.toLowerCase() === regionData.dnoregion.toLowerCase()
        );

        // 2. If no exact match (e.g. API "North Wales", Helper "North Wales & Merseyside")
        if (!matchedHelper) {
            matchedHelper = UK_REGIONS.find(r =>
                r.name.toLowerCase().includes(regionData.shortname.toLowerCase()) ||
                regionData.shortname.toLowerCase().includes(r.name.toLowerCase())
            );
        }

        // 3. Fallback: If we can't map it to a helper item, we might need to rely on the regionid
        // But for now, let's assume our UK_REGIONS cover all DNOs roughly.

        if (matchedHelper) {
            return {
                name: postcode.toUpperCase(),
                regionPostcode: matchedHelper.postcode,
                regionName: matchedHelper.name,
                description: `${matchedHelper.name}`
            };
        }

        logger.warn('Could not map API region to internal list', { regionName: regionData.shortname });
        return null;

    } catch (e) {
        logger.debug('Carbon API lookup failed', { error: e });
        return null;
    }
}

/**
 * Lookup a place name using OpenStreetMap (Nominatim)
 */
async function lookupPlaceName(query: string): Promise<LocationSearchResult | null> {
    try {
        // Try calling the Supabase Edge Function geocoding proxy first
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('geocoding', {
            body: { query: query }
        });

        let data: NominatimResult[] = [];
        if (!edgeError && edgeData) {
            data = edgeData;
        } else {
            logger.warn('Geocoding edge function proxy failed, falling back to direct OSM query', { error: edgeError });
            // Fallback to direct OSM Nominatim query if the edge function fails
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', United Kingdom')}&format=json&countrycodes=gb&limit=1&addressdetails=1`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'GridSense/1.0' }
            });
            if (res.ok) {
                data = await res.json();
            }
        }

        if (!data || data.length === 0) return null;

        const place = data[0];
        const name = place.address?.city || place.address?.town || place.address?.village || place.display_name.split(',')[0];

        // If we have a postcode, use Carbon API
        if (place.address?.postcode) {
            return await lookupByCarbonApi(place.address.postcode);
        }

        // Otherwise calculate from lat/lon
        return await getRegionFromCoordinates(parseFloat(place.lat), parseFloat(place.lon));

    } catch (e) {
        logger.error('Place lookup failed', { error: e });
        return null;
    }
}
