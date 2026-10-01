import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from '../cafe/primitives';
import { PEDESTRIAN_LANE_X, STREET_BOUNDS } from '@/domain';
import { useLoopPosition } from '@/hooks/useLoopPosition';
import type { StreetMotion } from './StreetMotion';

const SKIN = '#dca87b';

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
      {/* Built like the café's guests: hips, a torso tapering to the waist, a neck and a head smaller than the shoulders. */}
      <Cylinder at={[0, 0.56, 0]} size={[0.19, 0.2, 0.18]} depth={0.7} color={CAFE_COLORS.charcoal} />
      <Cylinder at={[0, 0.85, 0]} size={[0.24, 0.18, 0.5]} depth={0.66} color={color} />
      <Cylinder at={[0, 1.15, 0]} size={[0.065, 0.075, 0.16]} color={SKIN} />
      <group position={[0, 1.38, 0]} scale={[0.8, 0.86, 0.82]}>
        <mesh castShadow>
          <sphereGeometry args={[0.26, 10, 8]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh position={[0, 0.02, -0.02]} rotation-x={-0.5} castShadow>
          <sphereGeometry args={[0.278, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial color="#594238" />
        </mesh>
      </group>
      <group ref={legs} position={[0, 0.52, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.1, 0, 0]}>
            <Box at={[0, -0.22, 0]} size={[0.14, 0.44, 0.16]} color={CAFE_COLORS.charcoal} />
            <SoftBox at={[0, -0.46, 0.06]} size={[0.16, 0.1, 0.28]} radius={0.03} color={CAFE_COLORS.cream} />
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.3, 1.02, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.072, 8, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <Box at={[0, -0.2, 0]} size={[0.1, 0.4, 0.12]} color={color} />
          <mesh position={[0, -0.43, 0]} castShadow>
            <sphereGeometry args={[0.065, 8, 6]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </group>
      ))}
      <SoftBox at={[0.32, 0.42, 0.06]} size={[0.26, 0.3, 0.18]} radius={0.025} color={CAFE_COLORS.sand} />
    </group>
  );
}
