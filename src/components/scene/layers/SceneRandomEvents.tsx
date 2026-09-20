import { UFO, ElectricDrone, SteamTrain } from '../CarrotEvents';

export type SceneRandomEvent = 'none' | 'ufo' | 'drone' | 'train';

export interface SceneRandomEventsProps {
  activeEvent: SceneRandomEvent;
  onComplete: () => void;
}

export function SceneRandomEvents({ activeEvent, onComplete }: SceneRandomEventsProps) {
  if (activeEvent === 'ufo') return <UFO onComplete={onComplete} />;
  if (activeEvent === 'drone') return <ElectricDrone onComplete={onComplete} />;
  if (activeEvent === 'train') return <SteamTrain onComplete={onComplete} />;
  return null;
}
