import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { RobotModel } from './RobotModel';
import { HumanModel } from './HumanModel';
import { headPose } from './headPose';
import type { HumanLook, RobotLook } from './looks';
import type { Cargo, Point } from '@/domain';

/**
 * Smooth heading changes, hinged walking legs, and a seated sipping pose share replay time. A robot's head glances
 * about while it waits and shakes when its block fails, on the wall clock, since neither moves anything in the service.
 */
export function Character({
  at,
  look,
  label,
  animate = false,
  walking = false,
  phase = 0,
  reduced = false,
  sit = 0,
  facing = 0,
  drinking = false,
  tea = false,
  paper = false,
  reach = 0,
  held = [],
  waiting = false,
  failed = false,
}: {
  at: Point;
  /** A crew robot or a person, drawn after their portrait. */
  look: { robot: RobotLook } | { human: HumanLook };
  label?: string;
  animate?: boolean;
  walking?: boolean;
  phase?: number;
  reduced?: boolean;
  sit?: number;
  facing?: number;
  drinking?: boolean;
  tea?: boolean;
  /** The drink is take-away, in a paper cup with a lid. */
  paper?: boolean;
  reach?: number;
  /** Carried cargo, drawn in the hands so it turns and walks with the character. */
  held?: readonly Cargo[];
  waiting?: boolean;
  /** Its block is the one the service failed on. */
  failed?: boolean;
}) {
  const ref = useRef<Group>(null),
    head = useRef<Group>(null),
    failedAt = useRef<number | undefined>(undefined),
    initialFacing = useRef(facing);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const difference = Math.atan2(Math.sin(facing - ref.current.rotation.y), Math.cos(facing - ref.current.rotation.y));
    ref.current.rotation.y += difference * (reduced || !animate ? 1 : 1 - Math.exp(-delta * 18));
    if (!head.current) return;
    const now = clock.getElapsedTime();
    if (!failed) failedAt.current = undefined;
    else failedAt.current ??= now;
    const pose = headPose({
      waiting: waiting && animate,
      failedFor: failedAt.current === undefined ? undefined : now - failedAt.current,
      // Robots apart in the room glance out of step.
      clock: now + at[0] * 2.3 + at[1] * 1.1,
      reduced,
    });
    const ease = reduced ? 1 : 1 - Math.exp(-delta * (failed ? 30 : 8));
    head.current.rotation.y += (pose.turn - head.current.rotation.y) * ease;
    head.current.rotation.x += (pose.nod - head.current.rotation.x) * ease;
  });
  const stride = walking && !reduced ? Math.sin(phase * 10) : 0;
  const bob = walking && !reduced ? Math.abs(stride) * 0.035 : 0;
  const sip = drinking && !reduced ? (1 - Math.cos(phase * 1.6)) / 2 : 0;
  return (
    <group position={[at[0], bob, at[1]]}>
      <group ref={ref} rotation-y={initialFacing.current}>
        {'robot' in look ? (
          <RobotModel
            look={look.robot}
            stride={stride}
            reach={reduced ? 0 : reach}
            held={held}
            head={head}
            worried={failed}
          />
        ) : (
          <HumanModel
            look={look.human}
            sit={sit}
            stride={stride}
            sip={sip}
            drinking={drinking}
            tea={tea}
            paper={paper}
            held={held}
            reach={reduced ? 0 : reach}
          />
        )}
      </group>
      {label && (
        <Html position={[0, 2.1, 0]} center zIndexRange={[6, 0]}>
          <span className="actor-label">{label}</span>
        </Html>
      )}
    </group>
  );
}
