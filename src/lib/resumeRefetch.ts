/**
 * Query keys force-refetched when the native app resumes. Each must match a
 * real queryKey prefix in useCarbonData (BH-66: 'generationMix' never matched).
 */
export const RESUME_REFETCH_KEYS = [
  ['national'],
  ['regional'],
  ['forecast'],
  ['generation'],
] as const;
