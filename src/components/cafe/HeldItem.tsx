import type { Cargo } from '@/domain';
import { Box } from './primitives';
import { Cup } from './Cup';
import type { Vec3 } from './primitives';

/** Carried things are drawn smaller than set-down cups so a full hand never reaches into the body. */
export const HELD_SCALE = 0.6;

/** One carried item resting on a palm: `at` is the top of the hand. */
export function HeldItem({ cargo, at }: { cargo: Cargo; at: Vec3 }) {
  if (cargo.stage === 'claimed')
    return (
      <group position={at}>
        <Box at={[0, 0.006, 0]} size={[0.15, 0.012, 0.19]} color="#fff3d5" />
        <Box at={[0, 0.014, -0.04]} size={[0.1, 0.004, 0.02]} color="#405d61" />
      </group>
    );
  if (cargo.stage === 'beans')
    return (
      <group position={at}>
        <Box at={[0, 0.09, 0]} size={[0.14, 0.18, 0.09]} color="#8a5a3a" />
        <Box at={[0, 0.185, 0]} size={[0.14, 0.02, 0.04]} color="#6e452b" />
      </group>
    );
  return (
    <group position={at} scale={HELD_SCALE}>
      <Cup tea={cargo.item === 'tea'} paper={cargo.table === 0 && cargo.stage !== 'dirty'} lid={cargo.lid} />
    </group>
  );
}
