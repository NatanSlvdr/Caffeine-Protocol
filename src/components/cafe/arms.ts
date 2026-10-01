import { Euler, Quaternion, Vector3 } from 'three';
import type { Cargo } from '@/domain';
import type { Vec3 } from './primitives';

/** Shoulder placement and segment lengths, in the model's own units. */
export interface ArmRig {
  shoulderX: number;
  shoulderY: number;
  upper: number;
  lower: number;
  hand: number;
}

/** Joint rotations for one arm, plus where its hand ends up in the model's frame. */
export interface ArmPose {
  upper: Quaternion;
  lower: Quaternion;
  hand: Vec3;
}

const DOWN = new Vector3(0, -1, 0);

/** A hanging arm swung forward (negative) or back by `angle` about the shoulder, elbow straight. */
export function swingArm(rig: ArmRig, side: number, angle: number): ArmPose {
  const upper = new Quaternion().setFromEuler(new Euler(angle, 0, 0));
  const reach = rig.upper + rig.lower;
  return {
    upper,
    lower: new Quaternion(),
    hand: [side * rig.shoulderX, rig.shoulderY - Math.cos(angle) * reach, -Math.sin(angle) * reach],
  };
}

/**
 * Two-bone reach: point the arm at `target` with the elbow bent toward `pole` (down, back and out),
 * so hands meet what they hold instead of the cups floating beside them. Out-of-reach targets get
 * a straight arm aimed at them.
 */
export function reachArm(rig: ArmRig, side: number, target: Vec3, pole: Vec3 = [side * 0.4, -1, -0.5]): ArmPose {
  const shoulder = new Vector3(side * rig.shoulderX, rig.shoulderY, 0);
  const toTarget = new Vector3(...target).sub(shoulder);
  const { upper: a, lower: b } = rig;
  const distance = Math.min(Math.max(toTarget.length(), Math.abs(a - b) + 1e-3), a + b - 1e-4);
  const aim = toTarget.normalize();
  const bend = new Vector3(...pole);
  bend.sub(aim.clone().multiplyScalar(bend.dot(aim)));
  if (bend.lengthSq() < 1e-8) bend.set(0, -1, 0);
  bend.normalize();
  const shoulderAngle = Math.acos(
    Math.min(1, Math.max(-1, (a * a + distance * distance - b * b) / (2 * a * distance))),
  );
  const upperDir = aim
    .clone()
    .multiplyScalar(Math.cos(shoulderAngle))
    .add(bend.multiplyScalar(Math.sin(shoulderAngle)));
  const elbow = shoulder.clone().add(upperDir.clone().multiplyScalar(a));
  const hand = shoulder.clone().add(aim.multiplyScalar(distance));
  const lowerDir = hand.clone().sub(elbow).normalize();
  const upper = new Quaternion().setFromUnitVectors(DOWN, upperDir);
  const lower = new Quaternion().setFromUnitVectors(DOWN, lowerDir.applyQuaternion(upper.clone().invert()));
  return { upper, lower, hand: [hand.x, hand.y, hand.z] };
}

/** Crew carry one item per hand: the first in the right-hand slot (+x), the second in the left. */
export function itemsForHand(items: readonly Cargo[], side: number): Cargo[] {
  return items.filter((_, i) => (i % 2 === 0 ? 1 : -1) === side);
}

export const ROBOT_ARM: ArmRig = { shoulderX: 0.37, shoulderY: 0.98, upper: 0.26, lower: 0.24, hand: 0.07 };
export const HUMAN_ARM: ArmRig = { shoulderX: 0.35, shoulderY: 1, upper: 0.21, lower: 0.22, hand: 0.08 };
/** Counter tops stand at 1.10, so anything carried rides just above. */
export const CARRY_HEIGHT = 1.06;
export const DRINK_SCALE = 0.72;

/**
 * A robot arm: a carrying hand sits out in front at counter height, far enough forward that a cup
 * clears the apron and the head's lower edge, and a Take or Deposit pushes it further out over the
 * station. An empty arm swings with the stride and lifts to reach.
 */
export function robotArmPose(side: number, carrying: boolean, stride: number, reach: number): ArmPose {
  return carrying
    ? reachArm(ROBOT_ARM, side, [side * ROBOT_ARM.shoulderX, CARRY_HEIGHT + reach * 0.05, 0.47 + reach * 0.1])
    : swingArm(ROBOT_ARM, side, -stride * side * 0.35 - reach * 1.15);
}

/** The sipping cup rests above the table top (or at chest height standing), then tips up to the lips. */
export function sipCup(sit: number, sip: number, tea: boolean): { at: Vec3; tilt: number; handle: Vec3 } {
  const rest = 0.9 + sit * 0.2;
  const at: Vec3 = [0.18, rest + (1.08 - rest) * sip, 0.42 + sip * 0.05];
  const handle = DRINK_SCALE * ((tea ? 0.145 : 0.19) + 0.04);
  return { at, tilt: -sip * 0.55, handle: [at[0] + handle, at[1] + 0.1, at[2]] };
}

/**
 * A person's arm, in the model's unscaled units with the seated lift left out. Carrying hands rise to
 * counter height in world terms, so smaller people (Pip) lift what they carry higher; the right hand
 * holds the sipping cup by its handle; otherwise the arm swings or rests on the lap.
 */
export function humanArmPose(
  side: number,
  {
    carrying,
    scale = 1,
    reach = 0,
    sit = 0,
    stride = 0,
    drink,
  }: { carrying: boolean; scale?: number; reach?: number; sit?: number; stride?: number; drink?: Vec3 },
): ArmPose {
  if (carrying)
    return reachArm(HUMAN_ARM, side, [
      side * (HUMAN_ARM.shoulderX + 0.05),
      CARRY_HEIGHT / scale + reach * 0.04,
      0.38 + reach * 0.1,
    ]);
  if (drink && side === 1) return reachArm(HUMAN_ARM, side, drink);
  return swingArm(HUMAN_ARM, side, -sit * 0.75 - stride * side * 0.4 * (1 - sit) - reach * 1.1);
}
