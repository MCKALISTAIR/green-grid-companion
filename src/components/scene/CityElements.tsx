import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CITY_GROUND_Y, CITY_SCALE } from '@/lib/sceneScaleBible';

// 🚗 Car/Vehicle on the road
export function CityVehicle({
  direction = 'right',
  isEV = false,
  delay = 0,
  speed = 12,
}: {
  direction?: 'left' | 'right';
  isEV?: boolean;
  delay?: number;
  speed?: number;
}) {
  const y = direction === 'right' ? 139.5 : 143.5;
  const startX = direction === 'right' ? -20 : 420;
  const endX = direction === 'right' ? 420 : -20;
  const { bodyWidth, bodyHeight, cabinWidth, cabinHeight } = CITY_SCALE.car;

  return (
    <motion.g
      initial={{ x: startX }}
      animate={{ x: endX }}
      transition={{
        duration: speed,
        delay,
        repeat: Infinity,
        repeatDelay: delay + 3,
        ease: 'linear' as const,
      }}
    >
      {/* Car body */}
      <rect
        x={0}
        y={y}
        width={bodyWidth}
        height={bodyHeight}
        rx={1.5}
        fill={isEV ? '#22d3ee' : '#6b7280'}
      />
      {/* Roof */}
      <rect
        x={3}
        y={y - cabinHeight}
        width={cabinWidth}
        height={cabinHeight}
        rx={1}
        fill={isEV ? '#06b6d4' : '#4b5563'}
      />
      {/* Wheels */}
      <circle cx={3} cy={y + bodyHeight} r={1.5} fill="#1f2937" />
      <circle cx={11} cy={y + bodyHeight} r={1.5} fill="#1f2937" />
      {/* EV indicator - small green glow */}
      {isEV && <circle cx={7} cy={y + 2} r={0.8} fill="#22c55e" opacity={0.8} />}
      {/* Exhaust for non-EV */}
      {!isEV && (
        <motion.circle
          cx={direction === 'right' ? -2 : 16}
          cy={y + 3}
          r={1}
          fill="rgba(150,150,150,0.4)"
          animate={{ r: [1, 2.5, 0], opacity: [0.4, 0.2, 0], y: [0, -3, -6] }}
          transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
        />
      )}
    </motion.g>
  );
}

// 🚌 Bus
export function CityBus({
  direction = 'right',
  isElectric = false,
  delay = 0,
}: {
  direction?: 'left' | 'right';
  isElectric?: boolean;
  delay?: number;
}) {
  const y = direction === 'right' ? 138.5 : 142.5;
  const startX = direction === 'right' ? -40 : 440;
  const endX = direction === 'right' ? 440 : -40;
  const { width, height } = CITY_SCALE.bus;

  return (
    <motion.g
      initial={{ x: startX }}
      animate={{ x: endX }}
      transition={{
        duration: 18,
        delay,
        repeat: Infinity,
        repeatDelay: 8,
        ease: 'linear' as const,
      }}
    >
      <rect
        x={0}
        y={y}
        width={width}
        height={height}
        rx={1.5}
        fill={isElectric ? '#0d9488' : '#b45309'}
      />
      <rect x={2} y={y + 1.5} width={width - 4} height={3} fill="rgba(255,255,255,0.15)" />
      {[4, 10, 16].map((wx) => (
        <rect key={wx} x={wx} y={y + 2} width={3} height={2.5} fill="#fef3c7" opacity={0.7} />
      ))}
      <circle cx={5} cy={y + height} r={1.8} fill="#1f2937" />
      <circle cx={width - 5} cy={y + height} r={1.8} fill="#1f2937" />
    </motion.g>
  );
}

/**
 * Diegetic playful beat — a Tube carriage flashes across the road
 * once a minute (low frequency, never a traffic jam).
 */
