import type { TimeOfDay } from '@/hooks/useTimeOfDay';

/**
 * Night for the scene (moon, stars, lit windows): night and dusk only. Dawn is
 * not night. Shared by the real clock (useTimeOfDay) and the SceneTest and
 * Director Mode overrides in IntensityScene, so previews match production.
 */
export function isNightTimeOfDay(timeOfDay: TimeOfDay): boolean {
  return timeOfDay === 'night' || timeOfDay === 'dusk';
}
