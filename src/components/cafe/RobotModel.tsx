import type { Ref } from 'react';
import type { Group } from 'three';
import { RoundedBox } from '@react-three/drei';
import type { Cargo } from '@/domain';
import { Box, Cylinder } from './primitives';
import { QUERY, type RobotLook } from './looks';
import { ROBOT_ARM as ARM, itemsForHand, robotArmPose } from './arms';
import { HeldItem } from './HeldItem';

const CREAM = '#f1e2bd';
const JOINT = '#3d403c';
const VISOR = '#1f3a33';
const EYE = '#9ff0c0';
/** The eyes once the robot's block has failed: amber, and dimmer. */
const EYE_WORRIED = '#f2b45a';
/** The top of the neck, where the head turns and nods. */
const NECK = 1.17;
const STRAP = '#6b4128';

function Ball({ at, radius, color }: { at: [number, number, number]; radius: number; color: string }) {
  return (
    <mesh position={at} castShadow>
      <sphereGeometry args={[radius, 10, 8]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

/**
 * The crew robots as drawn in their portraits: a wide cream head with a dark visor, two square
 * green eyes, round ear speakers and an orange-tipped antenna, on a jointed body in the robot's colour.
 * Query carries a clipboard, Brew a coffee-bean apron and towel, Porter an apron and bow tie. The head turns on the
 * neck, through `head`, and the eyes go amber once the robot's block has failed.
 */
export function RobotModel({
  look = QUERY,
  stride = 0,
  reach = 0,
  held = [],
  head,
  worried = false,
}: {
  look?: RobotLook;
  stride?: number;
  reach?: number;
  /** What the robot carries: one item per hand, held level on the palm. */
  held?: readonly Cargo[];
  /** The head's pivot on the neck, for whoever turns it. */
  head?: Ref<Group>;
  worried?: boolean;
}) {
  const { body } = look;
  const eye = worried ? EYE_WORRIED : EYE;
  return (
    <>
      {/* Head, visor, eyes, ear speakers and antenna, on the neck */}
      <group ref={head} position={[0, NECK, 0]}>
        <RoundedBox args={[0.86, 0.54, 0.6]} radius={0.17} smoothness={3} position={[0, 1.42 - NECK, 0]} castShadow>
          <meshStandardMaterial color={CREAM} roughness={0.55} />
        </RoundedBox>
        <RoundedBox args={[0.62, 0.3, 0.06]} radius={0.05} smoothness={2} position={[0, 1.43 - NECK, 0.29]}>
          <meshStandardMaterial color={VISOR} roughness={0.3} />
        </RoundedBox>
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, 1.44 - NECK, 0.325]}>
            <boxGeometry args={[0.08, 0.09, 0.02]} />
            <meshStandardMaterial color={eye} emissive={eye} emissiveIntensity={worried ? 0.45 : 0.6} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.44, 1.42 - NECK, 0]} rotation-z={Math.PI / 2}>
            <mesh castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.07, 14]} />
              <meshStandardMaterial color={body} roughness={0.6} />
            </mesh>
            <mesh position={[0, -side * 0.03, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.03, 12]} />
              <meshStandardMaterial color={JOINT} roughness={0.9} />
            </mesh>
          </group>
        ))}
        <Cylinder at={[0, 1.78 - NECK, 0]} size={[0.025, 0.035, 0.2]} color={body} />
        <Ball at={[0, 1.9 - NECK, 0]} radius={0.075} color="#e7a349" />
      </group>
      {/* Neck and torso */}
      <Cylinder at={[0, 1.1, 0]} size={[0.09, 0.1, 0.14]} color={JOINT} />
      <RoundedBox args={[0.56, 0.5, 0.4]} radius={0.1} smoothness={3} position={[0, 0.8, 0]} castShadow>
        <meshStandardMaterial color={body} roughness={0.6} />
      </RoundedBox>
      <Box at={[0, 0.5, 0]} size={[0.4, 0.12, 0.3]} color={JOINT} />
      {look.apron && (
        <>
          <Box at={[0, 0.76, 0.21]} size={[0.44, 0.54, 0.03]} color={look.apron} />
          {look.bean && (
            <mesh position={[0, 0.82, 0.23]} scale={[0.7, 1, 0.35]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshStandardMaterial color="#6e4128" />
            </mesh>
          )}
        </>
      )}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box at={[side * 0.15, 0.93, 0.215]} size={[0.06, 0.28, 0.03]} color={STRAP} />
          <Box at={[side * 0.15, 1.055, 0]} size={[0.06, 0.03, 0.42]} color={STRAP} />
        </group>
      ))}
      {look.clipboard ? (
        <>
          <Box at={[-0.14, 0.92, 0.22]} size={[0.13, 0.04, 0.02]} color="#d8b04f" />
          <Box at={[0.11, 0.78, 0.225]} size={[0.15, 0.19, 0.03]} color="#7a5033" />
          <Box at={[0.11, 0.77, 0.242]} size={[0.12, 0.14, 0.01]} color="#f3ead3" />
        </>
      ) : (
        <Box at={[-0.1, 0.9, 0.235]} size={[0.12, 0.035, 0.02]} color="#d8b04f" />
      )}
      {look.bowTie &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.05, 1.04, 0.2]} rotation-z={(side * Math.PI) / 2}>
            <coneGeometry args={[0.045, 0.09, 4]} />
            <meshStandardMaterial color="#6b3a22" />
          </mesh>
        ))}
      {look.towel && (
        <>
          <Box at={[-0.24, 1.06, 0]} size={[0.13, 0.03, 0.44]} color="#f5f1e8" />
          <Box at={[-0.24, 0.93, 0.21]} size={[0.13, 0.26, 0.03]} color="#f5f1e8" />
          <Box at={[-0.24, 0.87, 0.225]} size={[0.13, 0.03, 0.005]} color="#b8624a" />
        </>
      )}
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Leg: thigh, knee joint, shin and a dark foot */}
          <group position={[side * 0.13, 0.46, 0]} rotation-x={stride * side * 0.45}>
            <Box at={[0, -0.09, 0]} size={[0.15, 0.18, 0.16]} color={body} />
            <Ball at={[0, -0.21, 0]} radius={0.07} color={JOINT} />
            <Box at={[0, -0.31, 0]} size={[0.16, 0.14, 0.17]} color={body} />
            <RoundedBox args={[0.2, 0.1, 0.3]} radius={0.04} smoothness={2} position={[0, -0.41, 0.04]} castShadow>
              <meshStandardMaterial color={JOINT} roughness={0.8} />
            </RoundedBox>
          </group>
          <Arm side={side} body={body} items={itemsForHand(held, side)} stride={stride} reach={reach} />
        </group>
      ))}
    </>
  );
}

