import { Box, SoftBox, CAFE_COLORS } from '../cafe/primitives';
import { STREET_BOUNDS } from '@/domain';
import { StreetClip } from './StreetClip';
import { Car } from './Car';
import { Pedestrian } from './Pedestrian';
import { StreetLamp } from './StreetLamp';
import type { StreetMotion } from './StreetMotion';

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

