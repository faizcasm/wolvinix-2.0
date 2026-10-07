import { type CSSProperties, type MutableRefObject, memo, useEffect, useMemo, useRef } from "react";
import { type CanvasProps, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { SceneCanvas } from "./SceneCanvas";
import { cn } from "@/lib/utils";

export interface HeroSceneProps {
  className?: string;
  /** Multiplier for light + glow strength. Default `1`. */
  intensity?: number;
}

type Pointer = { x: number; y: number };

/* ------------------------------ palette ------------------------------ */

const VIOLET = "#8b5cf6";
const CYAN = "#22d3ee";
const LIME = "#a3e635";
const CORE_DARK = "#12121c";

const HERO_CAMERA: CanvasProps["camera"] = {
  position: [0, 0, 7.5],
  fov: 46,
  near: 0.1,
  far: 90,
};

const BACKDROP: CSSProperties = {
  background: [
    "radial-gradient(72% 62% at 50% 44%, color-mix(in srgb, var(--brand-500) 26%, transparent), transparent 68%)",
    "radial-gradient(90% 78% at 78% 84%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 72%)",
    "radial-gradient(60% 55% at 18% 78%, color-mix(in srgb, var(--lime) 10%, transparent), transparent 70%)",
    "var(--bg)",
  ].join(", "),
};

/* --------------------------- crystal shader --------------------------- */

const CORE_VERT = /* glsl */ `
varying vec3 vNormalView;
varying vec3 vLocal;

void main() {
  vLocal = position;
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CORE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uViolet;
uniform vec3 uCyan;
uniform vec3 uLime;
varying vec3 vNormalView;
varying vec3 vLocal;

void main() {
  float gradient = clamp(vLocal.y * 0.32 + 0.5, 0.0, 1.0);
  vec3 base = mix(uCyan, uViolet, gradient);
  float pulse = 0.88 + 0.12 * sin(uTime * 1.3);

  vec3 normal = normalize(vNormalView);
  float facing = clamp(normal.z, 0.0, 1.0);
  float rim = pow(1.0 - facing, 2.4);

  vec3 color = base * (0.55 + 0.8 * gradient) * pulse;
  color += uLime * rim * 0.55;
  color += uCyan * pow(rim, 4.0) * 0.7;
  color *= uIntensity;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ------------------------------ orbiters ------------------------------ */

type ShardKind = "octahedron" | "tetrahedron" | "icosahedron" | "ring";

interface ShardDef {
  kind: ShardKind;
  radius: number;
  scale: number;
  speed: number;
  phase: number;
  tilt: [number, number, number];
  spin: [number, number];
  color: string;
}

const SHARDS: ShardDef[] = [
  {
    kind: "octahedron",
    radius: 2.7,
    scale: 0.3,
    speed: 0.5,
    phase: 0.4,
    tilt: [0.55, 0.15, 0.35],
    spin: [0.6, 0.9],
    color: VIOLET,
  },
  {
    kind: "tetrahedron",
    radius: 3.3,
    scale: 0.26,
    speed: -0.4,
    phase: 1.9,
    tilt: [-0.45, 0.3, 0.65],
    spin: [0.9, 0.5],
    color: CYAN,
  },
  {
    kind: "icosahedron",
    radius: 3.9,
    scale: 0.24,
    speed: 0.32,
    phase: 3.1,
    tilt: [0.25, -0.5, 0.45],
    spin: [0.4, 1.1],
    color: LIME,
  },
  {
    kind: "octahedron",
    radius: 4.4,
    scale: 0.34,
    speed: -0.26,
    phase: 4.6,
    tilt: [-0.7, 0.2, -0.35],
    spin: [0.7, 0.4],
    color: CYAN,
  },
  {
    kind: "tetrahedron",
    radius: 2.4,
    scale: 0.2,
    speed: 0.62,
    phase: 5.5,
    tilt: [0.9, 0.45, 0.2],
    spin: [1.2, 0.7],
    color: VIOLET,
  },
  {
    kind: "ring",
    radius: 0,
    scale: 2.5,
    speed: 0.16,
    phase: 0.8,
    tilt: [1.15, 0.2, 0.1],
    spin: [0.18, 0.12],
    color: VIOLET,
  },
  {
    kind: "ring",
    radius: 0,
    scale: 3.4,
    speed: -0.12,
    phase: 2.4,
    tilt: [-0.95, -0.25, 0.35],
    spin: [0.12, -0.16],
    color: CYAN,
  },
];

function shardGeometry(kind: ShardKind) {
  switch (kind) {
    case "octahedron":
      return <octahedronGeometry args={[1, 0]} />;
    case "tetrahedron":
      return <tetrahedronGeometry args={[1, 0]} />;
    case "icosahedron":
      return <icosahedronGeometry args={[1, 0]} />;
    default:
      return <torusGeometry args={[1, 0.012, 6, 120]} />;
  }
}

/* ------------------------------- scene -------------------------------- */

interface HeroContentsProps {
  intensity: number;
  reduced: boolean;
  pointer: MutableRefObject<Pointer>;
}

const HeroContents = memo(function HeroContents({
  intensity,
  reduced,
  pointer,
}: HeroContentsProps) {
  const fogColor = useMemo(() => {
    const token =
      typeof window !== "undefined"
        ? getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
        : "";
    return new THREE.Color(token || "#07070d");
  }, []);

  return (
    <>
      <fog attach="fog" args={[fogColor, 8, 30]} />
      <ambientLight intensity={0.45 * intensity} />
      <pointLight position={[5, 4, 6]} color={VIOLET} intensity={70 * intensity} distance={40} />
      <pointLight position={[-6, -3, 4]} color={CYAN} intensity={55 * intensity} distance={40} />
      <directionalLight position={[-4, 6, -6]} color={LIME} intensity={1.4 * intensity} />
      <ParallaxRig pointer={pointer} reduced={reduced} />
      <CrystalCore intensity={intensity} reduced={reduced} />
      {SHARDS.map((def, i) => (
        <OrbitShard key={`${def.kind}-${i}`} def={def} reduced={reduced} />
      ))}
      <GroundGlow intensity={intensity} />
      <DustField reduced={reduced} />
    </>
  );
});

/* ------------------------------ parallax ------------------------------ */

const ParallaxRig = memo(function ParallaxRig({
  pointer,
  reduced,
}: {
  pointer: MutableRefObject<Pointer>;
  reduced: boolean;
}) {
  const camera = useThree((state) => state.camera);

  useFrame((_, delta) => {
    if (reduced) return;
    const dt = Math.min(delta, 0.05);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.current.x * 1.15, 2.4, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, -pointer.current.y * 0.7, 2.4, dt);
    camera.lookAt(0, 0, 0);
  });

  return null;
});

/* ----------------------------- crystal core --------------------------- */

function buildCoreGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1.6, 1);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const noise =
      Math.sin(vertex.x * 2.3 + 1.7) *
      Math.cos(vertex.y * 2.1 - 0.4) *
      Math.sin(vertex.z * 2.7 + 2.2);
    vertex.multiplyScalar(1 + noise * 0.16);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

const CrystalCore = memo(function CrystalCore({
  intensity,
  reduced,
}: {
  intensity: number;
  reduced: boolean;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  const geometry = useMemo(buildCoreGeometry, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uViolet: { value: new THREE.Color(VIOLET) },
      uCyan: { value: new THREE.Color(CYAN) },
      uLime: { value: new THREE.Color(LIME) },
    }),
    [intensity],
  );

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  useFrame((_, delta) => {
    if (reduced || !coreRef.current) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const time = elapsed.current;
    uniforms.uTime.value = time;

    const core = coreRef.current;
    core.rotation.y = time * 0.16;
    core.rotation.x = Math.sin(time * 0.32) * 0.16;
    core.position.y = Math.sin(time * 0.7) * 0.1;

    if (shellRef.current) {
      shellRef.current.rotation.y = -time * 0.24;
      shellRef.current.rotation.z = time * 0.1;
      shellRef.current.position.y = core.position.y;
    }
  });

  return (
    <group>
      <mesh ref={coreRef} geometry={geometry}>
        <shaderMaterial
          vertexShader={CORE_VERT}
          fragmentShader={CORE_FRAG}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={shellRef} geometry={geometry} scale={1.14}>
        <meshBasicMaterial
          color={CYAN}
          wireframe
          transparent
          opacity={0.18 * intensity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});

/* ------------------------------ orbit shard ---------------------------- */

const OrbitShard = memo(function OrbitShard({ def, reduced }: { def: ShardDef; reduced: boolean }) {
  const orbitRef = useRef<THREE.Group>(null);
  const selfRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (reduced || !orbitRef.current) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const time = elapsed.current;

    orbitRef.current.rotation.z = def.phase + time * def.speed;
    if (selfRef.current) {
      selfRef.current.rotation.x = def.spin[0] * time;
      selfRef.current.rotation.y = def.spin[1] * time;
    }
  });

  const isRing = def.kind === "ring";

  return (
    <group rotation={def.tilt}>
      <group ref={orbitRef} rotation={[0, 0, def.phase]}>
        <mesh ref={selfRef} position={isRing ? [0, 0, 0] : [def.radius, 0, 0]} scale={def.scale}>
          {shardGeometry(def.kind)}
          <meshStandardMaterial
            color={CORE_DARK}
            emissive={def.color}
            emissiveIntensity={isRing ? 1.1 : 0.8}
            metalness={0.45}
            roughness={0.3}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
});

/* ----------------------------- ground glow ---------------------------- */

function buildGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 126);
    gradient.addColorStop(0, "rgba(139, 92, 246, 0.9)");
    gradient.addColorStop(0.4, "rgba(34, 211, 238, 0.38)");
    gradient.addColorStop(0.75, "rgba(163, 230, 53, 0.1)");
    gradient.addColorStop(1, "rgba(34, 211, 238, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const GroundGlow = memo(function GroundGlow({ intensity }: { intensity: number }) {
  const texture = useMemo(buildGlowTexture, []);

  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, -1]}>
      <planeGeometry args={[13, 13]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.85 * Math.min(Math.max(intensity, 0), 1.5)}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
});

/* -------------------------------- dust -------------------------------- */

const DUST_COUNT = 300;
const DUST_LIMIT_Y = 5.5;

function buildDust(count: number) {
  const positions = new Float32Array(count * 3);
  const baseX = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const palette = [new THREE.Color(VIOLET), new THREE.Color(CYAN), new THREE.Color(LIME)];
  const tint = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;
    const x = (Math.random() * 2 - 1) * 10;
    baseX[i] = x;
    positions[offset] = x;
    positions[offset + 1] = (Math.random() * 2 - 1) * DUST_LIMIT_Y;
    positions[offset + 2] = -7 + Math.random() * 8;

    tint.copy(palette[i % 3]).multiplyScalar(0.35 + Math.random() * 0.65);
    colors[offset] = tint.r;
    colors[offset + 1] = tint.g;
    colors[offset + 2] = tint.b;

    speeds[i] = 0.08 + Math.random() * 0.26;
    phases[i] = Math.random() * Math.PI * 2;
  }

  return { positions, baseX, colors, speeds, phases };
}

const DustField = memo(function DustField({ reduced }: { reduced: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const elapsed = useRef(0);
  const dust = useMemo(() => buildDust(DUST_COUNT), []);

  useFrame((_, delta) => {
    if (reduced || !pointsRef.current) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const time = elapsed.current;

    const attribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    for (let i = 0; i < DUST_COUNT; i += 1) {
      const offset = i * 3;
      let y = array[offset + 1] + dust.speeds[i] * dt;
      if (y > DUST_LIMIT_Y) y = -DUST_LIMIT_Y;
      array[offset + 1] = y;
      array[offset] = dust.baseX[i] + Math.sin(time * 0.32 + dust.phases[i]) * 0.45;
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[dust.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[dust.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.75}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
});

/* ------------------------------ component ------------------------------ */

const HeroScene = memo(function HeroScene({ className, intensity = 1 }: HeroSceneProps) {
  const reduced = useReducedMotion() ?? false;
  const pointer = useRef<Pointer>({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const onPointerMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      pointer.current.y = (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [reduced]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div aria-hidden="true" className="absolute inset-0" style={BACKDROP} />
      <SceneCanvas reduced={reduced} camera={HERO_CAMERA}>
        <HeroContents intensity={intensity} reduced={reduced} pointer={pointer} />
      </SceneCanvas>
    </div>
  );
});

export default HeroScene;
