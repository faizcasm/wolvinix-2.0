import { memo, useMemo, useRef } from "react";
import { type CanvasProps, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { SceneCanvas } from "./SceneCanvas";
import { cn } from "@/lib/utils";

export interface ParticleFieldProps {
  className?: string;
  /** Particle count. Default `60`, clamped to `8…480`. */
  density?: number;
}

const COLORS = ["#8b5cf6", "#22d3ee", "#a3e635"] as const;
const LIMIT_Y = 6.5;

const FIELD_CAMERA: CanvasProps["camera"] = {
  position: [0, 0, 9],
  fov: 55,
  near: 0.1,
  far: 60,
};

const CLOUD_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (320.0 / max(-mvPosition.z, 0.001));
  gl_Position = projectionMatrix * mvPosition;
}
`;

const CLOUD_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float distanceToCenter = length(gl_PointCoord - vec2(0.5));
  float alpha = (1.0 - smoothstep(0.1, 0.5, distanceToCenter)) * vAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function buildCloud(count: number) {
  const positions = new Float32Array(count * 3);
  const baseX = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);

  const palette = COLORS.map((hex) => new THREE.Color(hex));
  const tint = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;
    const x = (Math.random() * 2 - 1) * 11;
    baseX[i] = x;
    positions[offset] = x;
    positions[offset + 1] = (Math.random() * 2 - 1) * LIMIT_Y;
    positions[offset + 2] = -6 + Math.random() * 9;

    tint.copy(palette[i % palette.length]).multiplyScalar(0.55 + Math.random() * 0.45);
    colors[offset] = tint.r;
    colors[offset + 1] = tint.g;
    colors[offset + 2] = tint.b;

    sizes[i] = 0.05 + Math.random() * 0.14;
    alphas[i] = 0.25 + Math.random() * 0.6;
    speeds[i] = 0.14 + Math.random() * 0.42;
    phases[i] = Math.random() * Math.PI * 2;
  }

  return { positions, baseX, colors, sizes, alphas, speeds, phases };
}

interface CloudProps {
  count: number;
  reduced: boolean;
}

const Cloud = memo(function Cloud({ count, reduced }: CloudProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const elapsed = useRef(0);
  const cloud = useMemo(() => buildCloud(count), [count]);

  useFrame((_, delta) => {
    if (reduced || !pointsRef.current) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const time = elapsed.current;

    const attribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const offset = i * 3;
      let y = array[offset + 1] + cloud.speeds[i] * dt;
      if (y > LIMIT_Y) y = -LIMIT_Y;
      array[offset + 1] = y;
      array[offset] = cloud.baseX[i] + Math.sin(time * 0.3 + cloud.phases[i]) * 0.75;
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[cloud.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[cloud.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[cloud.alphas, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={CLOUD_VERT}
        fragmentShader={CLOUD_FRAG}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
});

/**
 * Drifting particle backdrop. Fully decorative single-draw-call layer.
 *
 * ```tsx
 * <ParticleField className="absolute inset-0 -z-10" density={60} />
 * ```
 */
export const ParticleField = memo(function ParticleField({
  className,
  density = 60,
}: ParticleFieldProps) {
  const reduced = useReducedMotion() ?? false;
  const count = useMemo(() => Math.min(480, Math.max(8, Math.round(density))), [density]);

  return (
    <SceneCanvas
      className={cn("pointer-events-none", className)}
      reduced={reduced}
      camera={FIELD_CAMERA}
    >
      <Cloud count={count} reduced={reduced} />
    </SceneCanvas>
  );
});
