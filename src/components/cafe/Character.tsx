import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Box, Cylinder, Cup, RobotModel } from '../CafeModels';
import type { Point } from '@/domain';

/** Smooth heading changes, hinged walking legs, and a seated sipping pose share replay time. */
export function Character({
  at,
  color = '#c28563',
  robot = false,
  label,
  animate = false,
  walking = false,
  phase = 0,
  reduced = false,
  sit = 0,
  facing = 0,
  drinking = false,
  tea = false,
  reach = 0,
}: {
  at: Point;
  color?: string;
  robot?: boolean;
  label?: string;
  animate?: boolean;
  walking?: boolean;
  phase?: number;
  reduced?: boolean;
  sit?: number;
  facing?: number;
  drinking?: boolean;
  tea?: boolean;
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
  const hip = 0.51 + sit * 0.21;
  return (
    <group position={[at[0], bob, at[1]]}>
      <group ref={ref} rotation-y={initialFacing.current}>
        {robot ? (
          <RobotModel color={color} stride={stride} reach={reduced ? 0 : reach} />
        ) : (
          <>
            <Cylinder at={[0, 0.76 + sit * 0.26, 0]} size={[0.24, 0.31, 0.64]} color={color} />
            <group position={[0, 1.37 + sit * 0.26, 0]} rotation-x={sip * 0.12}>
              <mesh castShadow>
                <sphereGeometry args={[0.3, 10, 8]} />
                <meshStandardMaterial color="#deb28b" />
              </mesh>
              <mesh position={[0, 0.15, -0.04]} castShadow>
                <sphereGeometry args={[0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#664d38" />
              </mesh>
            </group>
            <Box at={[0, 0.74 + sit * 0.26, 0.25]} size={[0.34, 0.46, 0.05]} color="#e7d7af" />
            {[-1, 1].map((side) => (
              <group key={side}>
                <group
                  position={[side * 0.17, hip, 0]}
                  rotation-x={(-sit * Math.PI) / 2 + stride * side * 0.5 * (1 - sit)}
                >
                  <Box at={[0, -0.12, 0]} size={[0.17, 0.25, 0.19]} color="#4b5543" />
                  <group
                    position={[0, -0.25, 0]}
                    rotation-x={(sit * Math.PI) / 2 + Math.max(0, -stride * side) * 0.35 * (1 - sit)}
                  >
                    <Box at={[0, -0.12, 0]} size={[0.17, 0.25, 0.17]} color="#4b5543" />
                    <Box at={[0, -0.2, 0.09]} size={[0.23, 0.14, 0.35]} color="#394538" />
                  </group>
                </group>
                <group
                  position={[side * 0.36, 1 + sit * 0.26, 0]}
                  rotation-x={drinking && side === 1 ? -1.05 - sip * 0.7 : -sit * 0.75 - stride * side * 0.4}
                >
                  <Box at={[0, -0.2, 0]} size={[0.14, 0.44, 0.17]} color={color} />
                  <mesh position={[0, -0.43, 0]}>
                    <sphereGeometry args={[0.09, 8, 6]} />
                    <meshStandardMaterial color="#deb28b" />
                  </mesh>
                </group>
              </group>
            ))}
            {drinking && (
              <group position={[0.22, 1.26 + sip * 0.27, 0.43 - sip * 0.19]} rotation-x={-sip * 0.3} scale={0.72}>
                <Cup tea={tea} />
              </group>
            )}
          </>
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