export function TubeFlash({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null;
  const y = CITY_GROUND_Y - 4;
  return (
    <motion.g
      aria-hidden="true"
      initial={{ x: -50, opacity: 0 }}
      animate={{
        x: [-50, 450],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 4.5,
        times: [0, 0.08, 0.85, 1],
        repeat: Infinity,
        repeatDelay: 55,
        ease: 'linear' as const,
      }}
    >
      {/* Carriage body — Underground red */}
      <rect x={0} y={y} width={28} height={7} rx={1.2} fill="#dc2626" />
      <rect x={1} y={y + 1} width={26} height={2.2} fill="rgba(255,255,255,0.2)" />
      {[3, 9, 15, 21].map((wx) => (
        <rect key={wx} x={wx} y={y + 1.2} width={3.5} height={2} fill="#fef08a" opacity={0.85} />
      ))}
      {/* Roundel hint */}
      <circle cx={14} cy={y + 5} r={1.6} fill="#fff" opacity={0.9} />
      <circle cx={14} cy={y + 5} r={0.9} fill="#dc2626" />
    </motion.g>
  );
}

// 🐦 Pigeon
export function Pigeon({
  x: initialX,
  y: initialY,
  delay = 0,
}: {
  x: number;
  y: number;
  delay?: number;
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [scaleX, setScaleX] = useState<number>(CITY_SCALE.pigeon.baseScale); // Horizontal scale/flip
  const [state, setState] = useState<'idle' | 'walking' | 'pecking' | 'flying' | 'landing'>('idle');
  const [wingFlap, setWingFlap] = useState(false);
  const [peckAngle, setPeckAngle] = useState(0);
  const [headBob, setHeadBob] = useState(0);
  const [transitionConfig, setTransitionConfig] = useState<{
    duration: number;
    ease?: 'easeOut' | 'easeIn' | 'easeInOut' | 'linear';
  }>({ duration: 1.0, ease: 'easeOut' as const });

  // Use a ref to store position so the useEffect loop does not re-trigger on position changes
  const positionRef = useRef({ x: initialX, y: initialY });

  const updatePosition = (
    newPos: { x: number; y: number },
    config: { duration: number; ease?: 'easeOut' | 'easeIn' | 'easeInOut' | 'linear' },
  ) => {
    positionRef.current = newPos;
    setTransitionConfig(config);
    setPos(newPos);
  };

  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;

    const run = async () => {
      // Wait for the initial staggered delay
      await new Promise((r) => {
        timeoutId = setTimeout(r, delay * 1000);
      });
      if (!active) return;

      while (active) {
        const rand = Math.random();
        const currentPos = positionRef.current;

        // Choose next behavior state
        if (rand < 0.1) {
          // 1. FLY AWAY
          setState('flying');
          setWingFlap(true);

          const flyLeft = Math.random() > 0.5;
          setScaleX(flyLeft ? -0.35 : 0.35);

          // Fly off screen diagonally upwards
          const targetX = flyLeft ? -50 : 450;
          const targetY = -40;
          updatePosition({ x: targetX, y: targetY }, { duration: 2.5, ease: 'easeOut' as const });

          // Wait for flight to finish
          await new Promise((r) => {
            timeoutId = setTimeout(r, 2500);
          });
          if (!active) return;

          setWingFlap(false);

          // Remain off-screen for a random interval
          await new Promise((r) => {
            timeoutId = setTimeout(r, 3000 + Math.random() * 5000);
          });
          if (!active) return;

          // Swoop back down to land at a random sidewalk spot
          setState('landing');
          setWingFlap(true);

          // Swoop start position is offscreen on the opposite side
          const startLeft = Math.random() > 0.5;
          const landX = 40 + Math.random() * 320;
          const landY = 133 + Math.random() * 4;

          // Instantly snap starting offscreen coordinates before animating landing
          updatePosition({ x: startLeft ? -30 : 430, y: -20 }, { duration: 0 });
          await new Promise((r) => {
            timeoutId = setTimeout(r, 50);
          });
          if (!active) return;

          setScaleX(landX > (startLeft ? -30 : 430) ? 0.35 : -0.35);
          updatePosition({ x: landX, y: landY }, { duration: 2.2, ease: 'easeInOut' as const });

          // Wait for landing swoop to complete
          await new Promise((r) => {
            timeoutId = setTimeout(r, 2200);
          });
          if (!active) return;

          // Tiny landing hop bounce
          setWingFlap(false);
          updatePosition({ x: landX, y: landY - 2 }, { duration: 0.15, ease: 'easeOut' as const });
          await new Promise((r) => {
            timeoutId = setTimeout(r, 150);
          });
          if (!active) return;

          updatePosition({ x: landX, y: landY }, { duration: 0.15, ease: 'easeIn' as const });
          await new Promise((r) => {
            timeoutId = setTimeout(r, 150);
          });
          if (!active) return;

          setState('idle');
        } else if (rand < 0.55) {
          // 2. WALKING
          setState('walking');
          const walkDist = Math.random() * 60 - 30; // walk up to 30 units left or right
          const targetX = Math.max(20, Math.min(380, currentPos.x + walkDist));
          const targetY = Math.max(133, Math.min(137, currentPos.y + (Math.random() * 4 - 2)));

          // Turn to face target
          setScaleX(targetX > currentPos.x ? 0.35 : -0.35);

          const distance = Math.abs(targetX - currentPos.x);
          const duration = Math.max(800, distance * 30); // ~33 units/sec
          updatePosition(
            { x: targetX, y: targetY },
            { duration: duration / 1000, ease: 'easeInOut' as const },
          );

          // Staggered head bobs matching the walk time
          const bobCount = Math.floor(duration / 250);
          for (let i = 0; i < bobCount; i++) {
            if (!active) return;
            setHeadBob(i % 2 === 0 ? 1.5 : -1.5);
            await new Promise((r) => {
              timeoutId = setTimeout(r, 250);
            });
          }
          setHeadBob(0);
          setState('idle');
        } else if (rand < 0.85) {
          // 3. PECKING
          setState('pecking');
          const pecks = 2 + Math.floor(Math.random() * 3);
          for (let p = 0; p < pecks; p++) {
            if (!active) return;
            // Peck down
            setPeckAngle(35);
            setHeadBob(1.5);
            await new Promise((r) => {
              timeoutId = setTimeout(r, 160);
            });
            if (!active) return;
            // Peck up
            setPeckAngle(0);
            setHeadBob(0);
            await new Promise((r) => {
              timeoutId = setTimeout(r, 160);
            });
            if (!active) return;
            // Pause
            await new Promise((r) => {
              timeoutId = setTimeout(r, 100 + Math.random() * 200);
            });
          }
          setState('idle');
        } else {
          // 4. IDLE / LOOK ALERT
          setState('idle');
          if (Math.random() > 0.5) {
            // Flip direction
            setScaleX((prev) => -prev);
          }
          // Hold alert look for a moment
          await new Promise((r) => {
            timeoutId = setTimeout(r, 1000 + Math.random() * 1500);
          });
        }

        // Delay between states
        await new Promise((r) => {
          timeoutId = setTimeout(r, 600 + Math.random() * 800);
        });
      }
    };

    run();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [delay]);

  // Tilt body slightly while flying/landing
  const isFlying = state === 'flying' || state === 'landing';

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x: pos.x,
        y: pos.y,
        scaleX: scaleX,
        scaleY: 0.35,
        rotate: isFlying ? [-5, 5, -5] : 0,
      }}
      transition={{
        opacity: { duration: 0.3 },
        x: transitionConfig,
        y: transitionConfig,
        rotate: isFlying
          ? { duration: 0.2, repeat: Infinity, ease: 'easeInOut' as const }
          : { duration: 0.2 },
      }}
    >
      <g style={{ transformOrigin: '0px 0px' }}>
        {/* Feet (pink/coral legs) - only visible when not flying */}
        {!isFlying && (
          <>
            <line
              x1={-0.8}
              y1={2}
              x2={-0.8}
              y2={4}
              stroke="#f43f5e"
              strokeWidth={0.6}
              strokeLinecap="round"
            />
            <line
              x1={0.8}
              y1={2}
              x2={0.8}
              y2={4}
              stroke="#f43f5e"
              strokeWidth={0.6}
              strokeLinecap="round"
            />
            <line
              x1={-0.8}
              y1={4}
              x2={-1.8}
              y2={4.3}
              stroke="#f43f5e"
              strokeWidth={0.5}
              strokeLinecap="round"
            />
            <line
              x1={0.8}
              y1={4}
              x2={-0.2}
              y2={4.3}
              stroke="#f43f5e"
              strokeWidth={0.5}
              strokeLinecap="round"
            />
          </>
        )}

        {/* Body (main pigeon shell) */}
        <ellipse cx={0} cy={0} rx={4} ry={2.5} fill="#78716c" />

        {/* Wing (flaps when flying) */}
        <motion.g
          animate={{
            rotate: wingFlap ? [-40, 50, -40] : 0,
            scaleY: wingFlap ? [1, -0.7, 1] : 1,
          }}
          transition={{
            duration: 0.12,
            repeat: wingFlap ? Infinity : 0,
            ease: 'easeInOut' as const,
          }}
          style={{ transformOrigin: '-1px -0.5px' }}
        >
          {/* Wing shape */}
          <path d="M -2,-1 C -3.5,1.5 -2.5,2.5 1.2,1.2 C 2.5,0.5 1,-1 -2,-1 Z" fill="#a8a29e" />
          {/* Feather details */}
          <line x1={-1.5} y1={0.5} x2={-0.5} y2={1.5} stroke="#44403c" strokeWidth={0.5} />
          <line x1={-0.5} y1={0.2} x2={0.5} y2={1.2} stroke="#44403c" strokeWidth={0.5} />
        </motion.g>

        {/* Neck and Head (animated for pecking/bobbing) */}
        <motion.g
          animate={{
            rotate: peckAngle,
            y: headBob,
          }}
          transition={{
            type: 'spring' as const,
            stiffness: 250,
            damping: 18,
          }}
          style={{ transformOrigin: '1.5px 0.5px' }}
        >
          {/* Neck */}
          <path
            d="M 0.8,0.5 C 0.8,-1.5 2.5,-1.5 2.5,-0.2 C 2.5,0.8 2,1.2 0.8,0.5 Z"
            fill="#1e293b"
          />
          {/* Iridescent neck patch */}
          <ellipse cx={1.8} cy={-0.5} rx={0.6} ry={0.4} fill="#10b981" opacity={0.7} />

          {/* Head */}
          <circle cx={2.5} cy={-1.8} r={1.2} fill="#57534e" />

          {/* Beak */}
          <polygon points="3.4,-2.0 4.4,-1.7 3.4,-1.5" fill="#e7e5e4" />

          {/* Eye */}
          <circle cx={2.8} cy={-2.0} r={0.35} fill="#f97316" />
          <circle cx={2.8} cy={-2.0} r={0.15} fill="#000000" />
        </motion.g>
      </g>
    </motion.g>
  );
}