/** Shoulder, upper arm, elbow, forearm and hand; a full hand holds its item out level in front. */
function Arm({
  side,
  body,
  items,
  stride,
  reach,
}: {
  side: number;
  body: string;
  items: readonly Cargo[];
  stride: number;
  reach: number;
}) {
  const pose = robotArmPose(side, items.length > 0, stride, reach);
  const [x, y, z] = pose.hand;
  return (
    <>
      <group position={[side * ARM.shoulderX, ARM.shoulderY, 0]} quaternion={pose.upper}>
        <Ball at={[0, 0, 0]} radius={0.1} color={body} />
        <Box at={[0, -0.14, 0]} size={[0.12, 0.2, 0.13]} color={body} />
        <Ball at={[0, -ARM.upper, 0]} radius={0.06} color={JOINT} />
        <group position={[0, -ARM.upper, 0]} quaternion={pose.lower}>
          <Box at={[0, -0.11, 0]} size={[0.13, 0.19, 0.14]} color={body} />
          <Ball at={[0, -ARM.lower, 0]} radius={ARM.hand} color={JOINT} />
        </group>
      </group>
      {items.map((cargo, i) => (
        <HeldItem key={cargo.ticketId} cargo={cargo} at={[x, y + ARM.hand, z + i * 0.3]} />
      ))}
    </>
  );
}
