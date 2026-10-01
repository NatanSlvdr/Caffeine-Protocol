import type { Cargo } from '@/domain';
import { Box, Cylinder, type Vec3 } from './primitives';
import { Cup } from './Cup';
import type { HumanLook } from './looks';
import { DRINK_SCALE, HUMAN_ARM as ARM, humanArmPose, itemsForHand, sipCup, type ArmPose } from './arms';
import { HeldItem } from './HeldItem';

/**
 * Heads, hair and hats are modelled at radius 0.26, then drawn a fifth smaller and a little taller than wide,
 * so the head sits on a neck between shoulders instead of capping the body like a dome.
 */
const HEAD_SCALE: Vec3 = [0.8, 0.86, 0.82];
/** Torso and hips are deeper side to side than front to back, like a person's. */
const TORSO_DEPTH = 0.66;

function Ball({ at = [0, 0, 0], radius, color, scale }: { at?: Vec3; radius: number; color: string; scale?: Vec3 }) {
  return (
    <mesh position={at} scale={scale} castShadow>
      <sphereGeometry args={[radius, 12, 10]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

/** A hair shell over the crown, tipped back so the forehead and face stay clear. */
function HairCap({ color, radius = 0.278 }: { color: string; radius?: number }) {
  return (
    <mesh position={[0, 0.02, -0.02]} rotation-x={-0.5} castShadow>
      <sphereGeometry args={[radius, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

const CURLS: Vec3[] = [
  [-0.2, 0.12, 0.06],
  [0.2, 0.12, 0.06],
  [-0.23, -0.02, -0.06],
  [0.23, -0.02, -0.06],
  [-0.12, 0.2, -0.14],
  [0.12, 0.2, -0.14],
  [0, 0.1, -0.24],
  [-0.1, 0.24, 0.08],
  [0.1, 0.24, 0.08],
];

function Hair({ look }: { look: HumanLook }) {
  const { hair, hairStyle, streak } = look;
  return (
    <>
      <HairCap color={hair} />
      {hairStyle === 'messy' &&
        (
          [
            [-0.13, 0.2, 0.11],
            [0.02, 0.25, 0.08],
            [0.14, 0.19, 0.1],
            [-0.06, 0.23, -0.1],
            [0.1, 0.21, -0.12],
          ] as Vec3[]
        ).map(([x, y, z], i) => (
          // Under a cap the tufts only peek out round the rim.
          <Ball key={i} at={look.hat ? [x * 1.3, y - 0.14, z * 1.3] : [x, y, z]} radius={0.095} color={hair} />
        ))}
      {hairStyle === 'bun' && <Ball at={[0, 0.22, -0.17]} radius={0.12} color={hair} />}
      {(hairStyle === 'curly' || hairStyle === 'curly-bun') &&
        CURLS.map((at, i) => <Ball key={i} at={at} radius={0.1} color={streak && i % 3 === 1 ? streak : hair} />)}
      {hairStyle === 'curly-bun' && <Ball at={[0, 0.3, -0.06]} radius={0.15} color={hair} />}
      {hairStyle === 'long' && (
        <>
          <Ball at={[0, -0.13, -0.12]} radius={0.27} scale={[1.08, 1.45, 0.62]} color={hair} />
          <Ball at={[-0.21, -0.1, 0.02]} radius={0.1} scale={[0.8, 1.9, 0.9]} color={hair} />
          <Ball at={[0.21, -0.1, 0.02]} radius={0.1} scale={[0.8, 1.9, 0.9]} color={hair} />
        </>
      )}
    </>
  );
}

function Hat({ hat }: { hat: NonNullable<HumanLook['hat']> }) {
  const dome = (
    <mesh
      position={[0, hat.kind === 'flat-cap' ? 0.1 : 0.08, 0]}
      scale={[1, hat.kind === 'flat-cap' ? 0.75 : 0.85, 1]}
      castShadow
    >
      <sphereGeometry args={[0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={hat.color} roughness={0.9} />
    </mesh>
  );
  return (
    <>
      {dome}
      <mesh
        position={hat.kind === 'flat-cap' ? [0, 0.11, 0.25] : [0, 0.09, -0.3]}
        rotation-x={hat.kind === 'flat-cap' ? 0.2 : -0.15}
      >
        <boxGeometry args={[0.3, 0.025, 0.16]} />
        <meshStandardMaterial color={hat.color} roughness={0.9} />
      </mesh>
    </>
  );
}

/** Head, hair and face details, centred on the middle of the head. */
function Head({ look }: { look: HumanLook }) {
  return (
    <>
      <Ball radius={0.26} color={look.skin} />
      <Ball at={[0, -0.04, 0.255]} radius={0.045} color={look.skin} />
      <Hair look={look} />
      {look.hat && <Hat hat={look.hat} />}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Ball at={[side * 0.085, 0.02, 0.238]} radius={0.028} color="#2a1d16" />
          <Ball at={[side * 0.255, -0.01, 0]} radius={0.05} color={look.skin} />
          {look.glasses && (
            <mesh position={[side * 0.09, 0.02, 0.252]}>
              <torusGeometry args={[0.058, 0.012, 6, 14]} />
              <meshStandardMaterial color={look.glasses} />
            </mesh>
          )}
        </group>
      ))}
      {look.mustache && <Box at={[0, -0.075, 0.245]} size={[0.15, 0.035, 0.04]} color={look.mustache} />}
      {look.headband && (
        <mesh position={[0, 0.12, 0.01]} rotation-x={Math.PI / 2 - 0.25}>
          <torusGeometry args={[0.262, 0.03, 6, 20]} />
          <meshStandardMaterial color={look.headband} />
        </mesh>
      )}
      {look.sunglasses && (
        <group position={[0, 0.2, 0.18]} rotation-x={-0.6}>
          {[-1, 1].map((side) => (
            <Box key={side} at={[side * 0.08, 0, 0]} size={[0.12, 0.07, 0.03]} color={look.sunglasses} />
          ))}
        </group>
      )}
    </>
  );
}

/** Collar, tie, scarf, headphones and apron, drawn over the torso's flattened front. */
function Outfit({ look }: { look: HumanLook }) {
  const { apron } = look;
  return (
    <>
      {look.collar && <Box at={[0, 0.99, 0.165]} size={[0.14, 0.17, 0.03]} color={look.collar} />}
      {look.tie && <Box at={[0, 0.93, 0.188]} size={[0.045, 0.22, 0.02]} color={look.tie} />}
      {look.scarf && (
        <>
          <mesh position={[0, 1.1, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.14, 0.06, 8, 16]} />
            <meshStandardMaterial color={look.scarf} roughness={0.95} />
          </mesh>
          <Box at={[0.07, 0.93, 0.18]} size={[0.08, 0.3, 0.05]} color={look.scarf} />
        </>
      )}
      {look.headphones && (
        <>
          <mesh position={[0, 1.1, 0.02]} rotation-x={Math.PI / 2 - 0.2}>
            <torusGeometry args={[0.16, 0.03, 6, 16]} />
            <meshStandardMaterial color={look.headphones} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.13, 1.08, 0.1]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.07, 0.07, 0.06, 12]} />
              <meshStandardMaterial color={look.headphones} />
            </mesh>
          ))}
        </>
      )}
      {apron && (
        <>
          <Box at={[0, 0.72, 0.17]} size={[0.34, 0.54, 0.03]} color={apron.color} />
          <Box at={[0, 0.66, 0.19]} size={[0.18, 0.11, 0.01]} color={apron.straps} />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Box at={[side * 0.1, 1.03, 0.16]} size={[0.045, 0.12, 0.03]} color={apron.straps} />
              <Box at={[side * 0.1, 1.095, 0]} size={[0.045, 0.025, 0.34]} color={apron.straps} />
            </group>
          ))}
        </>
      )}
    </>
  );
}

