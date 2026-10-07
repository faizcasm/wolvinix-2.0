import { type ReactNode, type RefObject, memo, useEffect, useRef, useState } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { WebGLGuard } from "./WebGLGuard";
import { cn } from "@/lib/utils";

type Frameloop = "always" | "demand" | "never";

/**
 * Tracks whether the host element is near the viewport so scenes can pause
 * (`frameloop="never"`) while off-screen. Starts as `true` so the first frame
 * is always painted before the observer reports back.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "240px",
): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setInView(Boolean(entries[0]?.isIntersecting)),
      { rootMargin, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

export interface SceneCanvasProps {
  children: ReactNode;
  /** Extra classes for the absolutely positioned host element. */
  className?: string;
  /** Placeholder rendered by `WebGLGuard` when WebGL is unavailable. */
  fallback?: ReactNode;
  camera?: CanvasProps["camera"];
  /** Freeze animation (respects `prefers-reduced-motion`). */
  reduced?: boolean;
}

/**
 * Shared `<Canvas>` wrapper for the decorative scenes: WebGL fallback, DPR
 * clamp, high-performance GL flags, off-screen pausing and a click-through
 * canvas (pointer tracking happens on `window` instead).
 */
export const SceneCanvas = memo(function SceneCanvas({
  children,
  className,
  fallback,
  camera,
  reduced = false,
}: SceneCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const inView = useInView(hostRef);

  const frameloop: Frameloop = !inView ? "never" : reduced ? "demand" : "always";

  return (
    <div ref={hostRef} className={cn("absolute inset-0", className)}>
      <WebGLGuard className="relative h-full w-full" fallback={fallback}>
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={camera}
          frameloop={frameloop}
          style={{ pointerEvents: "none" }}
        >
          {children}
        </Canvas>
      </WebGLGuard>
    </div>
  );
});
