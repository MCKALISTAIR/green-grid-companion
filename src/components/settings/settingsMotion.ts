export const settingsContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    // Short stagger so sections settle after the page slide, not a second entrance.
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

export const settingsItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
};
