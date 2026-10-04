import { DriveStep } from 'driver.js';

/** Short first-run tour: decision first, then scene + plan. Cap at 3 steps. */
export const PRODUCT_TOUR_STEPS: DriveStep[] = [
    {
        element: '[data-tour="now-or-wait"]',
        popover: {
            title: 'Now or wait?',
            description: 'Start here. Use energy when the grid is clean, or wait for the next green window. Everything else supports this decision.',
            side: 'bottom',
            align: 'center'
        }
    },
    {
        element: '[data-tour="intensity-gauge"]',
        popover: {
            title: 'Live grid scene',
            description: 'The big number is today’s carbon intensity. Lower is greener — and the landscape behind it shifts with how clean the grid feels.',
            side: 'bottom',
            align: 'center'
        }
    },
    {
        element: '[data-tour="nav-plan"]',
        popover: {
            title: 'Plan a load',
            description: 'Schedule EV charging, washing, or other heavy loads for the greenest window. Open Plan anytime from here.',
            side: 'top',
            align: 'start'
        }
    }
];
