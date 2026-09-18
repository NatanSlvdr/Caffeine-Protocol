import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from '../cafe/primitives';
import { STREET_BOUNDS } from '@/domain';
import { useLoopPosition } from '@/hooks/useLoopPosition';
import type { StreetMotion } from './StreetMotion';

/** Background walkers use the outer sidewalk, leaving the café approach clear. */
export function Pedestrian({ offset, direction, color, paused, reduced }: StreetMotion & { offset: number; direction: number; color: string }) {
  const ref = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const elapsed = useLoopPosition(paused, reduced);
  useFrame(() => {
    if (!ref.current) return;
    const loop = STREET_BOUNDS.length + 2;
    const z = ((elapsed.current * .62 + offset) % loop - loop / 2) * direction + STREET_BOUNDS.centerZ;
    ref.current.position.z = z;
    ref.current.position.y = reduced ? 0 : Math.abs(Math.sin(elapsed.current * 5 + offset)) * .025;
    legs.current?.children.forEach((leg, i) => { leg.rotation.x = reduced ? 0 : Math.sin(elapsed.current * 5 + offset + i * Math.PI) * .35; });
  });
  return <group ref={ref} position={[direction > 0 ? -10.15 : -10.65, 0, 0]} rotation-y={direction > 0 ? 0 : Math.PI}>
    <Cylinder at={[0, .84, 0]} size={[.22, .27, .62]} color={color}/>
    <mesh position={[0, 1.4, 0]} castShadow><sphereGeometry args={[.27, 10, 8]}/><meshStandardMaterial color="#dca87b"/></mesh>
    <mesh position={[0, 1.54, -.02]} castShadow><sphereGeometry args={[.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]}/><meshStandardMaterial color="#594238"/></mesh>
    <group ref={legs} position={[0, .52, 0]}>{[-1, 1].map(side => <group key={side} position={[side * .14, 0, 0]}>
      <Box at={[0, -.22, 0]} size={[.16, .44, .18]} color={CAFE_COLORS.charcoal}/>
      <SoftBox at={[0, -.45, .06]} size={[.2, .12, .3]} radius={.035} color={CAFE_COLORS.cream}/>
    </group>)}</group>
    <Box at={[-.33, .83, 0]} size={[.13, .44, .16]} color={color}/>
    <Box at={[.33, .83, 0]} size={[.13, .44, .16]} color={color}/>
    <SoftBox at={[.34, .46, .08]} size={[.3, .33, .2]} radius={.025} color={CAFE_COLORS.sand}/>
  </group>;
}

