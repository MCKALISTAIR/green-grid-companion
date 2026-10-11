import { DriveStep } from 'driver.js';
import type { CommentaryTone } from '@/lib/tone';

/**
 * First-run tips: two, both skippable, shown once the first real number is on screen.
 * (Replaces the 3-step tour. "Plan a load" is already a link on the Now-or-wait card.)
 */
export function buildProductTourSteps(opts: { tone: CommentaryTone; national: boolean }): DriveStep[] {
    const numberTip = opts.national
        ? "That's the GB average carbon intensity for this half hour, in grams of CO₂ per kWh. Lower is cleaner."
        : "That's your region's carbon intensity for this half hour, in grams of CO₂ per kWh. Lower is cleaner.";
    const decisionTip = 'Got a wash or the dishwasher to run? This says go now or wait, from the forecast.';
    return [
        {
            element: '[data-tour="intensity-gauge"]',
            popover: {
                title: 'Your number',
                description: numberTip,
                side: 'bottom',
                align: 'center',
            },
        },
        {
            element: '[data-tour="now-or-wait"]',
            popover: {
                title: 'Now or wait',
                description:
                    opts.tone === 'cheeky' ? `${decisionTip} We'll do the maths, you do the laundry.` : decisionTip,
                side: 'top',
                align: 'center',
            },
        },
    ];
}
