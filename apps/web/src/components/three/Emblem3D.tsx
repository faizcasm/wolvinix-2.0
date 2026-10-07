import { memo, useEffect, useMemo, useRef } from "react";
import { type CanvasProps, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { SceneCanvas } from "./SceneCanvas";
import { cn } from "@/lib/utils";

export interface Emblem3DProps {
  className?: string;
}

const VIOLET = "#8b5cf6";
const CYAN = "#22d3ee";
const LIME = "#a3e635";
const SHIELD_COLOR = "#101019";
const HEAD_COLOR = "#16161f";
const KEY_COLOR = "#f4f4f8";

const EMBLEM_CAMERA: CanvasProps["camera"] = {
  position: [0, 0, 6],
  fov: 40,
  near: 0.1,
  far: 60,
};

/** Angular wolf-head silhouette, traced once and extruded into a crest relief. */
const HEAD_POINTS: [number, number][] = [
  [-0.6, 0.95],
  [-0.52, 0.6],
  [-0.44, 0.34],
  [-0.68, 0.18],
  [-0.74, -0.12],
  [-0.62, -0.3],
  [-0.7, -0.44],
  [-0.5, -0.46],
  [-0.56, -0.64],
  [-0.36, -0.66],
  [-0.33, -0.82],
  [0, -1.06],
  [0.33, -0.82],
  [0.36, -0.66],
  [0.56, -0.64],
  [0.5, -0.46],
  [0.7, -0.44],
  [0.62, -0.3],
  [0.74, -0.12],
  [0.68, 0.18],
  [0.44, 0.34],
  [0.52, 0.6],
  [0.6, 0.95],
  [0.32, 0.52],
  [0, 0.6],
  [-0.32, 0.52],
];

function buildShieldGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.1, 1.35);
  shape.lineTo(1.1, 1.35);
  shape.lineTo(1.1, -0.1);
  shape.quadraticCurveTo(1.1, -1.05, 0, -1.55);
  shape.quadraticCurveTo(-1.1, -1.05, -1.1, -0.1);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.06,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geometry.center();
  return geometry;
}

function buildHeadGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(HEAD_POINTS[0][0], HEAD_POINTS[0][1]);
  for (let i = 1; i < HEAD_POINTS.length; i += 1) {
    shape.lineTo(HEAD_POINTS[i][0], HEAD_POINTS[i][1]);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geometry.center();
  return geometry;
}

/* -------------------------------- eyes -------------------------------- */

const Eye = memo(function Eye({ side, reduced }: { side: 1 | -1; reduced: boolean }) {
  const haloRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(side > 0 ? 1.4 : 0);

  useFrame((_, delta) => {
    if (reduced || !haloRef.current) return;
    elapsed.current += Math.min(delta, 0.05);
    const material = haloRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.14 + 0.1 * (0.5 + 0.5 * Math.sin(elapsed.current * 1.7));
  });

  return (
    <group position={[side * 0.27, 0.15, 0]}>
      <mesh position={[0, 0, 0.18]} rotation={[0, 0, side * 0.3]}>
        <boxGeometry args={[0.34, 0.1, 0.06]} />
        <meshBasicMaterial color={LIME} toneMapped={false} />
      </mesh>
      <mesh ref={haloRef} position={[0, 0, 0.16]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshBasicMaterial
          color={LIME}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});

/* -------------------------------- emblem ------------------------------- */

const Emblem = memo(function Emblem({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  const parts = useMemo(() => {
    const shield = buildShieldGeometry();
    const head = buildHeadGeometry();
    return {
      shield,
      head,
      shieldEdges: new THREE.EdgesGeometry(shield, 30),
      headEdges: new THREE.EdgesGeometry(head, 25),
    };
  }, []);

  useEffect(
    () => () => {
      parts.shield.dispose();
      parts.head.dispose();
      parts.shieldEdges.dispose();
      parts.headEdges.dispose();
    },
    [parts],
  );

  useFrame((_, delta) => {
    if (reduced || !rootRef.current) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const time = elapsed.current;

    const root = rootRef.current;
    root.rotation.y = 0.45 + Math.sin(time * 0.34) * 0.5;
    root.rotation.x = 0.05 + Math.sin(time * 0.27) * 0.1;
    root.position.y = Math.sin(time * 0.75) * 0.1;

    if (ringARef.current) ringARef.current.rotation.z = time * 0.16;
    if (ringBRef.current) ringBRef.current.rotation.z = 0.15 - time * 0.11;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 6]} intensity={2.4} color={KEY_COLOR} />
      <pointLight position={[-4.5, -1, 3.5]} intensity={45} distance={22} color={CYAN} />
      <pointLight position={[4.5, 2.5, -2]} intensity={70} distance={22} color={VIOLET} />
      <spotLight
        position={[0, -4.5, 3]}
        angle={0.7}
        penumbra={1}
        intensity={60}
        distance={22}
        color={LIME}
      />

      <group ref={rootRef} rotation={[0.05, 0.45, 0]}>
        <mesh ref={ringARef} rotation={[0.18, 0, 0]} scale={[1.2, 1.55, 1]}>
          <torusGeometry args={[1, 0.02, 6, 6]} />
          <meshStandardMaterial
            color={SHIELD_COLOR}
            emissive={VIOLET}
            emissiveIntensity={1.2}
            metalness={0.2}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>

        <mesh ref={ringBRef} rotation={[1.05, 0.3, 0.15]} scale={[1.45, 1.9, 1]}>
          <torusGeometry args={[1, 0.014, 6, 6]} />
          <meshStandardMaterial
            color={SHIELD_COLOR}
            emissive={CYAN}
            emissiveIntensity={1.1}
            metalness={0.2}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>

        <mesh geometry={parts.shield} position={[0, 0, -0.06]}>
          <meshStandardMaterial
            color={SHIELD_COLOR}
            metalness={0.35}
            roughness={0.42}
            emissive={VIOLET}
            emissiveIntensity={0.1}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>

        <lineSegments geometry={parts.shieldEdges} position={[0, 0, -0.06]} renderOrder={2}>
          <lineBasicMaterial
            color={CYAN}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>

        <group position={[0, 0.04, 0.1]} scale={0.75}>
          <mesh geometry={parts.head}>
            <meshStandardMaterial
              color={HEAD_COLOR}
              metalness={0.3}
              roughness={0.45}
              emissive={VIOLET}
              emissiveIntensity={0.16}
              flatShading
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          </mesh>
          <lineSegments geometry={parts.headEdges} renderOrder={2}>
            <lineBasicMaterial
              color={VIOLET}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </lineSegments>
          <Eye side={-1} reduced={reduced} />
          <Eye side={1} reduced={reduced} />
        </group>
      </group>
    </>
  );
});

/**
 * Slowly rotating low-poly wolf crest: extruded shield + angular head relief
 * with emissive eyes, edge glow and two orbiting hex rings.
 *
 * ```tsx
 * <Emblem3D className="h-64 w-full" />
 * ```
 */
const Emblem3D = memo(function Emblem3D({ className }: Emblem3DProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className={cn("relative h-64 w-full overflow-hidden", className)}>
      <SceneCanvas reduced={reduced} camera={EMBLEM_CAMERA}>
        <Emblem reduced={reduced} />
      </SceneCanvas>
    </div>
  );
});

export default Emblem3D;
