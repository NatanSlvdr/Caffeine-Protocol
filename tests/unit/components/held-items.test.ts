import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  DRINK_SCALE,
  HUMAN_ARM,
  ROBOT_ARM,
  humanArmPose,
  reachArm,
  robotArmPose,
  sipCup,
  type ArmPose,
  type ArmRig,
} from '@/components/cafe/arms';
import { HELD_SCALE } from '@/components/cafe/HeldItem';

const COUNTER_TOP = 1.1;
const TABLE_TOP = 1.32;
/** Coffee saucer radius, the widest thing a hand carries. */
const SAUCER = 0.28 * HELD_SCALE;
const steps = [0, 0.25, 0.5, 0.75, 1];

/** Where the arm's segments actually end, from its joint rotations. */
function joints(rig: ArmRig, side: number, pose: ArmPose) {
  const shoulder = new Vector3(side * rig.shoulderX, rig.shoulderY, 0);
  const elbow = shoulder.clone().add(new Vector3(0, -rig.upper, 0).applyQuaternion(pose.upper));
  const lowerWorld = pose.upper.clone().multiply(pose.lower);
  const hand = elbow.clone().add(new Vector3(0, -rig.lower, 0).applyQuaternion(lowerWorld));
  return { shoulder, elbow, hand };
}

describe('arms reach what they hold', () => {
  it('puts the drawn hand exactly where the pose says, elbow bent down', () => {
    for (const side of [-1, 1]) {
      const pose = reachArm(HUMAN_ARM, side, [side * 0.4, 1.06, 0.36]);
      const { elbow, hand } = joints(HUMAN_ARM, side, pose);
      expect(hand.distanceTo(new Vector3(...pose.hand))).toBeLessThan(1e-6);
      expect(hand.distanceTo(new Vector3(side * 0.4, 1.06, 0.36))).toBeLessThan(1e-6);
      expect(elbow.y).toBeLessThan(hand.y);
    }
  });

  it('robots carry cups level above the counter, clear of apron and head, even mid-reach', () => {
    for (const side of [-1, 1])
      for (const reach of steps) {
        const pose = robotArmPose(side, true, 0, reach);
        const { hand } = joints(ROBOT_ARM, side, pose);
        expect(hand.distanceTo(new Vector3(...pose.hand))).toBeLessThan(1e-6);
        const base = hand.y + ROBOT_ARM.hand;
        expect(base).toBeGreaterThan(COUNTER_TOP);
        // Apron front at z 0.24; head's rounded lower corner reaches z 0.26 at the cup's x.
        expect(hand.z - SAUCER).toBeGreaterThan(0.26);
        // The two hands' cups never touch each other.
        expect(Math.abs(hand.x) - SAUCER).toBeGreaterThan(0);
      }
  });

  it('people carry cups above the counter and clear of their body, Pip included', () => {
    for (const scale of [1, 0.84])
      for (const side of [-1, 1])
        for (const reach of steps) {
          const pose = humanArmPose(side, { carrying: true, scale, reach });
          const [x, y, z] = pose.hand;
          expect((y + HUMAN_ARM.hand) * scale).toBeGreaterThan(COUNTER_TOP - 0.01);
          // The torso (0.25 at the shoulders) and the head (0.21 across) stay outside the saucer.
          expect(Math.hypot(x, z) - SAUCER).toBeGreaterThan(0.27);
        }
  });

  it('a sipping cup stays above the table and outside the face, with the hand on its handle', () => {
    for (const sit of [0, 1])
      for (const sip of steps)
        for (const tea of [false, true]) {
          const { at, tilt, handle } = sipCup(sit, sip, tea);
          const lift = sit * 0.26;
          if (sit === 1) expect(at[1] + lift).toBeGreaterThan(TABLE_TOP);
          const radius = (tea ? 0.145 : 0.19) * DRINK_SCALE;
          const height = (tea ? 0.36 : 0.22) * DRINK_SCALE + 0.05 * DRINK_SCALE;
          // Nearest point of the tipped rim to the head centre (0, 1.37, 0).
          const rim = new Vector3(at[0], at[1] + Math.cos(tilt) * height, at[2] + Math.sin(tilt) * height);
          const nearest = rim.z - radius * Math.cos(tilt);
          expect(Math.hypot(rim.x, rim.y - 1.37, nearest)).toBeGreaterThan(0.26);
          const pose = humanArmPose(1, { carrying: false, sit, drink: handle });
          expect(new Vector3(...pose.hand).distanceTo(new Vector3(...handle))).toBeLessThan(0.1);
        }
  });
});
