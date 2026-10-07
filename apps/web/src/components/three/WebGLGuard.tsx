import { type CSSProperties, type ReactNode, memo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * WebGL availability probe. The result is cached at module scope so repeated
 * mounts never create extra GPU contexts. No side effects run on import — the
 * probe only executes the first time {@link useHasWebGL} renders.
 */
let webglCache: boolean | null = null;

function detectWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  if (typeof document === "undefined") {
    webglCache = false;
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    webglCache = gl !== null;
    if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** `true` when the current browser can create a WebGL context. */
export function useHasWebGL(): boolean {
  return useState<boolean>(detectWebGL)[0];
}

/** Gradient placeholder shown instead of the scene when WebGL is missing. */
const FALLBACK_STYLE: CSSProperties = {
  background: [
    "radial-gradient(58% 55% at 50% 40%, color-mix(in srgb, var(--brand-500) 34%, transparent), transparent 70%)",
    "radial-gradient(70% 60% at 76% 78%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 72%)",
    "radial-gradient(55% 45% at 22% 80%, color-mix(in srgb, var(--lime) 14%, transparent), transparent 70%)",
    "var(--bg)",
  ].join(", "),
};

export interface WebGLGuardProps {
  /** Rendered only when WebGL is available. */
  children?: ReactNode;
  /** Sizing classes for the fallback placeholder. */
  className?: string;
  /** Optional content layered on top of the gradient placeholder. */
  fallback?: ReactNode;
}

/**
 * Renders `children` only when WebGL is available. Otherwise it renders a
 * styled gradient placeholder so low-end devices never crash on `<Canvas>`.
 */
export const WebGLGuard = memo(function WebGLGuard({
  children,
  className,
  fallback,
}: WebGLGuardProps) {
  const hasWebGL = useHasWebGL();

  if (hasWebGL) return <>{children}</>;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={FALLBACK_STYLE}
      aria-hidden={fallback ? undefined : true}
    >
      {fallback}
    </div>
  );
});
