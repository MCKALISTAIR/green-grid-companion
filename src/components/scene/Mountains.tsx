import { motion } from 'framer-motion';

interface MountainsProps {
  cleanliness: number;
}

export function Mountains({ cleanliness }: MountainsProps) {
  // Color based on cleanliness
  const mountainColor =
    cleanliness > 0.5
      ? 'hsl(220 30% 45%)' // Blue-grey for clean
      : 'hsl(30 20% 40%)'; // Brown-grey for dirty

  const mountainColorLight = cleanliness > 0.5 ? 'hsl(220 25% 55%)' : 'hsl(30 15% 50%)';

  return (
    <motion.div
      className="absolute bottom-24 left-0 right-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <svg
        viewBox="0 0 400 80"
        className="w-full h-20"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Distant mountains */}
        <path
          d="M0,80 L0,60 L30,35 L60,55 L90,30 L130,50 L160,25 L200,45 L240,20 L280,40 L320,28 L360,48 L400,30 L400,80 Z"
          fill={mountainColor}
          opacity="0.4"
        />

        {/* Mid mountains */}
        <path
          d="M0,80 L0,65 L50,45 L100,60 L150,40 L200,55 L250,35 L300,50 L350,42 L400,55 L400,80 Z"
          fill={mountainColorLight}
          opacity="0.5"
        />

        {/* Snow caps for clean air */}
        {cleanliness > 0.6 && (
          <>
            <path d="M88,32 L90,30 L92,32 L90,34 Z" fill="white" opacity="0.7" />
            <path d="M158,27 L160,25 L162,27 L160,29 Z" fill="white" opacity="0.7" />
            <path d="M238,22 L240,20 L242,22 L240,24 Z" fill="white" opacity="0.7" />
          </>
        )}
      </svg>
    </motion.div>
  );
}
