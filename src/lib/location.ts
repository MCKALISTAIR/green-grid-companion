
import { UK_REGIONS, getRegionalIntensity } from './carbonApi';
import { logger } from './logger';

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

/**
 * Search for a location (postcode or place name) and return the matching Carbon Intensity Region.
 */
export async function searchLocation(query: string): Promise<LocationSearchResult | null> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    // 1. Try as Postcode first
    if (isValidPostcodeFormat(cleanQuery)) {
        try {
            // Direct Carbon API lookup for postcodes (most accurate)
            const result = await lookupByCarbonApi(cleanQuery);
            if (result) return result;
        } catch (e) {
            logger.debug('Carbon API postcode lookup failed, trying backup', { error: e });
        }
    }

    // 2. Try as Place Name (Nominatim)
    return await lookupPlaceName(cleanQuery);
}

/**
 * Get region from coordinates
 */
export async function getRegionFromCoordinates(lat: number, lon: number): Promise<LocationSearchResult | null> {
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
                    return await lookupByCarbonApi(nomData.address.postcode);
                }
            }
            return null;
        }

        // Got a postcode, use Carbon API to resolve it to a Region
        const postcode = data.result[0].postcode;
        return await lookupByCarbonApi(postcode);
    } catch (e) {
        logger.error('Failed to resolve coordinates to region', { error: e });
        return null;
    }
}

/**
 * Resolve a postcode to coordinates (Lat/Lon) using postcodes.io
 */
export async function resolvePostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
    try {
        const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
        const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.status === 200 && data.result) {
            return {
                lat: data.result.latitude,
                lon: data.result.longitude
            };
        } else {
            logger.warn('Postcode resolution returned success but no result or 200', { data });
        }
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
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', United Kingdom')}&format=json&countrycodes=gb&limit=1&addressdetails=1`;

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'GridSense/1.0' }
        });

        if (!res.ok) return null;

        const data: NominatimResult[] = await res.json();
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
