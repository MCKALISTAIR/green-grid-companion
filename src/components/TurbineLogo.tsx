interface TurbineLogoProps {
  className?: string;
}

/** Hub centre in viewBox units. The rotor spins around exactly this point. */
export const TURBINE_HUB = { x: 256, y: 256 } as const;

/**
 * One blade, pointing straight up from the hub, symmetric about x = 256.
 * Drawn once and reused three times (0°, 120°, 240°) so the blades are
 * identical by construction.
 */
export const TURBINE_BLADE_PATH = 'M242 224C227 100 237 32 256 32C275 32 285 100 270 224Z';

export const TURBINE_BLADE_ANGLES = [0, 120, 240] as const;

/**
 * GridSense turbine logo. The tower is static; the three blades and hub sit in
 * a single rotating group, so they turn as one rigid rotor.
 *
 * The rotation origin is pinned to the hub in viewBox units
 * (transform-box: view-box + transform-origin: 256px 256px), not to the
 * group's bounding box: a three-blade rotor's bounding box isn't centred on
 * the hub, so fill-box/"center" would make it wobble. Only a rotate keyframe
 * is used (Tailwind's `spin`): no scale, skew or path morphing.
 * Reduced motion: static (motion-reduce:animate-none, plus the global rule in index.css).
 *
 * PullToRefresh stops the spin with `[&_g]:!animate-none`, so the rotor must stay a `<g>`.
 */
export function TurbineLogo({ className = '' }: TurbineLogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Tower (static) */}
      <path
        d="M236 296V480C236 488.8 243.2 496 252 496H260C268.8 496 276 488.8 276 480V296C276 287.2 268.8 280 260 280H252C243.2 280 236 287.2 236 296Z"
        fill="currentColor"
      />

      {/* Rotor: one rigid rotating group around the hub */}
      <g
        data-turbine-rotor=""
        className="animate-[spin_4s_linear_infinite] motion-reduce:animate-none"
        style={{
          transformBox: 'view-box',
          transformOrigin: `${TURBINE_HUB.x}px ${TURBINE_HUB.y}px`,
          // Promote the rotor to its own layer so spin stays smooth when
          // the page also has blur / other paint (e.g. onboarding card).
          willChange: 'transform',
        }}
      >
        {TURBINE_BLADE_ANGLES.map((angle) => (
          <path
            key={angle}
            data-turbine-blade=""
            d={TURBINE_BLADE_PATH}
            fill="currentColor"
            transform={`rotate(${angle} ${TURBINE_HUB.x} ${TURBINE_HUB.y})`}
          />
        ))}
        {/* Hub on top so the blade roots meet cleanly */}
        <circle cx={TURBINE_HUB.x} cy={TURBINE_HUB.y} r="32" fill="currentColor" />
      </g>
    </svg>
  );
}
