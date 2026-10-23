import type { ReactNode } from 'react';
import { SceneDirectorContext, useSceneDirectorState } from '@/hooks/useSceneDirector';

/** One Director Mode state for the whole app, so DirectorPanel overrides reach the scene. */
export function SceneDirectorProvider({ children }: { children: ReactNode }) {
  const value = useSceneDirectorState();
  return <SceneDirectorContext.Provider value={value}>{children}</SceneDirectorContext.Provider>;
}