/** A person from the cast, posed for walking, sitting and sipping; the face points down +z. */
export function HumanModel({
  look,
  sit,
  stride,
  sip,
  drinking,
  tea,
  paper,
  held = [],
  reach = 0,
}: {
  look: HumanLook;
  sit: number;
  stride: number;
  sip: number;
  drinking: boolean;
  tea: boolean;
  paper: boolean;
  /** What a crew stand-in carries: one item per hand. */
  held?: readonly Cargo[];
  reach?: number;
}) {
  const lift = sit * 0.26;
  const hip = 0.51 + sit * 0.21;
  const scale = look.scale ?? 1;
  const drink = sipCup(sit, sip, tea);
  const arms = [-1, 1].map((side) =>
    humanArmPose(side, {
      carrying: itemsForHand(held, side).length > 0,
      scale,
      reach,
      sit,
      stride,
      drink: drinking ? drink.handle : undefined,
    }),
  );
  return (
    <group scale={scale}>
      <group position={[0, lift, 0]}>
        {/* Hips in the trousers, a torso broad at the shoulders and narrow at the waist, and a neck. */}
        <Cylinder at={[0, 0.55, 0]} size={[0.2, 0.21, 0.18]} depth={0.7} color={look.trousers} />
        <Cylinder at={[0, 0.84, 0]} size={[0.25, 0.19, 0.5]} depth={TORSO_DEPTH} color={look.top} />
        <Cylinder at={[0, 1.14, 0]} size={[0.065, 0.075, 0.16]} color={look.skin} />
        <Outfit look={look} />
      </group>
      <group position={[0, 1.37 + lift, 0]} rotation-x={-sip * 0.1}>
        <group scale={HEAD_SCALE}>
          <Head look={look} />
        </group>
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <group position={[side * 0.1, hip, 0]} rotation-x={(-sit * Math.PI) / 2 + stride * side * 0.5 * (1 - sit)}>
            <Box at={[0, -0.12, 0]} size={[0.15, 0.25, 0.17]} color={look.trousers} />
            <group
              position={[0, -0.25, 0]}
              rotation-x={(sit * Math.PI) / 2 + Math.max(0, -stride * side) * 0.35 * (1 - sit)}
            >
              <Box at={[0, -0.12, 0]} size={[0.14, 0.25, 0.15]} color={look.trousers} />
              <Box at={[0, -0.2, 0.08]} size={[0.16, 0.12, 0.3]} color={look.shoes} />
            </group>
          </group>
          <Arm look={look} side={side} pose={arms[side === 1 ? 1 : 0]} lift={lift} />
          {itemsForHand(held, side).map((cargo, i) => {
            const [x, y, z] = arms[side === 1 ? 1 : 0].hand;
            return <HeldItem key={cargo.ticketId} cargo={cargo} at={[x, y + lift + ARM.hand, z + i * 0.3]} />;
          })}
        </group>
      ))}
      {drinking && (
        <group position={[drink.at[0], drink.at[1] + lift, drink.at[2]]} rotation-x={drink.tilt} scale={DRINK_SCALE}>
          <Cup tea={tea} paper={paper} lid={paper} />
        </group>
      )}
    </group>
  );
}

/** Rounded shoulder, sleeve and hand, posed by the shared two-bone arm. */
function Arm({ look, side, pose, lift }: { look: HumanLook; side: number; pose: ArmPose; lift: number }) {
  return (
    <group position={[side * ARM.shoulderX, ARM.shoulderY + lift, 0]} quaternion={pose.upper}>
      <Ball radius={0.075} color={look.top} />
      <Box at={[0, -ARM.upper / 2, 0]} size={[0.11, ARM.upper + 0.02, 0.12]} color={look.top} />
      <group position={[0, -ARM.upper, 0]} quaternion={pose.lower}>
        <Box at={[0, -ARM.lower / 2 + 0.02, 0]} size={[0.1, ARM.lower, 0.11]} color={look.top} />
        <Ball at={[0, -ARM.lower, 0]} radius={ARM.hand} color={look.skin} />
      </group>
    </group>
  );
}
