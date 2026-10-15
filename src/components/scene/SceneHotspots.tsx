import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';

export interface HotspotDef {
  id: string;
  label: string;
  x: number; // % from left
  y: number; // % from top
  visible: boolean;
  fact: string;
}

interface Props {
  hotspots: HotspotDef[];
}

/** Soft max width for fact bubbles; also used when clamping into the scene. */
const BUBBLE_MAX_PX = 220;
const BUBBLE_EDGE_PAD_PX = 8;
const MotionButton = motion.create(Button);

/**
 * Diegetic info layer — small tap targets anchored to "informative" scene props.
 * On tap, opens a fact bubble with a tail pointing back to the prop.
 *
 * Container is pointer-events-none; only the hotspot buttons are interactive,
 * so it never blocks underlying scene gestures.
 *
 * The bubble is positioned against the scene container (not the hotspot node)
 * and horizontally clamped so it never clips the rounded card edge — important
 * for short embeds like Time Machine.
 */
export function SceneHotspots({ hotspots }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { selection } = useHaptics({ decorative: true });

  const close = useCallback(() => setActiveId(null), []);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, close]);

  // Close if the active hotspot disappears (e.g. cleanliness band change).
  const visible = useMemo(() => hotspots.filter((h) => h.visible), [hotspots]);
  useEffect(() => {
    if (activeId && !visible.some((h) => h.id === activeId)) {
      setActiveId(null);
    }
  }, [activeId, visible]);

  const active = visible.find((h) => h.id === activeId) ?? null;
  const flipY = active ? active.y > 55 : false;
  // Home's HUD is a sibling stacking context; facts must sit above it, not behind its text.
  const homeScene = layer.current?.closest('.home-scene');
  const bubbleHost = homeScene ?? layer.current;

  return (
    <div ref={layer} className="absolute inset-0 z-[35] pointer-events-none" aria-hidden={false}>
      {visible.map((h) => {
        const isActive = activeId === h.id;
        return (
          <div
            key={h.id}
            className="absolute"
            style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <MotionButton
              variant="ghost"
              type="button"
              className="pointer-events-auto relative grid place-items-center min-w-11 min-h-11 w-11 h-11 p-0 rounded-full hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              onClick={() => {
                selection();
                setActiveId((prev) => (prev === h.id ? null : h.id));
              }}
              aria-label={`Learn about ${h.label}`}
              aria-expanded={isActive}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
            >
              <motion.span
                className="absolute w-7 h-7 rounded-full border border-white/70"
                animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' as const }}
              />
              <span
                className="block w-2.5 h-2.5 rounded-full bg-white/95"
                style={{ boxShadow: '0 0 8px rgba(255,255,255,0.7)' }}
              />
            </MotionButton>
          </div>
        );
      })}

      {bubbleHost &&
        createPortal(
          <AnimatePresence>
            {active && (
              <motion.div
                key={active.id}
                role="dialog"
                aria-label={active.label}
                initial={{ opacity: 0, y: flipY ? 6 : -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: flipY ? 6 : -6, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' as const }}
                className="pointer-events-auto absolute z-[40] rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-2xl"
                style={{
                  // Center on the hotspot, then clamp so both edges stay inside the scene.
                  left: `clamp(${BUBBLE_EDGE_PAD_PX}px, calc(${active.x}% - ${BUBBLE_MAX_PX / 2}px), calc(100% - ${BUBBLE_MAX_PX}px - ${BUBBLE_EDGE_PAD_PX}px))`,
                  width: `min(${BUBBLE_MAX_PX}px, calc(100% - ${BUBBLE_EDGE_PAD_PX * 2}px))`,
                  ...(flipY
                    ? {
                        bottom: homeScene
                          ? `calc(${100 - active.y}% + ${20 + active.y * 0.4}px)`
                          : `calc(${100 - active.y}% + 20px)`,
                      }
                    : {
                        top: homeScene
                          ? `calc(${active.y}% + ${20 - active.y * 0.4}px)`
                          : `calc(${active.y}% + 20px)`,
                      }),
                }}
              >
                <div className="flex items-start gap-2 px-3 pt-2.5 pb-1.5">
                  <h4 className="flex-1 text-xs font-semibold tracking-wide uppercase text-foreground/80">
                    {active.label}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="min-w-11 min-h-11 shrink-0 grid place-items-center text-foreground/60 hover:text-foreground transition-colors -mr-1 -mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="px-3 pb-3 text-[13px] leading-snug text-foreground/90">
                  {active.fact}
                </p>
              </motion.div>
            )}
          </AnimatePresence>,
          bubbleHost,
        )}
    </div>
  );
}
