# `@/components/three` — Wolvinix 3D layer

Self-contained WebGL + 3D-tilt components. Everything here is procedural:
no remote models, HDRIs, textures or `Environment preset` — lighting comes
from `ambientLight` / `directionalLight` / `pointLight` / `spotLight` only.
Every component is `React.memo`'d, `lazy()`-safe (default/named exports only,
no module-scope side effects) and wrapped in `WebGLGuard`, so low-end devices
fall back to a styled gradient instead of crashing.

Canvas defaults shared by all scenes (see `SceneCanvas`):

- `dpr={[1, 1.75]}`, `gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}`
- `frameloop="always"` → `"demand"` when `prefers-reduced-motion` → `"never"` when
  scrolled off-screen (IntersectionObserver), so scenes pause when not visible
- canvas is `pointer-events: none`; parallax tracks `window` pointer events
- fallback gradient uses `var(--bg)` / `var(--brand-500)` / `var(--accent)` / `var(--lime)`

## Exports

### `HeroScene` (default) — `HeroScene.tsx`

Full-bleed hero for `/auth`: faceted crystalline core with an emissive
violet→cyan shader gradient + lime fresnel rim, 5 shards and 2 orbit rings on
tilted orbits, mouse parallax (damped `useFrame` lerp), neon rim lighting with
fog, a ground glow plane and drifting dust particles.

```tsx
import HeroScene from "@/components/three/HeroScene";

<HeroScene className="absolute inset-0" />;
// props: { className?: string; intensity?: number /* default 1 */ }
```

### `ParticleField` (named) — `ParticleField.tsx`

Decorative particle backdrop rendered as a single `Points` draw call with a
small custom shader (per-particle size + alpha), slow upward drift and
sinusoidal horizontal sway. Colors are sampled from brand/accent/lime.

```tsx
import { ParticleField } from "@/components/three/ParticleField";

<ParticleField className="absolute inset-0 -z-10" density={60} />;
// props: { className?: string; density?: number /* 8…480, default 60 */ }
```

### `TiltCard` (named) — `TiltCard.tsx`

DOM perspective tilt (no WebGL) for card grids. rAF-throttled, transform-only;
scales to `1.02` with a shadow lift on enter and springs back on leave.
Optional `glare` paints a radial sheen driven by `--gx` / `--gy` custom
properties. Rotation is disabled under `prefers-reduced-motion`.

```tsx
import { TiltCard } from "@/components/three/TiltCard";

<TiltCard intensity={10} className="h-full" glare resetMs={480}>
  <Card>…</Card>
</TiltCard>;
// props: { children, className?, intensity = 10, glare?, resetMs? = 480 }
```

Children fill the wrapper (`h-full` friendly).

### `Emblem3D` (default) — `Emblem3D.tsx`

Procedural low-poly wolf crest: extruded shield, extruded angular wolf-head
relief (built from a traced point list, no model files), two glowing lime eyes
with additive halos, emissive edge outlines and two orbiting hex rings.
Rotates gently and bobs; static composed frame under reduced motion.

```tsx
import Emblem3D from "@/components/three/Emblem3D";

<Emblem3D className="h-64 w-full" />;
// props: { className?: string }
```

### `WebGLGuard` (named) + `useHasWebGL()` (named) — `WebGLGuard.tsx`

Renders `children` only when a WebGL context can be created; otherwise renders
a `var(--bg)` + brand/accent/lime radial-gradient placeholder (optionally with
`fallback` content layered on top).

```tsx
import { WebGLGuard, useHasWebGL } from "@/components/three/WebGLGuard";

<WebGLGuard className="h-full w-full" fallback={<span>No WebGL</span>}>
  <Canvas>…</Canvas>
</WebGLGuard>;
// props: { children?, className?, fallback? }
```

`useHasWebGL()` returns a cached `boolean` (probed once per session).

### Internal helpers (not part of the UI contract)

| Export        | File              | Purpose                                                                               |
| ------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `SceneCanvas` | `SceneCanvas.tsx` | Shared `<Canvas>` wrapper: DPR, GL flags, frameloop, `WebGLGuard`, off-screen pausing |
| `useInView`   | `SceneCanvas.tsx` | IntersectionObserver visibility hook used by `SceneCanvas`                            |

## Notes for consumers

- Pass sizing via `className`; `HeroScene` / `ParticleField` default to
  `absolute inset-0` and are `pointer-events-none`, so they never block clicks.
- `Emblem3D` defaults to `h-64 w-full` and accepts a overriding `className`.
- Theme colors come from CSS custom properties; the only hex literals are the
  three.js emissive/light colors (`#8b5cf6` violet, `#22d3ee` cyan, `#a3e635` lime).
