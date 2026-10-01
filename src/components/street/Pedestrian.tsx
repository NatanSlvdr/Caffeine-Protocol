import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { SoftBox, CAFE_COLORS } from '../cafe/primitives';
import { HumanModel } from '../cafe/HumanModel';
import type { HumanLook } from '../cafe/looks';
import { PEDESTRIAN_LANE_X, STREET_BOUNDS } from '@/domain';
import { useLoopPosition } from '@/hooks/useLoopPosition';
import type { StreetMotion } from './StreetMotion';

/** Background walkers share one curb-side lane, one direction and one pace, so they never meet each other or the customers' line. */
export function Pedestrian({ offset, look, paused, reduced }: StreetMotion & { offset: number; look: HumanLook }) {
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
      <HumanModel look={look} legsRef={legs} />
      {/* A shopping bag hanging from the right hand. */}
      <SoftBox at={[0.3, 0.36, 0.02]} size={[0.2, 0.26, 0.15]} radius={0.025} color={CAFE_COLORS.sand} />
      <mesh position={[0.3, 0.49, 0.02]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.055, 0.008, 4, 10, Math.PI]} />
        <meshStandardMaterial color={CAFE_COLORS.walnut} />
      </mesh>
    </group>
  );
}
