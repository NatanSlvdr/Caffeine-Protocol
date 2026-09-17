import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Plane, Vector3, type Group } from 'three';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from './CafeModels';
import { STREET_BOUNDS } from '@/domain/street';

type StreetMotion = { paused: boolean; reduced: boolean };

const streetPlanes = [new Plane(new Vector3(0, 0, 1), -STREET_BOUNDS.minZ), new Plane(new Vector3(0, 0, -1), STREET_BOUNDS.maxZ)];

/** Clip geometry and shadows at the ends of the street, without scaling the models. */
export function StreetClip({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material.clippingPlanes === streetPlanes) continue;
        material.clippingPlanes = streetPlanes;
        material.clipShadows = true;
        material.needsUpdate = true;
      }
    });
  }, [children]);
  return <group ref={ref}>{children}</group>;
}

/** Traffic loops fully beyond the clipped diorama before entering again. */
function Car({ lane, direction, offset, color, paused, reduced }: StreetMotion & { lane: number; direction: number; offset: number; color: string }) {
  const ref = useRef<Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (!paused && !reduced) elapsed.current += delta;
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

/** Background walkers use the outer sidewalk, leaving the café approach clear. */
function Pedestrian({ offset, direction, color, paused, reduced }: StreetMotion & { offset: number; direction: number; color: string }) {
  const ref = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (!paused && !reduced) elapsed.current += delta;
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

function StreetLamp({ z, evening }: { z: number; evening: boolean }) {
  return <group position={[-11.2, 0, z]}>
    <Cylinder at={[0, .07, 0]} size={[.2, .23, .13]} color={CAFE_COLORS.charcoal}/>
    <Cylinder at={[0, 1.5, 0]} size={[.055, .07, 3]} color={CAFE_COLORS.walnut}/>
    <SoftBox at={[.2, 3, 0]} size={[.58, .12, .34]} radius={.055} color={CAFE_COLORS.walnut}/>
    <mesh position={[.24, 2.925, 0]}><boxGeometry args={[.38, .035, .24]}/><meshStandardMaterial color="#fff1c5" emissive="#ffc66a" emissiveIntensity={evening ? 2 : .15}/></mesh>
  </group>;
}

/** A compact neighborhood edge extends the café's color palette into the street. */
export function Street({ paused, reduced, evening }: StreetMotion & { evening: boolean }) {
  const motion = { paused, reduced };
  return <group>
    <Box at={[-13.4, -.46, STREET_BOUNDS.centerZ]} size={[3.8, .62, STREET_BOUNDS.length]} color="#545b69"/>
    <Box at={[-10.02, -.37, STREET_BOUNDS.centerZ]} size={[2.96, .78, STREET_BOUNDS.length]} color="#e9d7ba"/>
    {Array.from({ length: STREET_BOUNDS.length - 1 }, (_, i) => <Box key={i} at={[-10.08, .024, STREET_BOUNDS.minZ + i + 1]} size={[2.84, .009, .022]} color="#d0bea5"/>)}
    <Box at={[-10.1, .024, STREET_BOUNDS.centerZ]} size={[.018, .009, STREET_BOUNDS.length]} color="#d0bea5"/>
    {Array.from({ length: STREET_BOUNDS.length }, (_, i) => <Box key={i} at={[-11.43, -.03, STREET_BOUNDS.minZ + i + .5]} size={[.15, .16, .97]} color={CAFE_COLORS.cream}/>)}
    {Array.from({ length: Math.floor(STREET_BOUNDS.length / 1.7) }, (_, i) => <Box key={i} at={[-13.4, -.142, STREET_BOUNDS.minZ + .7 + i * 1.7]} size={[.07, .012, .8]} color="#fff0c7"/>)}
    {Array.from({ length: 6 }, (_, i) => <Box key={i} at={[-14.94 + i * .6, -.134, 4.95]} size={[.32, .018, 1]} color={CAFE_COLORS.cream}/>)}
    <StreetLamp z={-5.7} evening={evening}/><StreetLamp z={2.5} evening={evening}/>
    <group position={[-9.05, 0, -3.7]}>
      <SoftBox at={[0, .57, 0]} size={[.5, .13, 1.8]} radius={.05} color={CAFE_COLORS.clay}/>
      <SoftBox at={[.2, .91, 0]} size={[.12, .62, 1.8]} radius={.055} color={CAFE_COLORS.clay}/>
      {[-.65, .65].map(z => <Box key={z} at={[0, .29, z]} size={[.34, .5, .09]} color={CAFE_COLORS.walnut}/>)}
    </group>
    <StreetClip><Car lane={-14.35} direction={1} offset={6} color={CAFE_COLORS.sage} {...motion}/>
    <Car lane={-12.4} direction={-1} offset={13} color={CAFE_COLORS.sand} {...motion}/>
    <Pedestrian direction={1} offset={3} color={CAFE_COLORS.clay} {...motion}/>
    <Pedestrian direction={-1} offset={8} color={CAFE_COLORS.walnut} {...motion}/>
    <Pedestrian direction={1} offset={13} color={CAFE_COLORS.sage} {...motion}/></StreetClip>
  </group>;
}
