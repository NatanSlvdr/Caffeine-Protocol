import type { Restoration } from '@/domain';
import { LAMP_WARM } from '../three/lightMoods';
import { Box, Cylinder, CAFE_COLORS } from './primitives';
import { BACK_WALL_FACE, STREET_WALL_FACE } from './dressing';
import { BREW, MOKA, NIKO, PIP, PORTER, QUERY, type HumanLook, type RobotLook } from './looks';

type At = [number, number, number];

const APRON = { ...NIKO.apron!, pocket: '#8c4527' };
const PHOTO = { sky: '#c7e3df', visor: '#1f3a33', eye: '#9ff0c0' };

/**
 * What the story leaves on the back wall, each piece from the scene that hangs it: Query's Employee of the Month
 * photo, the aprons on their hooks, every light on, and the group photo with Lou's postcard. All of it sits between
 * the wall's other fittings, high enough that nobody standing in the café ever covers it.
 */
export function StoryDressing({ restored, evening }: { restored: ReadonlySet<Restoration>; evening: boolean }) {
  return (
    <group>
      {restored.has('employee-photo') && <EmployeePhoto at={[-3.55, 1.6, BACK_WALL_FACE]} />}
      <ApronHooks
        at={[4.3, 1.78, BACK_WALL_FACE]}
        moka={restored.has('moka-apron')}
        niko={restored.has('niko-apron')}
      />
      {restored.has('string-lights') && <StringLights evening={evening} />}
      {restored.has('lou-postcard') && <GroupPhoto at={[-5.65, 1.64, BACK_WALL_FACE]} />}
    </group>
  );
}

/** Query in its badge, framed, with a brass plate and a rosette on the corner. */
function EmployeePhoto({ at }: { at: At }) {
  return (
    <group position={at}>
      <Box at={[0, 0, 0.02]} size={[0.46, 0.58, 0.04]} color={CAFE_COLORS.walnut} />
      <Box at={[0, 0, 0.042]} size={[0.38, 0.5, 0.006]} color={CAFE_COLORS.cream} />
      <Box at={[0, 0.05, 0.046]} size={[0.3, 0.34, 0.006]} color={PHOTO.sky} />
      <Box at={[0, -0.06, 0.05]} size={[0.22, 0.12, 0.006]} color={QUERY.body} />
      <Box at={[0, 0.07, 0.05]} size={[0.15, 0.13, 0.006]} color={QUERY.body} />
      <Box at={[0, 0.075, 0.054]} size={[0.12, 0.05, 0.004]} color={PHOTO.visor} />
      {[-0.03, 0.03].map((x) => (
        <Box key={x} at={[x, 0.075, 0.057]} size={[0.022, 0.022, 0.003]} color={PHOTO.eye} />
      ))}
      <Box at={[0.06, -0.06, 0.054]} size={[0.035, 0.035, 0.004]} color={CAFE_COLORS.brass} />
      <Box at={[0, -0.19, 0.046]} size={[0.2, 0.045, 0.008]} color={CAFE_COLORS.brass} />
      <mesh position={[0.18, 0.24, 0.05]}>
        <circleGeometry args={[0.055, 12]} />
        <meshStandardMaterial color={CAFE_COLORS.brass} roughness={0.35} metalness={0.45} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0.18 + side * 0.02, 0.17, 0.048]} rotation-z={side * 0.25}>
          <Box size={[0.03, 0.09, 0.004]} color={CAFE_COLORS.terracotta} />
        </group>
      ))}
    </group>
  );
}

/** A walnut rail with two brass pegs by the kitchen end of the wall, for the aprons of those who hang them up. */
function ApronHooks({ at, moka, niko }: { at: At; moka: boolean; niko: boolean }) {
  return (
    <group position={at}>
      <Box at={[0, 0, 0.015]} size={[0.74, 0.08, 0.03]} color={CAFE_COLORS.walnut} />
      {[-0.2, 0.2].map((x) => (
        <group key={x} position={[x, 0, 0.06]} rotation-x={Math.PI / 2}>
          <Cylinder at={[0, 0, 0]} size={[0.018, 0.018, 0.08]} color={CAFE_COLORS.brass} />
        </group>
      ))}
      {moka && <HangingApron at={[-0.2, 0, 0.07]} tilt={0.04} note />}
      {niko && <HangingApron at={[0.2, 0, 0.07]} tilt={-0.05} />}
    </group>
  );
}

/** A crew apron hung by its neck strap, ties dangling; Moka's has her 92° note pinned to the bib. */
function HangingApron({ at, tilt, note = false }: { at: At; tilt: number; note?: boolean }) {
  return (
    <group position={at} rotation-z={tilt}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.045, -0.06, 0]} rotation-z={side * 0.5}>
          <Box size={[0.014, 0.13, 0.008]} color={APRON.straps} />
        </group>
      ))}
      <Box at={[0, -0.2, 0]} size={[0.2, 0.17, 0.016]} color={APRON.color} />
      <Box at={[0, -0.45, 0]} size={[0.3, 0.34, 0.016]} color={APRON.color} />
      <Box at={[0, -0.47, 0.01]} size={[0.16, 0.08, 0.006]} color={APRON.pocket} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.16, -0.36, 0.004]} rotation-z={side * 0.15}>
          <Box size={[0.014, 0.16, 0.006]} color={APRON.straps} />
        </group>
      ))}
      {note && (
        <group position={[0.02, -0.2, 0.012]} rotation-z={-0.12}>
          <Box size={[0.11, 0.08, 0.004]} color={CAFE_COLORS.paper} />
          {[0.012, -0.014].map((y, i) => (
            <Box key={y} at={[-0.008 + i * 0.01, y, 0.003]} size={[0.06 - i * 0.02, 0.01, 0.002]} color="#5a4636" />
          ))}
          <Box at={[0, 0.035, 0.004]} size={[0.016, 0.016, 0.004]} color={CAFE_COLORS.terracotta} />
        </group>
      )}
    </group>
  );
}

