import { RoundedBox } from '@react-three/drei';

export type Vec3 = [number, number, number];
/** Quiet café materials; saturated command colors belong to the editor. */
export const CAFE_COLORS = {
  walnut: '#70503d',
  sand: '#e6d8bf',
  clay: '#aa7965',
  sage: '#9aa88f',
  cream: '#f5eee0',
  charcoal: '#393b36',
  wall: '#78968c',
  /** The darker green of the wainscot and window frames' shadow side. */
  wallDeep: '#5d786f',
  steel: '#c1cfcc',
  steelDark: '#304941',
  brass: '#b48a4c',
  paper: '#fff3d5',
  slate: '#34403c',
  terracotta: '#c26b50',
  leaf: '#6a895b',
  leafLight: '#93a86d',
} as const;

/** How a surface answers the light: lower roughness shines, metalness tints the shine with the base colour. */
export interface Finish {
  roughness: number;
  metalness: number;
}

/**
 * Each palette colour belongs to one material family, so wood, steel, ceramic and fabric read apart under the
 * same light. Metals stay mostly dielectric: the scene has no environment map for a full metal to reflect.
 */
const FINISHES: Partial<Record<string, Finish>> = {
  [CAFE_COLORS.walnut]: { roughness: 0.62, metalness: 0 },
  [CAFE_COLORS.sand]: { roughness: 0.5, metalness: 0 },
  [CAFE_COLORS.clay]: { roughness: 0.92, metalness: 0 },
  [CAFE_COLORS.cream]: { roughness: 0.38, metalness: 0 },
  [CAFE_COLORS.charcoal]: { roughness: 0.45, metalness: 0.1 },
  [CAFE_COLORS.wall]: { roughness: 0.95, metalness: 0 },
  [CAFE_COLORS.wallDeep]: { roughness: 0.7, metalness: 0 },
  [CAFE_COLORS.steel]: { roughness: 0.32, metalness: 0.35 },
  [CAFE_COLORS.steelDark]: { roughness: 0.4, metalness: 0.2 },
  [CAFE_COLORS.brass]: { roughness: 0.35, metalness: 0.45 },
  [CAFE_COLORS.slate]: { roughness: 0.96, metalness: 0 },
  [CAFE_COLORS.terracotta]: { roughness: 0.88, metalness: 0 },
};

/** The finish of a palette colour, or the primitive's own default for colours outside the palette. */
export function finishFor(color: string, roughness: number): Finish {
  return FINISHES[color] ?? { roughness, metalness: 0 };
}

function Surface({ color, roughness, glow = 0 }: { color: string; roughness: number; glow?: number }) {
  const finish = finishFor(color, roughness);
  return (
    <meshStandardMaterial
      color={color}
      roughness={finish.roughness}
      metalness={finish.metalness}
      emissive={glow ? color : undefined}
      emissiveIntensity={glow}
    />
  );
}

/** Soft edges keep the modern furniture simple and approachable. */
export function SoftBox({
  at = [0, 0, 0],
  size,
  color,
  radius = 0.08,
}: {
  at?: Vec3;
  size: Vec3;
  color: string;
  radius?: number;
}) {
  return (
    <RoundedBox
      position={at}
      args={size}
      radius={Math.min(radius, ...size.map((n) => n / 2 - 0.001))}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.48} />
    </RoundedBox>
  );
}
export function Box({
  at = [0, 0, 0],
  size = [1, 1, 1],
  color = '#d8b38b',
  rotation = 0,
  glow = 0,
}: {
  at?: Vec3;
  size?: Vec3;
  color?: string;
  rotation?: number;
  /** Lights the box from within in its own colour, for screens, lit glass and signs. */
  glow?: number;
}) {
  return (
    <mesh position={at} rotation-y={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <Surface color={color} roughness={0.82} glow={glow} />
    </mesh>
  );
}
export function Cylinder({ at, size = [0.3, 0.3, 1], color = '#d3b690' }: { at: Vec3; size?: Vec3; color?: string }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <cylinderGeometry args={[...size, 12]} />
      <Surface color={color} roughness={0.8} />
    </mesh>
  );
}
