import { cn } from "@/lib/utils";

interface TurbineSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Wind turbine spinner component for loading states.
 * Matches the app's green energy branding.
 */
export function TurbineSpinner({ className, size = "md" }: TurbineSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <svg
      viewBox="0 0 40 40"
      className={cn(sizeClasses[size], "text-primary motion-reduce:animate-none", className)}
      aria-label="Loading"
    >
      {/* Tower */}
      <path
        d="M19 20 L18 38 L22 38 L21 20 Z"
        fill="currentColor"
        opacity="0.6"
      />

      {/* Hub */}
      <circle cx="20" cy="18" r="2.5" fill="currentColor" />

      {/* Blades - rotating group */}
      <g className="origin-center animate-spin" style={{ transformOrigin: "20px 18px" }}>
        {/* Blade 1 - pointing up */}
        <path
          d="M20 18 L19 4 Q20 2 21 4 L20 18 Z"
          fill="currentColor"
        />
        {/* Blade 2 - pointing bottom-left */}
        <path
          d="M20 18 L8 26 Q7 24 9 23 L20 18 Z"
          fill="currentColor"
        />
        {/* Blade 3 - pointing bottom-right */}
        <path
          d="M20 18 L32 26 Q33 24 31 23 L20 18 Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
