import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeech } from '@/hooks/useSpeech';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Volume2, VolumeX, MessageSquare } from 'lucide-react';

interface WattssonProps {
    intensity: number;
    className?: string;
}

const SnarkyPhrases: Record<'very-clean' | 'clean' | 'moderate' | 'dirty' | 'very-dirty', string[]> = {
    'very-clean': [
        "The grid is cleaner than my search history right now.",
        "Go charge your EV, run your dryer, and heat your pool. It's green energy galore!",
        "Ah, the sweet smell of zero-carbon electron bliss. I am ecstatic!",
        "I'm glowing so bright green I might need sunscreen. Go wild!"
    ],
    'clean': [
        "Renewables are flexing their muscles today. Good job, weather!",
        "Mostly wind and solar. You have my permission to turn on the dishwasher.",
        "A highly respectable carbon count. Let's keep it this way.",
        "The electrons are organic and free-range right now. Enjoy!"
    ],
    'moderate': [
        "The grid is... okay. Not terrible, not great. Just like my high school report cards.",
        "Meh. Some wind, some gas. A classic British compromise.",
        "Run the washing machine if you must, but don't start welding in the garage.",
        "Average carbon level. Neither a crime nor a celebration. Proceed with caution."
    ],
    'dirty': [
        "Eww. The electricity is a bit spicy today. Avoid heavy loads.",
        "Gas plants are putting in overtime. Maybe put the laundry off for a bit?",
        "Carbon levels are climbing. I'm feeling a little dim.",
        "The grid is looking dusty. Try shifting your usage to later!"
    ],
    'very-dirty': [
        "The grid is coughing! Seriously, unplug that toaster before we melt the ice caps.",
        "Coal is having a party and you're paying for it. Put the dryer down!",
        "Eww, carbon soup. Running your oven now is a personal insult to polar bears.",
        "Absolute filth flowing through the wires. I'm wearing a virtual gas mask."
    ]
};

