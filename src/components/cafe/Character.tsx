import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { RobotModel } from './RobotModel';
import { HumanModel } from './HumanModel';
import type { HumanLook, RobotLook } from './looks';
import type { Point } from '@/domain';

/** Smooth heading changes, hinged walking legs, and a seated sipping pose share replay time. */
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
}) {
  const ref = useRef<Group>(null),
    initialFacing = useRef(facing);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const difference = Math.atan2(Math.sin(facing - ref.current.rotation.y), Math.cos(facing - ref.current.rotation.y));
    ref.current.rotation.y += difference * (reduced || !animate ? 1 : 1 - Math.exp(-delta * 18));
  });
  const stride = walking && !reduced ? Math.sin(phase * 10) : 0;
  const bob = walking && !reduced ? Math.abs(stride) * 0.035 : 0;
  const sip = drinking && !reduced ? (1 - Math.cos(phase * 1.6)) / 2 : 0;
  return (
    <group position={[at[0], bob, at[1]]}>
      <group ref={ref} rotation-y={initialFacing.current}>
        {'robot' in look ? (
          <RobotModel look={look.robot} stride={stride} reach={reduced ? 0 : reach} />
        ) : (
          <HumanModel
            look={look.human}
            sit={sit}
            stride={stride}
            sip={sip}
            drinking={drinking}
            tea={tea}
            paper={paper}
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
