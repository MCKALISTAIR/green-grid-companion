import { useState, useEffect, useCallback } from 'react';
import { EnergyFact, getRandomFact, FactContext, FactTone } from '@/lib/energyFacts';

type TonePreference = FactTone | 'mixed';

const PREFS_KEY = 'gridgreen-fact-prefs';

export function useEnergyFacts() {
    const [tone, setTone] = useState<TonePreference>(() => {
        const saved = localStorage.getItem(PREFS_KEY);
        return (saved as TonePreference) || 'friendly';
    });

    const [currentFact, setCurrentFact] = useState<EnergyFact | null>(null);

    // Persist preference
    useEffect(() => {
        localStorage.setItem(PREFS_KEY, tone);
    }, [tone]);

    const updateTone = (newTone: TonePreference) => {
        setTone(newTone);
    };

    const refreshFact = useCallback((context: FactContext) => {
        const fact = getRandomFact(context, tone);
        setCurrentFact(fact);
    }, [tone]);

    return {
        tone,
        setTone: updateTone,
        currentFact,
        refreshFact
    };
}
