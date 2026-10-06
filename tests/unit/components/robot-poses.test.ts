import { describe, expect, it } from 'vitest';
import { humanArmPose, robotArmPose } from '@/components/cafe/arms';
import { SHAKE_SECONDS, headPose } from '@/components/cafe/headPose';

const still = { waiting: false, clock: 0, reduced: false };

describe('arms reaching for what they carry', () => {
  it('meets a cup taken at full reach where a carrying hand holds it, on either side', () => {
    for (const side of [-1, 1]) {
      const empty = robotArmPose(side, false, 0, 1).hand;
      const carrying = robotArmPose(side, true, 0, 1).hand;
      empty.forEach((value, i) => expect(value).toBeCloseTo(carrying[i], 3));
      const person = humanArmPose(side, { carrying: false, reach: 1 }).hand;
      humanArmPose(side, { carrying: true, reach: 1 }).hand.forEach((value, i) =>
        expect(person[i]).toBeCloseTo(value, 3),
      );
    }
  });

  it('lifts an empty hand steadily to counter height, without a jump as the reach begins', () => {
    const rest = robotArmPose(1, false, 0, 0).hand;
    const begun = robotArmPose(1, false, 0, 0.01).hand;
    expect(Math.hypot(...begun.map((value, i) => value - rest[i]))).toBeLessThan(0.01);
    let height = rest[1];
    for (let reach = 0.1; reach <= 1; reach += 0.1) {
      const [, y] = robotArmPose(1, false, 0, reach).hand;
      expect(y).toBeGreaterThan(height);
      height = y;
    }
  });

  it('swings an empty hand a little behind as it draws back', () => {
    // The robot faces +z, so behind is below zero.
    expect(robotArmPose(1, false, 0, -0.12).hand[2]).toBeLessThan(0);
    expect(robotArmPose(1, false, 0, -0.12).hand[2]).toBeGreaterThan(-0.1);
  });
});

describe('a robot’s head', () => {
  it('looks straight ahead at work', () => {
    expect(headPose({ ...still, clock: 3 })).toEqual({ turn: 0, nod: 0 });
  });

  it('glances about while it waits, no further than a look aside, and keeps still with reduced motion', () => {
    const turns = Array.from({ length: 200 }, (_, i) => headPose({ ...still, waiting: true, clock: i * 0.25 }).turn);
    expect(Math.max(...turns)).toBeGreaterThan(0.1);
    expect(Math.max(...turns.map(Math.abs))).toBeLessThanOrEqual(0.3);
    expect(headPose({ ...still, waiting: true, clock: 2, reduced: true })).toEqual({ turn: 0, nod: 0 });
  });

  it('shakes once its block fails, dying away, then hangs; with reduced motion it only hangs', () => {
    expect(headPose({ ...still, failedFor: 0 })).toEqual({ turn: 0, nod: 0 });
    expect(Math.abs(headPose({ ...still, failedFor: 0.1 }).turn)).toBeGreaterThan(0.2);
    const late = headPose({ ...still, failedFor: SHAKE_SECONDS * 0.9 }).turn;
    expect(Math.abs(late)).toBeLessThan(0.05);
    const hung = headPose({ ...still, failedFor: SHAKE_SECONDS + 1 });
    expect(hung.turn).toBe(0);
    expect(hung.nod).toBeGreaterThan(0.2);
    expect(headPose({ ...still, failedFor: 0, reduced: true })).toEqual(hung);
    // A failed robot doesn't glance about, whatever it was waiting on.
    expect(headPose({ ...still, waiting: true, failedFor: SHAKE_SECONDS + 1, clock: 7 })).toEqual(hung);
  });
});
