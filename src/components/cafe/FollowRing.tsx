/** The order being followed, drawn as a violet ring under whoever or whatever has it, the inspector's colour. */
export function FollowRing({
  at,
  height = 0.02,
  radius = 0.55,
  phase,
  reduced,
}: {
  at: readonly [number, number];
  /** How high it sits: the floor, or a counter's top. */
  height?: number;
  radius?: number;
  phase: number;
  reduced: boolean;
}) {
  // It breathes while the service plays, and holds still when paused or for reduced motion.
  const scale = reduced ? 1 : 1 + Math.sin(phase * 4) * 0.05;
  return (
    <mesh position={[at[0], height, at[1]]} rotation-x={-Math.PI / 2} scale={scale} renderOrder={2}>
      <ringGeometry args={[radius * 0.76, radius, 40]} />
      <meshBasicMaterial color="#8f78d6" transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}