// 🏗️ Construction crane (for high-carbon / building phase)
export function ConstructionCrane({ x = 350, isNight }: { x?: number; isNight: boolean }) {
  const color = isNight ? '#475569' : '#f59e0b';
  return (
    <g>
      {/* Vertical mast */}
      <rect x={x} y={30} width={3} height={120} fill={color} opacity={0.7} />
      {/* Horizontal jib */}
      <rect x={x - 30} y={30} width={60} height={2} fill={color} opacity={0.7} />
      {/* Counter-jib */}
      <rect x={x + 3} y={30} width={20} height={2} fill={color} opacity={0.6} />
      {/* Cable */}
      <line
        x1={x + 1.5}
        y1={30}
        x2={x - 20}
        y2={32}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.5}
      />
      {/* Hook cable */}
      <motion.line
        initial={false}
        x1={x - 15}
        y1={32}
        x2={x - 15}
        y2={80}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.5}
        animate={{ y2: [80, 70, 80] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      {/* Warning light at top */}
      {isNight && (
        <motion.circle
          cx={x + 1.5}
          cy={28}
          r={1.5}
          fill="#ef4444"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </g>
  );
}

// 🎡 London Eye / Ferris Wheel — grounded with A-frame legs touching the road
export function LondonEye({
  x = 75,
  y = CITY_SCALE.londonEye.hubY,
  radius = CITY_SCALE.londonEye.radius,
  isNight,
  skipIntro,
  showWheel = true,
  showStructure = true,
}: {
  x?: number;
  y?: number;
  radius?: number;
  isNight: boolean;
  skipIntro?: boolean;
  /** When false, omit the rotating rim/spokes/pods (used for the grounded front pass). */
  showWheel?: boolean;
  /** When false, omit legs/plinth (used for the back-layer silhouette pass). */
  showStructure?: boolean;
}) {
  const podCount = 16;
  const podRadius = 1.8;
  const groundY = CITY_GROUND_Y;
  const plinthW = CITY_SCALE.londonEye.plinthHalfWidth;
  const plinthH = CITY_SCALE.londonEye.plinthHeight;
  const spokeColor = isNight ? 'rgba(180,200,220,0.65)' : 'rgba(100,120,140,0.7)';
  const rimColor = isNight ? 'rgba(180,200,220,0.55)' : 'rgba(100,120,140,0.6)';
  const podFill = isNight ? '#fbbf24' : 'rgba(180,190,200,0.85)';
  const legColor = isNight ? 'rgba(160,180,200,0.8)' : 'rgba(90,110,130,0.9)';

  return (
    <motion.g
      initial={skipIntro ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipIntro ? { duration: 0 } : { duration: 1.5, delay: 0.3 }}
    >
      {showStructure && (
        <>
          {/* A-frame support legs from hub down to ground — slightly heavier so they survive skyline clutter */}
          <line
            x1={x - 18}
            y1={groundY}
            x2={x}
            y2={y}
            stroke={legColor}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1={x + 18}
            y1={groundY}
            x2={x}
            y2={y}
            stroke={legColor}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Cross-brace */}
          <line
            x1={x - 9}
            y1={(groundY + y) / 2}
            x2={x + 9}
            y2={(groundY + y) / 2}
            stroke={legColor}
            strokeWidth="0.8"
          />
          {/* Concrete plinth */}
          <rect
            x={x - plinthW}
            y={groundY - plinthH + 1}
            width={plinthW * 2}
            height={plinthH}
            rx={0.5}
            fill={isNight ? '#334155' : '#94a3b8'}
            opacity={0.9}
          />
        </>
      )}

      {showWheel && (
        <>
          {/* Rotating wheel group */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' as const }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            {/* Outer rim */}
            <circle cx={x} cy={y} r={radius} fill="none" stroke={rimColor} strokeWidth="1.2" />
            {/* Inner rim */}
            <circle cx={x} cy={y} r={radius - 2} fill="none" stroke={rimColor} strokeWidth="0.4" />

            {/* Spokes */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              return (
                <line
                  key={`spoke-${i}`}
                  x1={x}
                  y1={y}
                  x2={x + Math.cos(angle) * (radius - 1)}
                  y2={y + Math.sin(angle) * (radius - 1)}
                  stroke={spokeColor}
                  strokeWidth="0.4"
                />
              );
            })}

            {/* Pods */}
            {Array.from({ length: podCount }).map((_, i) => {
              const angle = (i / podCount) * Math.PI * 2;
              const px = x + Math.cos(angle) * radius;
              const py = y + Math.sin(angle) * radius;
              return (
                <g key={`pod-${i}`}>
                  <ellipse
                    cx={px}
                    cy={py}
                    rx={podRadius}
                    ry={podRadius * 0.7}
                    fill={podFill}
                    opacity={isNight ? 0.9 : 0.75}
                  />
                  {isNight && (
                    <ellipse
                      cx={px}
                      cy={py}
                      rx={podRadius + 1.2}
                      ry={podRadius}
                      fill="#fbbf24"
                      opacity={0.1}
                    />
                  )}
                </g>
              );
            })}
          </motion.g>

          {/* Hub / axle */}
          <circle cx={x} cy={y} r={1.8} fill={isNight ? '#475569' : '#9ca3af'} />
        </>
      )}
    </motion.g>
  );
}

