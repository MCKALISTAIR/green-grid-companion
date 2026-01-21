
import { UK_REGIONS, getRegionalIntensity } from './carbonApi';

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
            console.warn('Carbon API postcode lookup failed, trying backup', e);
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
            console.log('Postcodes.io returned no results, trying Nominatim reverse...');
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
        console.error('Failed to resolve coordinates to region', e);
        return null;
    }


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

        console.warn(`Could not map API region "${regionData.shortname}" to internal list.`);
        return null;

    } catch (e) {
        console.warn('Carbon API lookup failed', e);
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
        console.error('Place lookup failed', e);
        return null;
    }
}
