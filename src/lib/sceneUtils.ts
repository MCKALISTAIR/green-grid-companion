
import { TimeOfDay } from '@/hooks/useTimeOfDay';
import { WeatherData } from '@/hooks/useWeatherData';

// Time-based sky gradient colors
export const TIME_SKY_COLORS: Record<TimeOfDay, { start: string; mid: string; end: string }> = {
    night: { start: 'hsl(230 70% 25%)', mid: 'hsl(240 60% 35%)', end: 'hsl(250 50% 40%)' }, // Richer blues for clean nights
    dawn: { start: 'hsl(280 40% 35%)', mid: 'hsl(30 60% 55%)', end: 'hsl(45 50% 70%)' },
    morning: { start: 'hsl(200 80% 60%)', mid: 'hsl(195 70% 70%)', end: 'hsl(180 50% 75%)' },
    midday: { start: 'hsl(200 90% 55%)', mid: 'hsl(195 80% 65%)', end: 'hsl(150 60% 75%)' },
    afternoon: { start: 'hsl(200 70% 60%)', mid: 'hsl(190 60% 68%)', end: 'hsl(160 50% 72%)' },
    sunset: { start: 'hsl(30 70% 50%)', mid: 'hsl(20 80% 60%)', end: 'hsl(280 40% 45%)' },
    dusk: { start: 'hsl(260 50% 35%)', mid: 'hsl(270 45% 40%)', end: 'hsl(240 40% 30%)' },
};

export function getSkyGradient(index: string, timeOfDay: TimeOfDay, cleanliness: number, weather?: WeatherData): string {
    const params = getSkyParams(index, timeOfDay, cleanliness, weather);
    return params.gradient;
}

export function getSkyTopColor(index: string, timeOfDay: TimeOfDay, cleanliness: number, weather?: WeatherData): string {
    const params = getSkyParams(index, timeOfDay, cleanliness, weather);
    return params.startColor;
}

function getSkyParams(index: string, timeOfDay: TimeOfDay, cleanliness: number, weather?: WeatherData): { gradient: string; startColor: string } {
    const timeColors = TIME_SKY_COLORS[timeOfDay] || TIME_SKY_COLORS['night'];

    if (!timeColors) {
        // Should structurally never happen if 'night' key exists, but safe fallback
        return {
            startColor: 'hsl(230 70% 25%)',
            gradient: 'linear-gradient(180deg, hsl(230 70% 25%) 0%, hsl(240 60% 35%) 40%, hsl(250 50% 40%) 100%)'
        };
    }
    // Weather modifies sky colors
    if (weather) {
        // Overcast/cloudy weather makes sky grayer
        if (weather.cloudCover > 70 || weather.isRaining) {
            const grayFactor = Math.min(weather.cloudCover / 100, 0.8);
            const startColor = `hsl(220 ${20 - grayFactor * 15}% ${45 + grayFactor * 10}%)`;
            return {
                startColor,
                gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(220 ${15 - grayFactor * 10}% ${55 + grayFactor * 5}%) 40%, 
        hsl(220 ${10 - grayFactor * 5}% ${60}%) 100%)`
            };
        }

        // Foggy weather
        if (weather.isFoggy) {
            const startColor = `hsl(0 0% 75%)`;
            return {
                startColor,
                gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(0 0% 80%) 40%, 
        hsl(0 0% 85%) 100%)`
            };
        }

        // Thunderstorm - dark dramatic sky
        if (weather.isThunderstorm) {
            const startColor = `hsl(240 30% 25%)`;
            return {
                startColor,
                gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(250 25% 35%) 40%, 
        hsl(260 20% 40%) 100%)`
            };
        }

        // Snowy weather - lighter, whiter sky
        if (weather.isSnowing) {
            const startColor = `hsl(210 20% 70%)`;
            return {
                startColor,
                gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(210 15% 80%) 40%, 
        hsl(210 10% 85%) 100%)`
            };
        }
    }

    // Default time-based gradient
    return {
        startColor: timeColors.start,
        gradient: `linear-gradient(180deg, ${timeColors.start} 0%, ${timeColors.mid} 40%, ${timeColors.end} 100%)`
    };
}

export function getCarbonIndex(intensity: number): string {
    if (intensity < 50) return 'very low';
    if (intensity < 150) return 'low';
    if (intensity < 250) return 'moderate';
    if (intensity < 350) return 'high';
    return 'very high';
}