// 🌫️ Smog band — brownish haze layer behind skyline when grid is dirty
export function SmogBand({
  cleanliness,
  isNight = false,
}: {
  cleanliness: number;
  isNight?: boolean;
}) {
  if (cleanliness >= 0.5) return null;
  // Boost opacity at night so dirty state stays readable on dark skies.
  const base = Math.min(0.55, (0.5 - cleanliness) * 1.1);
  const opacity = isNight ? Math.min(0.75, base * 1.45) : base;
  // Hue shifts cooler/more sickly at night so it doesn't blend into navy.
  const hue = isNight ? 22 : 28;
  const gradId = `smog-${Math.round(cleanliness * 100)}-${isNight ? 'n' : 'd'}`;
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue}, 30%, ${isNight ? 30 : 55}%)`} stopOpacity="0" />
          <stop
            offset="50%"
            stopColor={`hsl(${hue}, 35%, ${isNight ? 28 : 50}%)`}
            stopOpacity={opacity}
          />
          <stop
            offset="100%"
            stopColor={`hsl(${hue}, 40%, ${isNight ? 24 : 45}%)`}
            stopOpacity={opacity * 0.7}
          />
        </linearGradient>
      </defs>
      <rect x={0} y={55} width={400} height={60} fill={`url(#${gradId})`} />
    </g>
  );
}

