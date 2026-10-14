import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

export function useReducedMotion() {
  // Use framer-motion's hook which respects system preference
  const shouldReduceMotion = useFramerReducedMotion();
  return shouldReduceMotion ?? false;
}
