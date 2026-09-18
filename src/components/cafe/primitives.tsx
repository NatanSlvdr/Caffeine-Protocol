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
} as const;
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
    <RoundedBox position={at} args={size} radius={Math.min(radius, ...size.map((n) => n / 2 - 0.001))} smoothness={3} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.48} />
    </RoundedBox>
  );
}
export function Box({
  at = [0, 0, 0],
  size = [1, 1, 1],
  color = '#d8b38b',
  rotation = 0,
}: {
  at?: Vec3;
  size?: Vec3;
  color?: string;
  rotation?: number;
}) {
  return (
    <mesh position={at} rotation-y={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}
export function Cylinder({
  at,
  size = [0.3, 0.3, 1],
  color = '#d3b690',
}: {
  at: Vec3;
  size?: Vec3;
  color?: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <cylinderGeometry args={[...size, 12]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
