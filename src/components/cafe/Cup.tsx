import { Box, Cylinder } from './primitives';
import type { Vec3 } from './primitives';

/** A take-away paper cup with a sleeve, and its lid once Brew has put one on. */
export function PaperCup({ at = [0, 0, 0], lid = false }: { at?: Vec3; lid?: boolean }) {
  return (
    <group position={at}>
      <Cylinder at={[0, 0.2, 0]} size={[0.17, 0.13, 0.36]} color="#e9dcc4" />
      <Cylinder at={[0, 0.19, 0]} size={[0.165, 0.15, 0.12]} color="#a8754f" />
      {lid && (
        <>
          <Cylinder at={[0, 0.395, 0]} size={[0.185, 0.185, 0.035]} color="#3f322b" />
          <Cylinder at={[0, 0.425, 0]} size={[0.12, 0.14, 0.03]} color="#3f322b" />
        </>
      )}
    </group>
  );
}

/** Coffee uses a low ivory cup; tea uses a tall green mug with a hanging tea tag; take-away goes in a paper cup. */
export function Cup({
  at = [0, 0, 0],
  tea = false,
  paper = false,
  lid = false,
}: {
  at?: Vec3;
  tea?: boolean;
  paper?: boolean;
  lid?: boolean;
}) {
  if (paper) return <PaperCup at={at} lid={lid} />;
  const color = tea ? '#5d9977' : '#f9ebd2',
    height = tea ? 0.36 : 0.22,
    radius = tea ? 0.145 : 0.19;
  return (
    <group position={at}>
      {!tea && <Cylinder at={[0, 0.025, 0]} size={[0.28, 0.28, 0.045]} color="#ece3ce" />}
      <Cylinder at={[0, height / 2 + 0.05, 0]} size={[radius, radius * 0.8, height]} color={color} />
      <Cylinder
        at={[0, height + 0.052, 0]}
        size={[radius * 0.86, radius * 0.86, 0.012]}
        color={tea ? '#c88a32' : '#573528'}
      />
      <mesh position={[0, height + 0.055, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius * 0.94, 0.016, 8, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[radius + 0.04, height * 0.6, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.085, 0.027, 8, 20]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {tea && (
        <>
          <Box at={[-0.045, height - 0.005, radius + 0.006]} size={[0.008, 0.13, 0.008]} color="#fff4cf" />
          <Box at={[-0.045, height - 0.09, radius + 0.015]} size={[0.085, 0.075, 0.015]} color="#f5d275" />
        </>
      )}
    </group>
  );
}
