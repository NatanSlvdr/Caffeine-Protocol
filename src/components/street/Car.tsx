import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from '../cafe/primitives';
import { STREET_BOUNDS } from '@/domain';
import { useLoopPosition } from '@/hooks/useLoopPosition';
import type { StreetMotion } from './StreetMotion';

/** Traffic loops fully beyond the clipped diorama before entering again. */
export function Car({ lane, direction, offset, color, paused, reduced }: StreetMotion & { lane: number; direction: number; offset: number; color: string }) {
  const ref = useRef<Group>(null);
  const elapsed = useLoopPosition(paused, reduced);
  useFrame(() => {
    if (!ref.current) return;
    const loop = STREET_BOUNDS.length + 4;
    const z = ((elapsed.current * 2.8 + offset) % loop - loop / 2) * direction + STREET_BOUNDS.centerZ;
    ref.current.position.z = z;
  });
  return <group ref={ref} position={[lane, -.12, 0]} rotation-y={direction > 0 ? 0 : Math.PI}>
    <SoftBox at={[0, .48, 0]} size={[1.12, .5, 2]} radius={.2} color={color}/>
    <SoftBox at={[0, .88, -.12]} size={[.92, .58, 1.12]} radius={.18} color={color}/>
    <SoftBox at={[0, .91, .405]} size={[.71, .31, .035]} radius={.015} color="#b9e4dd"/>
    <SoftBox at={[0, .91, -.66]} size={[.71, .27, .035]} radius={.015} color="#b9e4dd"/>
    {[-1, 1].map(side => <group key={side}>
      <Box at={[side * .466, .91, -.12]} size={[.02, .3, .72]} color="#b9e4dd"/>
      <Box at={[side * .35, .52, 1.005]} size={[.22, .12, .02]} color={CAFE_COLORS.cream}/>
      <Box at={[side * .36, .51, -1.005]} size={[.17, .1, .02]} color={CAFE_COLORS.clay}/>
      {[-.64, .64].map(z => <group key={z} position={[side * .55, .29, z]} rotation-z={Math.PI / 2}>
        <Cylinder at={[0, 0, 0]} size={[.25, .25, .14]} color="#343b46"/>
        <Cylinder at={[0, side * -.075, 0]} size={[.12, .12, .016]} color={CAFE_COLORS.cream}/>
      </group>)}
    </group>)}
  </group>;
}

