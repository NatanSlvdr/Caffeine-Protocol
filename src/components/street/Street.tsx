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
  return (
    <group>
      <Box at={[-13.4, -0.46, STREET_BOUNDS.centerZ]} size={[3.8, 0.62, STREET_BOUNDS.length]} color="#545b69" />
      <Box at={[-10.02, -0.37, STREET_BOUNDS.centerZ]} size={[2.96, 0.78, STREET_BOUNDS.length]} color="#e9d7ba" />
      {Array.from({ length: STREET_BOUNDS.length - 1 }, (_, i) => (
        <Box key={i} at={[-10.08, 0.024, STREET_BOUNDS.minZ + i + 1]} size={[2.84, 0.009, 0.022]} color="#d0bea5" />
      ))}
      <Box at={[-10.1, 0.024, STREET_BOUNDS.centerZ]} size={[0.018, 0.009, STREET_BOUNDS.length]} color="#d0bea5" />
      {Array.from({ length: STREET_BOUNDS.length }, (_, i) => (
        <Box
          key={i}
          at={[-11.43, -0.03, STREET_BOUNDS.minZ + i + 0.5]}
          size={[0.15, 0.16, 0.97]}
          color={CAFE_COLORS.cream}
        />
      ))}
      {Array.from({ length: Math.floor(STREET_BOUNDS.length / 1.7) }, (_, i) => (
        <Box
          key={i}
          at={[-13.4, -0.142, STREET_BOUNDS.minZ + 0.7 + i * 1.7]}
          size={[0.07, 0.012, 0.8]}
          color="#fff0c7"
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} at={[-14.94 + i * 0.6, -0.134, 4.95]} size={[0.32, 0.018, 1]} color={CAFE_COLORS.cream} />
      ))}
      <StreetLamp z={-5.7} evening={evening} />
      <StreetLamp z={2.5} evening={evening} />
      <group position={[-9.05, 0, -3.7]}>
        <SoftBox at={[0, 0.57, 0]} size={[0.5, 0.13, 1.8]} radius={0.05} color={CAFE_COLORS.clay} />
        <SoftBox at={[0.2, 0.91, 0]} size={[0.12, 0.62, 1.8]} radius={0.055} color={CAFE_COLORS.clay} />
        {[-0.65, 0.65].map((z) => (
          <Box key={z} at={[0, 0.29, z]} size={[0.34, 0.5, 0.09]} color={CAFE_COLORS.walnut} />
        ))}
      </group>
      <StreetClip>
        <Car lane={-14.35} direction={1} offset={6} color={CAFE_COLORS.sage} {...motion} />
        <Car lane={-12.4} direction={-1} offset={13} color={CAFE_COLORS.sand} {...motion} />
        <Pedestrian offset={3} color={CAFE_COLORS.clay} {...motion} />
        <Pedestrian offset={7.7} color={CAFE_COLORS.walnut} {...motion} />
        <Pedestrian offset={12.4} color={CAFE_COLORS.sage} {...motion} />
      </StreetClip>
    </group>
  );
}
