import { useState, useEffect, useCallback } from 'react';

const MUTE_KEY = 'gridsense-voice-mute';

export function useSpeech() {
    const [isSupported, setIsSupported] = useState(false);
    const [isMuted, setIsMuted] = useState(() => {
        try {
            const saved = localStorage.getItem(MUTE_KEY);
            // Default to MUTED (true) to respect silent by default
            return saved !== null ? saved === 'true' : true;
        } catch {
            return true;
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            setIsSupported(true);
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newVal = !prev;
            try {
                localStorage.setItem(MUTE_KEY, String(newVal));
            } catch (e) {
                console.error('Failed to write voice mute state', e);
            }
            if (newVal && typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            return newVal;
        });
    }, []);

    const speak = useCallback((text: string) => {
        if (isMuted || !isSupported) return;

        try {
            window.speechSynthesis.cancel(); // Stop current speech
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Wattsson voice tuning: slightly higher pitch for cartoon/robot spark energy
            utterance.pitch = 1.35;
            utterance.rate = 1.05;

            // Try to find a standard English voice
            const voices = window.speechSynthesis.getVoices();
            const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                            voices.find(v => v.lang.startsWith('en')) || 
                            voices[0];
            
            if (enVoice) {
                utterance.voice = enVoice;
            }

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis failed:', error);
        }
    }, [isMuted, isSupported]);

    return {
        isSupported,
        isMuted,
        toggleMute,
        speak
    };
}
