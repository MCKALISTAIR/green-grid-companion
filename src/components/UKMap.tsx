import { RegionListItem } from '@/lib/carbonApi';
import { getIntensityColor } from '@/lib/carbonApi';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface UKMapProps {
    regions: RegionListItem[];
    onRegionSelect?: (regionId: number) => void;
    selectedRegionId?: number;
}

// Centroids for DNO regions (Lat, Lon)
const REGION_COORDS: Record<string, { lat: number; lon: number }> = {
    'North Scotland': { lat: 57.5, lon: -4.2 },
    'South Scotland': { lat: 55.5, lon: -3.5 },
    'North East England': { lat: 54.8, lon: -1.8 },
    'North West England': { lat: 54.0, lon: -2.6 },
    'Yorkshire': { lat: 53.9, lon: -1.0 },
    'Merseyside and Northern Wales': { lat: 53.0, lon: -3.5 },
    'North Wales & Merseyside': { lat: 53.0, lon: -3.5 },
    'East Midlands': { lat: 52.8, lon: -0.9 },
    'West Midlands': { lat: 52.5, lon: -2.1 },
    'East England': { lat: 52.2, lon: 0.5 },
    'South Wales': { lat: 51.7, lon: -3.4 },
    'London': { lat: 51.5, lon: -0.1 },
    'South East England': { lat: 51.0, lon: 0.2 },
    'Southern England': { lat: 51.2, lon: -1.3 },
    'South West England': { lat: 50.8, lon: -3.6 },
};

// Map Bounding Box for the SVG Projection
// These match the visual bounds of the SVG below.
const MIN_LAT = 49.8;
const MAX_LAT = 59.5; // Includes Orkney/Shetland range
const MIN_LON = -8.5; // Ireland/Western Isles
const MAX_LON = 2.0;  // East Anglia

const getPosition = (lat: number, lon: number) => {
    // Mercator-ish projection adjustment (simple linear is usually okay for this scale, but aspect ratio matters)
    // SVG is 600x800 approx.
    const yPct = 1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT);
    const xPct = (lon - MIN_LON) / (MAX_LON - MIN_LON);

    return {
        x: xPct * 100,
        y: yPct * 100
    };
};

export function UKMap({ regions, onRegionSelect, selectedRegionId }: UKMapProps) {

    return (
        <div className="relative w-full aspect-[0.75] max-w-sm mx-auto my-4 select-none">
            {/* Detailed UK Map SVG */}
            <div className="absolute inset-0 -z-10 group">
                <svg viewBox="0 0 600 800" className="w-full h-full drop-shadow-xl" aria-hidden="true" style={{ overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="ukGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" className="stop-color-muted-foreground/30" />
                            <stop offset="100%" className="stop-color-muted-foreground/10" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* GB Mainland */}
                    <path
                        d="M176,736 L139,715 L161,698 L191,698 L199,673 L180,661 L182,637 L216,637 L237,605 L218,590 L232,572 L213,556 L237,532 L221,495 L240,486 L231,464 L251,446 L242,429 L262,408 L251,385 L269,363 L260,337 L290,310 L287,272 L315,249 L348,249 L359,219 L393,219 L409,191 L409,152 L440,122 L467,152 L454,196 L488,230 L470,268 L488,300 L469,343 L490,366 L490,402 L514,417 L539,403 L556,423 L530,446 L550,479 L530,513 L508,513 L497,542 L469,548 L460,572 L429,572 L411,593 L375,593 L359,619 L329,619 L315,639 L332,668 L360,668 L368,690 L409,683 L425,702 L425,716 L377,716 L362,703 L325,703 L312,718 L269,718 L260,703 L245,712 L223,695 L200,709 Z M312,98 L332,82 L356,98 L350,128 L329,140 L305,122 Z"
                        className="fill-muted/10 stroke-primary/30 stroke-[2] hover:fill-primary/5 transition-all duration-350"
                        style={{ filter: 'url(#glow)' }}
                    />

                    {/* Northern Ireland */}
                    <path
                        d="M110,485 L145,475 L165,510 L135,540 L105,525 Z"
                        className="fill-muted/10 stroke-primary/30 stroke-[2] hover:fill-primary/5 transition-all duration-350"
                        style={{ filter: 'url(#glow)' }}
                    />
                </svg>
            </div>

            <div className="absolute bottom-2 right-4 text-[10px] text-muted-foreground/40 font-medium">
                Geographic View
            </div>

            {/* Region Markers */}
            {regions.map((region) => {
                let coords = REGION_COORDS[region.shortname];
                if (!coords) {
                    if (region.shortname.includes('Merseyside')) coords = REGION_COORDS['Merseyside and Northern Wales'];
                    if (region.shortname.includes('South England')) coords = REGION_COORDS['Southern England'];
                }

                if (!coords) return null;

                const { x, y } = getPosition(coords.lat, coords.lon);
                const colorClass = getIntensityColor(region.intensity.index);
                const isSelected = selectedRegionId === region.regionid;

                return (
                    <motion.button
                        key={region.regionid}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: isSelected ? 1.4 : 1, opacity: 1, zIndex: isSelected ? 50 : 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={cn(
                            "absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex items-center justify-center shadow-md transition-all duration-300",
                            colorClass,
                            isSelected ? "ring-4 ring-background shadow-xl" : "opacity-90 hover:opacity-100 hover:scale-110 hover:z-20 border-2 border-background/50 text-white"
                        )}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        onClick={() => onRegionSelect?.(region.regionid)}
                    >
                        {isSelected && (
                            <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-30 pointer-events-none" />
                        )}
                        <span className="text-[10px] font-bold drop-shadow-md z-10">
                            {region.intensity.forecast}
                        </span>
                        {isSelected && (
                            <motion.div
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute -bottom-8 bg-popover/95 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs shadow-lg border border-border/50 font-semibold whitespace-nowrap text-popover-foreground z-50 pointer-events-none"
                            >
                                {region.shortname}
                            </motion.div>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
