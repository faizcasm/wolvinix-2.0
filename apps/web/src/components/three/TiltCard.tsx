import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Rotation amplitude in degrees at the card edge. Default `10`. */
  intensity?: number;
  /** Paint a pointer-following radial sheen. */
  glare?: boolean;
  /** Spring-back duration in ms after the pointer leaves. */
  resetMs?: number;
}

const GLARE_STYLE: CSSProperties = {
  background:
    "radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgb(255 255 255 / 0.22) 0%, rgb(255 255 255 / 0.07) 32%, rgb(255 255 255 / 0) 66%)",
};

/**
 * DOM perspective tilt wrapper (no WebGL). Rotation is rAF-throttled and
 * transform-only, so it is cheap enough for large card grids.
 *
 * ```tsx
 * <TiltCard intensity={10} className="h-full" glare>...</TiltCard>
 * ```
 */
export const TiltCard = memo(function TiltCard({
  children,
  className,
  intensity = 10,
  glare = false,
  resetMs = 480,
}: TiltCardProps) {
  const reduced = useReducedMotion() ?? false;
  const hostRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const state = useRef({ clientX: 0, clientY: 0, active: false });

  const paint = useCallback(() => {
    frameRef.current = 0;
    const host = hostRef.current;
    const card = cardRef.current;
    if (!host || !card) return;

    const { clientX, clientY, active } = state.current;
    const rect = host.getBoundingClientRect();
    const x = (clientX - rect.left) / Math.max(rect.width, 1);
    const y = (clientY - rect.top) / Math.max(rect.height, 1);

    if (active) {
      const rotateX = reduced ? 0 : (0.5 - y) * intensity * 2;
      const rotateY = reduced ? 0 : (x - 0.5) * intensity * 2;
      card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
        2,
      )}deg) scale3d(1.02, 1.02, 1.02)`;
      card.style.transition =
        "transform 130ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms ease";
      card.style.boxShadow = "var(--shadow-lg)";
      card.style.willChange = "transform";
    } else {
      card.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      card.style.transition = `transform ${resetMs}ms cubic-bezier(0.34, 1.5, 0.4, 1), box-shadow ${resetMs}ms ease`;
      card.style.boxShadow = "";
      card.style.willChange = "";
    }

    if (glareRef.current) {
      glareRef.current.style.setProperty("--gx", `${(x * 100).toFixed(2)}%`);
      glareRef.current.style.setProperty("--gy", `${(y * 100).toFixed(2)}%`);
      glareRef.current.style.opacity = active ? "1" : "0";
    }
  }, [intensity, reduced, resetMs]);

  const schedule = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      state.current.clientX = event.clientX;
      state.current.clientY = event.clientY;
      state.current.active = true;
      schedule();
    },
    [schedule],
  );

  const onPointerLeave = useCallback(() => {
    state.current.active = false;
    schedule();
  }, [schedule]);

  return (
    <div
      ref={hostRef}
      className={cn("relative h-full w-full", className)}
      style={{ perspective: "1000px" }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
    >
      <div
        ref={cardRef}
        className="relative h-full w-full overflow-hidden rounded-xl"
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
        {glare && (
          <div
            ref={glareRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
            style={GLARE_STYLE}
          />
        )}
      </div>
    </div>
  );
});
