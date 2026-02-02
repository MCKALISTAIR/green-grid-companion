import { motion } from 'framer-motion';

interface MoonProps {
  position?: number; // 0-1, arc position
  onDoubleClick?: () => void;
}

export function Moon({ position = 0.5, onDoubleClick }: MoonProps) {
  // Calculate position on arc
  const arcX = 20 + position * 60; // 20% to 80% of width
  const arcY = 15 + Math.sin(position * Math.PI) * -5; // Slight arc, pushed down to 10-15% range

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
      onKeyDown={(e) => {
        if (onDoubleClick && (e.key === 'Enter' || e.key === ' ')) {
          onDoubleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Moon - Double click or press Enter to trigger meteor shower"
    >
      {/* Moon glow - stronger and wider */}
      <div className="absolute inset-0 w-24 h-24 -translate-x-6 -translate-y-6 bg-white/20 rounded-full blur-2xl" />

      {/* Moon body - Explicitly light color to stand out in dark mode */}
      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#fffdf5] via-[#e2e8f0] to-[#cbd5e1] shadow-[0_0_15px_rgba(255,255,255,0.5)] overflow-hidden">
        {/* Subtle texture/noise overlay could go here, but craters are enough for now */}

        {/* Craters - darker grey, slightly blurry */}
        <div className="absolute top-2 left-3 w-2.5 h-2.5 rounded-full bg-[#94a3b8]/40 shadow-inner" />
        <div className="absolute top-5 right-2 w-3.5 h-3.5 rounded-full bg-[#94a3b8]/30 shadow-inner" />
        <div className="absolute bottom-3 left-4 w-1.5 h-1.5 rounded-full bg-[#94a3b8]/50 shadow-inner" />
        <div className="absolute bottom-2 right-3 w-2.5 h-2.5 rounded-full bg-[#94a3b8]/30 shadow-inner" />
        <div className="absolute top-1 right-4 w-1 h-1 rounded-full bg-[#94a3b8]/40 shadow-inner" />
      </div>
    </motion.div>
  );
}
