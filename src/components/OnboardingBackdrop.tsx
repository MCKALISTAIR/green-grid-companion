/**
 * Static dusk countryside wash for the first-launch postcode screen.
 *
 * Kept deliberately light: no live scene stack, weather hooks, or motion libs.
 * Onboarding only needs atmosphere so the logo spin stays smooth over the card blur.
 */
export function OnboardingBackdrop() {
  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-80"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, hsl(260 50% 35%) 0%, hsl(270 45% 40%) 40%, hsl(240 40% 30%) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[48%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, hsl(222 40% 12% / 0.55) 45%, hsl(222 45% 8%) 100%)',
        }}
      />
      <svg
        className="absolute inset-x-0 bottom-0 w-full h-[40%]"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <path
          d="M0 28 C15 18 28 22 42 16 C55 10 68 14 82 12 C90 11 96 14 100 16 L100 40 L0 40 Z"
          fill="hsl(222 35% 14%)"
        />
        <path
          d="M0 32 C20 24 35 28 50 22 C65 16 80 24 100 20 L100 40 L0 40 Z"
          fill="hsl(222 40% 10%)"
        />
      </svg>
    </div>
  );
}
