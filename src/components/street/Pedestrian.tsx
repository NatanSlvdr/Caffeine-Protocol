import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from '../cafe/primitives';
import { PEDESTRIAN_LANE_X, STREET_BOUNDS } from '@/domain';
import { useLoopPosition } from '@/hooks/useLoopPosition';
import type { StreetMotion } from './StreetMotion';

/** Background walkers share one curb-side lane, one direction and one pace, so they never meet each other or the customers' line. */
export function Pedestrian({ offset, color, paused, reduced }: StreetMotion & { offset: number; color: string }) {
  const ref = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const elapsed = useLoopPosition(paused, reduced);
  useFrame(() => {
    if (!ref.current) return;
    const loop = STREET_BOUNDS.length + 2;
    const z = ((elapsed.current * 0.62 + offset) % loop) - loop / 2 + STREET_BOUNDS.centerZ;
    ref.current.position.z = z;
    ref.current.position.y = reduced ? 0 : Math.abs(Math.sin(elapsed.current * 5 + offset)) * 0.025;
    legs.current?.children.forEach((leg, i) => {
      leg.rotation.x = reduced ? 0 : Math.sin(elapsed.current * 5 + offset + i * Math.PI) * 0.35;
    });
  });
  return (
    <group ref={ref} position={[PEDESTRIAN_LANE_X, 0, 0]}>
      <Cylinder at={[0, 0.84, 0]} size={[0.22, 0.27, 0.62]} color={color} />
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.27, 10, 8]} />
        <meshStandardMaterial color="#dca87b" />
      </mesh>
      <mesh position={[0, 1.54, -0.02]} castShadow>
        <sphereGeometry args={[0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#594238" />
      </mesh>
      <group ref={legs} position={[0, 0.52, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.14, 0, 0]}>
            <Box at={[0, -0.22, 0]} size={[0.16, 0.44, 0.18]} color={CAFE_COLORS.charcoal} />
            <SoftBox at={[0, -0.45, 0.06]} size={[0.2, 0.12, 0.3]} radius={0.035} color={CAFE_COLORS.cream} />
          </group>
        ))}
      </group>
      <Box at={[-0.33, 0.83, 0]} size={[0.13, 0.44, 0.16]} color={color} />
      <Box at={[0.33, 0.83, 0]} size={[0.13, 0.44, 0.16]} color={color} />
      <SoftBox at={[0.34, 0.46, 0.08]} size={[0.3, 0.33, 0.2]} radius={0.025} color={CAFE_COLORS.sand} />
    </group>
  );
}
