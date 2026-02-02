
import { getRegionalIntensity, UK_REGIONS } from './src/lib/carbonApi.ts';

async function testLookup(postcode: string) {
    console.log(`Testing lookup for: ${postcode}`);
    try {
        const data = await getRegionalIntensity(postcode);
        console.log('API Response:', JSON.stringify(data, null, 2));

        // Simulate logic from location.ts
        const regionData = data;
        let matchedHelper = UK_REGIONS.find(r =>
            r.name.toLowerCase() === regionData.shortname?.toLowerCase() ||
            r.name.toLowerCase() === regionData.dnoregion?.toLowerCase()
        );

        if (!matchedHelper) {
            matchedHelper = UK_REGIONS.find(r =>
                r.name.toLowerCase().includes(regionData.shortname?.toLowerCase()) ||
                regionData.shortname?.toLowerCase().includes(r.name.toLowerCase())
            );
        }

        console.log('Matched in Helper:', matchedHelper);
    } catch (e) {
        console.error('Error:', e);
    }
}

testLookup('SW1A'); // London
testLookup('IV3');  // North Scotland
testLookup('FK2 0ZX'); // Problematic one
testLookup('EH'); // Region prefix (Failed 400)
testLookup('SW'); // London prefix (Testing if this also fails)
