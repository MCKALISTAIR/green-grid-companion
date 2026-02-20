import { DriveStep } from 'driver.js';

export const PRODUCT_TOUR_STEPS: DriveStep[] = [
    {
        element: '[data-tour="intensity-gauge"]',
        popover: {
            title: '⚡ Live Carbon Intensity',
            description: 'This gauge shows real-time carbon intensity for your region. Lower numbers mean greener energy! The scene above changes based on how clean the grid is right now.',
            side: 'bottom',
            align: 'center'
        }
    },
    {
        element: '[data-tour="forecast-chart"]',
        popover: {
            title: '📊 24-Hour Forecast',
            description: 'Plan ahead! Tap any bar to see detailed predictions. The green zones are perfect for charging EVs or running dishwashers.',
            side: 'top',
            align: 'center'
        }
    },
    {
        element: '[data-tour="generation-mix"]',
        popover: {
            title: '🔋 Generation Mix',
            description: 'See where your electricity comes from right now. Tap to explore the full breakdown of wind, solar, gas, nuclear and more. Pro tip: Try clicking the wind turbines in the scene above!',
            side: 'top',
            align: 'center'
        }
    },
    {
        element: '[data-tour="nav-plan"]',
        popover: {
            title: '🗓️ Power Planner',
            description: 'Schedule high-energy tasks for the greenest times. Perfect for EV charging, washing machines, and dishwashers. Save money and reduce your carbon footprint!',
            side: 'top',
            align: 'center'
        }
    },
    {
        element: '[data-tour="nav-history"]',
        popover: {
            title: '📜 Grid History',
            description: 'Browse past carbon intensity data and compare forecasts to actual results. Use the Time Machine feature to explore historical grid data!',
            side: 'top',
            align: 'center'
        }
    },
    {
        element: '[data-tour="nav-rank"]',
        popover: {
            title: '🏆 Regional Rankings',
            description: 'See how your region compares to the rest of the UK. Find out which areas have the cleanest energy right now.',
            side: 'top',
            align: 'center'
        }
    },
    {
        element: '[data-tour="view-footprint"]',
        popover: {
            title: '🌱 Track Your Footprint',
            description: 'Link your Octopus Energy smart meter to see your actual carbon emissions, green energy percentage, and personalized savings tips.',
            side: 'bottom',
            align: 'center'
        }
    }
];
