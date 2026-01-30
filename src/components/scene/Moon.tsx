import { motion } from 'framer-motion';

interface MoonProps {
  position?: number; // 0-1, arc position
  onDoubleClick?: () => void;
}

export function Moon({ position = 0.5, onDoubleClick }: MoonProps) {
  // Calculate position on arc
  const arcX = 20 + position * 60; // 20% to 80% of width
  const arcY = 10 + Math.sin(position * Math.PI) * -5; // Slight arc

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        right: `${arcX}%`,
        top: `${arcY}%`,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 1 }}
      onDoubleClick={onDoubleClick}
    >
      {/* Moon glow */}
      <div className="absolute inset-0 w-16 h-16 -translate-x-2 -translate-y-2 bg-card/20 rounded-full blur-xl" />

      {/* Moon body */}
      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-card via-card/90 to-muted shadow-lg">
        {/* Craters */}
        <div className="absolute top-2 left-3 w-2 h-2 rounded-full bg-muted/30" />
        <div className="absolute top-5 right-2 w-3 h-3 rounded-full bg-muted/20" />
        <div className="absolute bottom-3 left-4 w-1.5 h-1.5 rounded-full bg-muted/25" />
        <div className="absolute bottom-2 right-3 w-2 h-2 rounded-full bg-muted/15" />
      </div>
    </motion.div>
  );
}