// 🏭 Distant stack on the far horizon — only when grid is very dirty
export function DistantStack({ x = 365, isNight }: { x?: number; isNight: boolean }) {
  // Lift stack contrast at night so it reads against dark sky.
  const stackColor = isNight ? 'rgba(190,170,140,0.85)' : 'rgba(120,130,140,0.6)';
  const baseY = 95;
  const { width, height } = CITY_SCALE.distantStack;
  return (
    <motion.g
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      {/* Thin chimney */}
      <rect x={x} y={baseY - height} width={width} height={height} fill={stackColor} />
      <rect x={x - 1} y={baseY - height - 2} width={width + 2} height={2} fill={stackColor} />
      {/* Wispy steam plume */}
      <motion.ellipse
        initial={false}
        cx={x + 1}
        cy={baseY - height - 6}
        rx={3}
        ry={2}
        fill={isNight ? 'rgba(180,180,180,0.3)' : 'rgba(220,220,220,0.5)'}
        animate={{
          cy: [baseY - height - 6, baseY - height - 14, baseY - height - 6],
          opacity: [0.5, 0.2, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const }}
      />
    </motion.g>
  );
}

// 🔋 Grid-scale battery storage container (BESS) — navy/charcoal with green decal
export function BatteryStorageContainer({
  x = 320,
  cleanliness,
  isNight,
}: {
  x?: number;
  cleanliness: number;
  isNight: boolean;
}) {
  const isClean = cleanliness > 0.6;
  // LED: green when storing/discharging clean energy, dim amber otherwise.
  // Avoid red — it made the container read as a fire engine.
  const ledColor = isClean ? '#22c55e' : '#f59e0b';
  const bodyColor = isNight ? '#0f172a' : '#1e293b'; // navy/charcoal, never red
  const accentColor = isClean ? '#16a34a' : '#475569';
  const groundY = CITY_SCALE.bess.groundY;
  const w = CITY_SCALE.bess.width;
  const h = CITY_SCALE.bess.height;

  return (
    <motion.g
      aria-hidden="true"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
    >
      {/* Container body */}
      <rect x={x} y={groundY - h} width={w} height={h} rx={0.5} fill={bodyColor} />
      {/* Subtle top edge highlight */}
      <line
        x1={x}
        y1={groundY - h + 0.3}
        x2={x + w}
        y2={groundY - h + 0.3}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.3"
      />
      {/* Corrugation lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={i}
          x1={x + 2 + i * 3}
          y1={groundY - h + 1}
          x2={x + 2 + i * 3}
          y2={groundY - 1}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.3"
        />
      ))}
      {/* Green accent stripe along the base */}
      <rect x={x} y={groundY - 1.2} width={w} height={1.2} fill={accentColor} opacity={0.85} />
      {/* Door panel */}
      <rect
        x={x + w - 6}
        y={groundY - h + 1.5}
        width={5}
        height={h - 2.5}
        fill="rgba(255,255,255,0.06)"
        rx={0.3}
      />
      {/* Status LED */}
      <motion.circle
        cx={x + 2.5}
        cy={groundY - h + 2}
        r={0.7}
        fill={ledColor}
        animate={{ opacity: [1, 0.45, 1] }}
        transition={{ duration: isClean ? 2.5 : 1.6, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      {/* "BESS" label — bigger so it reads */}
      <text
        x={x + w / 2}
        y={groundY - 3}
        textAnchor="middle"
        fontSize="2.4"
        fontWeight="700"
        fill="rgba(255,255,255,0.55)"
        fontFamily="monospace"
        letterSpacing="0.2"
      >
        BESS
      </text>
    </motion.g>
  );
}

// City traffic - collection of vehicles responding to intensity
export function CityTraffic({
  cleanliness,
  isNight,
  maxVehicles,
  showBus = true,
}: {
  cleanliness: number;
  isNight: boolean;
  /** Cap road clutter for one-hero composition (defaults: night 3 / day 5). */
  maxVehicles?: number;
  /** Bus is loud visual noise — off unless the band allows it. */
  showBus?: boolean;
}) {
  // More EVs when cleaner — only reshuffle when the band crosses 50%.
  const highEvShare = cleanliness > 0.5;

  const vehicles = useMemo(() => {
    const defaultCount = isNight ? 3 : 5;
    const requested = maxVehicles ?? defaultCount;
    const count = Math.max(0, Math.min(requested, defaultCount));
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      direction: (i % 2 === 0 ? 'right' : 'left') as 'left' | 'right',
      isEV: Math.random() < cleanliness,
      delay: i * 4,
      speed: 10 + Math.random() * 8,
    }));
    // cleanliness intentionally omitted: keep vehicle roles stable within each EV band.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanliness omitted on purpose (see comment above).
  }, [isNight, maxVehicles, highEvShare]);

  return (
    <g>
      {vehicles.map((v) => (
        <CityVehicle key={v.id} {...v} />
      ))}
      {/* One bus — only when the hero band allows road clutter */}
      {showBus && (maxVehicles ?? 5) >= 2 && (
        <CityBus direction="right" isElectric={cleanliness > 0.6} delay={5} />
      )}
    </g>
  );
}
