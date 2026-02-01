import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

export default function Help() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] max-w-2xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-4">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>

                <div>
                    <h1 className="text-2xl font-bold">Help & Tips</h1>
                    <p className="text-muted-foreground">Quick answers to common questions</p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="getting-started">
                        <AccordionTrigger>Getting Started</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>What is GridSense?</strong></p>
                                <p>GridSense shows you real-time carbon intensity data for the UK electricity grid, helping you use energy when it's greenest.</p>

                                <p className="pt-2"><strong>How do I change my region?</strong></p>
                                <p>Tap the region name at the top of the intensity card on the home screen. You can search by postcode, town name, or use your current location.</p>

                                <p className="pt-2"><strong>What do the numbers mean?</strong></p>
                                <p>The main number shows grams of CO₂ per kilowatt-hour (gCO₂/kWh). Lower numbers mean cleaner, greener energy.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="understanding-data">
                        <AccordionTrigger>Understanding Your Data</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>Intensity Levels:</strong></p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Very Low (0-50g)</strong>: Best time to use energy</li>
                                    <li><strong>Low (50-100g)</strong>: Good time to use energy</li>
                                    <li><strong>Moderate (100-150g)</strong>: Average carbon intensity</li>
                                    <li><strong>High (150-200g)</strong>: Try to defer usage if possible</li>
                                    <li><strong>Very High (200g+)</strong>: Avoid heavy usage</li>
                                </ul>

                                <p className="pt-2"><strong>How often does data update?</strong></p>
                                <p>Data updates every 30 minutes from the National Grid. Pull down on the home screen to manually refresh.</p>

                                <p className="pt-2"><strong>Why do regions differ?</strong></p>
                                <p>The UK grid is divided into regions with different generation mixes. Windy Scotland often has lower intensity than areas relying on gas power.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="interactive-features">
                        <AccordionTrigger>Interactive Features</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>Hidden Interactions:</strong></p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Tap wind turbines to trigger overdrive mode</li>
                                    <li>Tap the sun or moon for day/night cycle</li>
                                    <li>Tap energy insights bubble to cycle through tips</li>
                                    <li>Watch for roaming animals in the scene</li>
                                    <li>Pull down to refresh data</li>
                                </ul>

                                <p className="pt-2"><strong>Navigation:</strong></p>
                                <p>Swipe or tap the bottom tabs to access Power Planner, History, Leaderboard, and Settings.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="notifications">
                        <AccordionTrigger>Notifications</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>How do I set up alerts?</strong></p>
                                <p>Go to Settings → Notifications. Enable low intensity alerts to get notified when the grid is clean, or high intensity warnings when it's dirty.</p>

                                <p className="pt-2"><strong>What are daily forecasts?</strong></p>
                                <p>Get a summary of the day's carbon intensity forecast delivered at your chosen time each morning.</p>

                                <p className="pt-2"><strong>Why aren't I receiving notifications?</strong></p>
                                <p>Check that you've granted notification permissions in iOS Settings → GridSense → Notifications. Also ensure the alerts are enabled within the app.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="power-planner">
                        <AccordionTrigger>Power Planner</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>How does it work?</strong></p>
                                <p>The Power Planner shows you the best and worst times to use energy based on the 24-hour forecast. Green periods are ideal for charging devices or running appliances.</p>

                                <p className="pt-2"><strong>Planning strategies:</strong></p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Schedule dishwasher, washing machine for green periods</li>
                                    <li>Charge EVs and devices overnight when intensity is low</li>
                                    <li>Delay heavy usage during red "avoid" periods</li>
                                </ul>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="saved-locations">
                        <AccordionTrigger>Saved Locations</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>How do I save locations?</strong></p>
                                <p>When changing your region, look for the "Save as..." option after selecting a region. Give it a name like "Home" or "Work" for quick access.</p>

                                <p className="pt-2"><strong>Managing saved locations:</strong></p>
                                <p>In Settings, you'll find a "Saved Locations" section where you can view, edit, or delete saved locations.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="troubleshooting">
                        <AccordionTrigger>Troubleshooting</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>Data not updating:</strong></p>
                                <p>Pull down to refresh manually. If issues persist, check your internet connection.</p>

                                <p className="pt-2"><strong>Scene not loading:</strong></p>
                                <p>Try restarting the app. The animated scene requires good performance and may be simplified on older devices.</p>

                                <p className="pt-2"><strong>Integration issues:</strong></p>
                                <p>For Octopus or Tesla connections, check that you're logged in and have granted necessary permissions.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="privacy">
                        <AccordionTrigger>Privacy & Data</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 text-sm">
                                <p><strong>What data do you collect?</strong></p>
                                <p>We only store your preferences locally on your device. Location data is used solely to fetch regional carbon intensity and is never shared.</p>

                                <p className="pt-2"><strong>Account data:</strong></p>
                                <p>If you connect Octopus or Tesla, we use secure OAuth authentication. Your credentials are never stored in our app.</p>

                                <p className="pt-2">For full details, see our Privacy Policy in Settings → Resources.</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="pt-6 text-center text-sm text-muted-foreground">
                    <p>Still need help? Check out our detailed <Button variant="link" onClick={() => navigate('/feature-guides')} className="h-auto p-0">Feature Guides</Button></p>
                </div>
            </div>
        </div>
    );
}