/** Bulbs strung in swags just under the wall's top, from the street wall to the kitchen end: every light on. */
const STRING = { left: STREET_WALL_FACE + 0.25, right: 7.3, spans: 6, bulbs: 5, top: 2.58, sag: 0.13 };

function StringLights({ evening }: { evening: boolean }) {
  const span = (STRING.right - STRING.left) / STRING.spans;
  const height = (t: number) => STRING.top - STRING.sag * Math.sin(Math.PI * t);
  const points = Array.from({ length: STRING.spans * STRING.bulbs + 1 }, (_, i) => {
    const t = (i % STRING.bulbs) / STRING.bulbs;
    return [STRING.left + (span * i) / STRING.bulbs, height(t)] as const;
  });
  const bulbs = Array.from({ length: STRING.spans }, (_, s) =>
    Array.from({ length: STRING.bulbs - 1 }, (_, b) => {
      const t = (b + 1) / STRING.bulbs;
      return [STRING.left + span * (s + t), height(t) - 0.035] as const;
    }),
  ).flat();
  return (
    <group position-z={BACK_WALL_FACE + 0.1}>
      {points.slice(1).map(([x, y], i) => {
        const [px, py] = points[i];
        return (
          <group key={i} position={[(x + px) / 2, (y + py) / 2, 0]} rotation-z={Math.atan2(y - py, x - px)}>
            <Box size={[Math.hypot(x - px, y - py) + 0.006, 0.008, 0.008]} color={CAFE_COLORS.charcoal} />
          </group>
        );
      })}
      {points
        .filter((_, i) => i % STRING.bulbs === 0)
        .map(([x, y]) => (
          <Box key={x} at={[x, y + 0.01, -0.06]} size={[0.025, 0.025, 0.12]} color={CAFE_COLORS.brass} />
        ))}
      {bulbs.map(([x, y]) => (
        <mesh key={x} position={[x, y, 0]}>
          <sphereGeometry args={[0.032, 10, 8]} />
          <meshStandardMaterial
            color="#ffe9bf"
            emissive={LAMP_WARM}
            emissiveIntensity={evening ? 1.8 : 0.55}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Everyone at the café, framed in a row, and Lou's seaside postcard pinned at the corner. */
function GroupPhoto({ at }: { at: At }) {
  const crew: ({ human: HumanLook } | { robot: RobotLook })[] = [
    { human: MOKA },
    { robot: QUERY },
    { human: NIKO },
    { robot: BREW },
    { robot: PORTER },
    { human: PIP },
  ];
  return (
    <group position={at}>
      <Box at={[0, 0, 0.02]} size={[0.76, 0.54, 0.04]} color={CAFE_COLORS.walnut} />
      <Box at={[0, 0, 0.042]} size={[0.68, 0.46, 0.006]} color={CAFE_COLORS.cream} />
      <Box at={[0, 0.02, 0.046]} size={[0.6, 0.36, 0.006]} color={CAFE_COLORS.sand} />
      <Box at={[0, -0.1, 0.048]} size={[0.6, 0.12, 0.006]} color={CAFE_COLORS.clay} />
      {crew.map((who, i) => (
        <group key={i} position={[-0.225 + i * 0.09, -0.08, 0.052]}>
          {'robot' in who ? (
            <>
              <Box at={[0, 0.045, 0]} size={[0.06, 0.09, 0.004]} color={who.robot.body} />
              <Box at={[0, 0.12, 0]} size={[0.055, 0.045, 0.004]} color={who.robot.body} />
              <Box at={[0, 0.12, 0.003]} size={[0.04, 0.016, 0.002]} color={PHOTO.visor} />
            </>
          ) : (
            <>
              <Box at={[0, 0.05, 0]} size={[0.06, 0.1, 0.004]} color={who.human.top} />
              <Box at={[0, 0.13, 0]} size={[0.045, 0.05, 0.004]} color={who.human.skin} />
              <Box at={[0, 0.152, 0.002]} size={[0.05, 0.016, 0.002]} color={who.human.hair} />
            </>
          )}
        </group>
      ))}
      <group position={[0.42, -0.2, 0.05]} rotation-z={-0.14}>
        <Box size={[0.28, 0.19, 0.006]} color={CAFE_COLORS.paper} />
        <Box at={[0, 0.03, 0.004]} size={[0.24, 0.08, 0.003]} color="#6f9fb7" />
        <Box at={[0, -0.04, 0.004]} size={[0.24, 0.06, 0.003]} color={CAFE_COLORS.sand} />
        <mesh position={[0.07, 0.05, 0.007]}>
          <circleGeometry args={[0.022, 12]} />
          <meshBasicMaterial color="#f2c46b" />
        </mesh>
        <Box at={[-0.1, 0.075, 0.009]} size={[0.02, 0.02, 0.008]} color={CAFE_COLORS.terracotta} />
      </group>
    </group>
  );
}