export function Wattsson({ intensity, className }: WattssonProps) {
    const { speak, isMuted, toggleMute, isSupported } = useSpeech();
    const { impactMedium } = useHaptics();
    const shouldReduceMotion = useReducedMotion();
    
    const [bubbleText, setBubbleText] = useState<string | null>(null);
    const [clickCount, setClickCount] = useState(0);

    // Determine band
    const getBand = (val: number): 'very-clean' | 'clean' | 'moderate' | 'dirty' | 'very-dirty' => {
        if (val < 50) return 'very-clean';
        if (val < 150) return 'clean';
        if (val < 250) return 'moderate';
        if (val < 350) return 'dirty';
        return 'very-dirty';
    };

    const band = getBand(intensity);

    const handleTap = () => {
        impactMedium();
        
        // Pick a phrase
        const phrases = SnarkyPhrases[band];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        
        setBubbleText(randomPhrase);
        setClickCount(prev => prev + 1);

        // Speak the phrase (will respect mute state)
        speak(randomPhrase);
    };

    // Auto-hide bubble after 5 seconds
    useEffect(() => {
        if (!bubbleText) return;
        const timer = setTimeout(() => {
            setBubbleText(null);
        }, 6000);
        return () => clearTimeout(timer);
    }, [bubbleText, clickCount]);

    const isAbsolute = className?.includes('absolute') || className?.includes('fixed');
    const positionClass = isAbsolute ? '' : 'relative';

    return (
        <div className={`${positionClass} flex items-center gap-3 z-40 ${className || ''}`}>
            {/* Speech Bubble */}
            <AnimatePresence>
                {bubbleText && (
                    <motion.div
                        initial={!shouldReduceMotion ? { opacity: 0, scale: 0.8, y: 15, x: 20 } : { opacity: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={!shouldReduceMotion ? { opacity: 0, scale: 0.8, y: 10 } : { opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="absolute bottom-24 right-0 min-w-[200px] max-w-[280px] bg-card text-card-foreground border border-border rounded-2xl p-3 shadow-xl z-50 text-xs md:text-sm font-medium flex flex-col gap-2"
                    >
                        <div className="flex justify-between items-start gap-2">
                            <span className="text-primary font-bold">Wattsson</span>
                            {isSupported && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMute();
                                    }}
                                    className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                                    aria-label={isMuted ? "Unmute voice" : "Mute voice"}
                                    title={isMuted ? "Unmute voice" : "Mute voice"}
                                >
                                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-primary" />}
                                </button>
                            )}
                        </div>
                        <p className="leading-relaxed">{bubbleText}</p>
                        
                        {/* Tail */}
                        <div className="absolute -bottom-2 right-8 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Wattsson Mascot Body */}
            <motion.div
                className="cursor-pointer select-none relative group pointer-events-auto"
                onClick={handleTap}
                whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: [0, -5, 5, 0] } : {}}
                whileTap={!shouldReduceMotion ? { scale: 0.95 } : {}}
                animate={!shouldReduceMotion ? {
                    y: [0, -6, 0],
                } : {}}
                transition={{
                    y: {
                        repeat: Infinity,
                        duration: 4,
                        ease: 'easeInOut' as const,
                    },
                    scale: { type: 'spring', stiffness: 400, damping: 15 }
                }}
            >
                {/* Glow Backdrop */}
                <motion.div
                    className="absolute inset-0 w-16 h-16 rounded-full blur-xl opacity-60 -translate-x-2 -translate-y-2 pointer-events-none"
                    style={{
                        backgroundColor: 
                            band === 'very-clean' ? 'rgb(34, 197, 94)' : 
                            band === 'clean' ? 'rgb(74, 222, 128)' : 
                            band === 'moderate' ? 'rgb(234, 179, 8)' : 
                            band === 'dirty' ? 'rgb(249, 115, 22)' : 
                            'rgb(239, 68, 68)'
                    }}
                    animate={!shouldReduceMotion ? {
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.7, 0.4]
                    } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Mascot SVG */}
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                    {/* Brass Base */}
                    <path d="M20 38H28V41C28 42.1 27.1 43 26 43H22C20.9 43 20 42.1 20 41V38Z" fill="#94a3b8" />
                    <rect x="18" y="34" width="12" height="4" rx="1" fill="#cbd5e1" />
                    <line x1="20" y1="36" x2="28" y2="36" stroke="#94a3b8" strokeWidth="1" />
                    
                    {/* Glass Bulb */}
                    <path
                        d="M14 22C14 16.48 18.48 12 24 12C29.52 12 34 16.48 34 22C34 26.68 31 30.5 28 34H20C17 30.5 14 26.68 14 22Z"
                        fill={
                            band === 'very-clean' ? 'rgba(34, 197, 94, 0.15)' : 
                            band === 'clean' ? 'rgba(74, 222, 128, 0.12)' : 
                            band === 'moderate' ? 'rgba(234, 179, 8, 0.12)' : 
                            band === 'dirty' ? 'rgba(249, 115, 22, 0.12)' : 
                            'rgba(239, 68, 68, 0.12)'
                        }
                        stroke={
                            band === 'very-clean' ? '#22c55e' : 
                            band === 'clean' ? '#4ade80' : 
                            band === 'moderate' ? '#eab308' : 
                            band === 'dirty' ? '#f97316' : 
                            '#ef4444'
                        }
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    />

                    {/* Filament (changes color based on grid state) */}
                    <path
                        d="M20 28L22 21L24 24L26 21L28 28"
                        stroke={
                            band === 'very-clean' ? '#22c55e' : 
                            band === 'clean' ? '#4ade80' : 
                            band === 'moderate' ? '#eab308' : 
                            band === 'dirty' ? '#f97316' : 
                            '#ef4444'
                        }
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={band === 'very-clean' || band === 'clean' ? 'animate-pulse' : ''}
                    />

                    {/* Soot smudges for dirty grid */}
                    {(band === 'dirty' || band === 'very-dirty') && (
                        <>
                            <circle cx="16" cy="18" r="2" fill="#475569" opacity="0.6" />
                            <circle cx="32" cy="26" r="1.5" fill="#475569" opacity="0.6" />
                            <path d="M15 28Q17 29 16 31" stroke="#475569" strokeWidth="1.5" opacity="0.6" />
                        </>
                    )}

                    {/* Eyes and Mouth based on state */}
                    {band === 'very-clean' && (
                        // Ecstatic with Cool Glasses
                        <g>
                            {/* Sunglasses */}
                            <rect x="15" y="17" width="8" height="5" rx="1" fill="#0f172a" />
                            <rect x="25" y="17" width="8" height="5" rx="1" fill="#0f172a" />
                            <line x1="23" y1="19" x2="25" y2="19" stroke="#0f172a" strokeWidth="2" />
                            <line x1="13" y1="18" x2="15" y2="18" stroke="#0f172a" strokeWidth="1.5" />
                            <line x1="33" y1="18" x2="35" y2="18" stroke="#0f172a" strokeWidth="1.5" />
                            {/* Smiling Mouth */}
                            <path d="M21 26Q24 29 27 26" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                        </g>
                    )}

                    {band === 'clean' && (
                        // Joyful eyes, big grin
                        <g>
                            {/* Joyful arched eyes */}
                            <path d="M16 20Q18 18 20 20" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
                            <path d="M28 20Q30 18 32 20" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
                            {/* Big Smile */}
                            <path d="M20 24Q24 28 28 24" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
                        </g>
                    )}

                    {band === 'moderate' && (
                        // Neutral, peaceful
                        <g>
                            {/* Simple dot eyes */}
                            <circle cx="18" cy="19" r="1.5" fill="#1e293b" />
                            <circle cx="30" cy="19" r="1.5" fill="#1e293b" />
                            {/* Straight/slight smile mouth */}
                            <path d="M21 25Q24 26 27 25" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                        </g>
                    )}

                    {band === 'dirty' && (
                        // Annoyed
                        <g>
                            {/* Slanted angry eyebrows + eyes */}
                            <line x1="15" y1="16" x2="20" y2="18" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="18" cy="20" r="1.5" fill="#1e293b" />
                            
                            <line x1="33" y1="16" x2="28" y2="18" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="30" cy="20" r="1.5" fill="#1e293b" />
                            
                            {/* Slight frown */}
                            <path d="M21 26Q24 24 27 26" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                        </g>
                    )}

                    {band === 'very-dirty' && (
                        // Coughing/Gas mask or extreme distress
                        <g>
                            {/* Worried cross eyes (X X) */}
                            <path d="M16 18L20 22M20 18L16 22" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                            <path d="M28 18L32 22M32 18L28 22" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                            
                            {/* Gas mask outline simplified (circle at snout) */}
                            <circle cx="24" cy="27" r="4.5" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
                            <circle cx="24" cy="27" r="1.5" fill="#334155" />
                        </g>
                    )}
                </svg>

                {/* Spark / Indicator indicator when silent */}
                {isMuted && isSupported && (
                    <div className="absolute -top-1 -right-1 bg-muted-foreground/80 text-white rounded-full p-0.5 pointer-events-none scale-75">
                        <VolumeX className="w-3 h-3" />
                    </div>
                )}
            </motion.div>
        </div>
    );
}
