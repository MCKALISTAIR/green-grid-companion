import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TurbineSpinner } from "./turbine-spinner";

const LOADING_TIPS = [
  "Did you know? Running appliances during 'green status' hours can reduce your carbon footprint by up to 50%.",
  "Tip: Lowering your wash temperature to 30°C saves around 38% energy compared to a 40°C wash.",
  "Did you know? Leaving devices on standby accounts for up to 10% of an average UK home's electricity bill.",
  "Tip: Smart charging your EV overnight helps balance the national grid and utilizes clean wind energy.",
  "Did you know? Wind turbines produce their maximum energy output during breezy, overcast UK afternoons.",
  "Tip: Boil only the amount of water you need in your kettle to save energy and speed up your tea break.",
  "Did you know? LED light bulbs use up to 80% less energy and last 25 times longer than incandescent bulbs."
];

interface PageLoaderProps {
  message?: string;
  fullscreen?: boolean;
}

export function PageLoader({ message, fullscreen = true }: PageLoaderProps) {
  const [tipIndex, setTipIndex] = useState(0);

  // Cycle tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const containerClasses = fullscreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-background/80 backdrop-blur-md"
    : "flex flex-col items-center justify-center p-8 w-full min-h-[300px] rounded-2xl glass-card";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center max-w-sm text-center gap-6">
        {/* Animated Turbine with pulsing glow ring */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Ambient Glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5"
            animate={{
              scale: [0.9, 1.15, 0.9],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-primary/10 bg-primary/2"
            animate={{
              scale: [1.1, 0.85, 1.1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <TurbineSpinner size="lg" className="z-10 text-primary relative filter drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
        </div>

        {/* Loading Message */}
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {message || "Optimizing Energy"}
          </h3>
          <p className="text-xs text-muted-foreground animate-pulse">
            Connecting to Green Grid...
          </p>
        </div>

        {/* Cycling Energy-saving Tips */}
        <div className="min-h-[64px] flex items-center justify-center px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 w-full glass-card">
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-xs text-foreground/80 font-medium leading-relaxed"
            >
              {LOADING_TIPS[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
