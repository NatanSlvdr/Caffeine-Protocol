import { Box, Cylinder, CAFE_COLORS } from './primitives';
import { STREET_WALL_FACE, STREET_WINDOWS } from './dressing';

/** The street wall's outer face: the inner face plus the wall's thickness. */
const OUTER_FACE = STREET_WALL_FACE - 0.2;
const AWNING = { width: 1.9, reach: 0.65, top: 2.56, tilt: 0.42, stripes: 8 };

/** Striped awnings over the street windows and a hanging cup sign between them: the café's face to the street. */
export function Facade() {
  return (
    <group>
      {STREET_WINDOWS.map((z) => (
        <Awning key={z} z={z} />
      ))}
      <BladeSign z={(STREET_WINDOWS[1] + STREET_WINDOWS[2]) / 2} />
    </group>
  );
}

/** A canvas awning sloping out over the sidewalk, cream and terracotta stripes with a scalloped valance. */
function Awning({ z }: { z: number }) {
  const stripe = AWNING.width / AWNING.stripes;
  return (
    <group position={[OUTER_FACE, AWNING.top, z]} rotation-z={AWNING.tilt}>
      {Array.from({ length: AWNING.stripes }, (_, i) => (
        <Box
          key={i}
          at={[-AWNING.reach / 2, 0, -AWNING.width / 2 + stripe * (i + 0.5)]}
          size={[AWNING.reach, 0.025, stripe]}
          color={i % 2 ? CAFE_COLORS.cream : CAFE_COLORS.terracotta}
        />
      ))}
      {Array.from({ length: AWNING.stripes }, (_, i) => (
        <group
          key={i}
          position={[-AWNING.reach, -0.06, -AWNING.width / 2 + stripe * (i + 0.5)]}
          rotation-z={-AWNING.tilt}
        >
          <Box size={[0.02, 0.12, stripe * 0.86]} color={i % 2 ? CAFE_COLORS.cream : CAFE_COLORS.terracotta} />
        </group>
      ))}
      <Box at={[-0.02, -0.01, 0]} size={[0.05, 0.05, AWNING.width + 0.06]} color={CAFE_COLORS.walnut} />
    </group>
  );
}

/** A round sign on a brass bracket, painted with the café's cup, facing along the street. */
function BladeSign({ z }: { z: number }) {
  return (
    <group position={[OUTER_FACE, 2.35, z]}>
      <Box at={[-0.3, 0.27, 0]} size={[0.6, 0.035, 0.035]} color={CAFE_COLORS.brass} />
      <Box at={[-0.02, 0.13, 0]} size={[0.04, 0.3, 0.06]} color={CAFE_COLORS.brass} />
      {[-0.18, -0.42].map((x) => (
        <Box key={x} at={[x, 0.22, 0]} size={[0.012, 0.09, 0.012]} color={CAFE_COLORS.charcoal} />
      ))}
      <group position={[-0.3, 0, 0]} rotation-x={Math.PI / 2}>
        <Cylinder at={[0, 0, 0]} size={[0.24, 0.24, 0.05]} color={CAFE_COLORS.walnut} />
        <Cylinder at={[0, 0, 0]} size={[0.2, 0.2, 0.056]} color={CAFE_COLORS.cream} />
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[-0.3, -0.02, side * 0.03]}>
          <Box at={[0, -0.02, 0]} size={[0.16, 0.12, 0.008]} color={CAFE_COLORS.walnut} />
          <Box at={[0, -0.09, 0]} size={[0.22, 0.02, 0.008]} color={CAFE_COLORS.clay} />
          <Box at={[0.1, 0, 0]} size={[0.04, 0.06, 0.008]} color={CAFE_COLORS.walnut} />
          {[-0.04, 0.03].map((x) => (
            <Box key={x} at={[x, 0.09, 0]} size={[0.018, 0.07, 0.008]} color={CAFE_COLORS.clay} />
          ))}
        </group>
      ))}
    </group>
  );
}
