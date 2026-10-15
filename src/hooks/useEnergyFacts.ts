import { useState, useEffect, useCallback } from 'react';
import { EnergyFact, getRandomFact, FactContext } from '@/lib/energyFacts';
import { factPoolFor, readTone, writeTone, type CommentaryTone } from '@/lib/tone';

export function useEnergyFacts() {
  const [tone, setTone] = useState<CommentaryTone>(() => readTone());

  const [currentFact, setCurrentFact] = useState<EnergyFact | null>(null);

  // Persist preference
  useEffect(() => {
    writeTone(tone);
  }, [tone]);

  const updateTone = (newTone: CommentaryTone) => {
    setTone(newTone);
  };

  const refreshFact = useCallback(
    (context: FactContext) => {
      setCurrentFact((prev) => getRandomFact(context, factPoolFor(tone), prev?.id));
    },
    [tone],
  );

  return {
    tone,
    setTone: updateTone,
    currentFact,
    refreshFact,
  };
}
