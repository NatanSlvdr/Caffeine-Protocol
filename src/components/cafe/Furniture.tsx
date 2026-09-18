import { useRef } from 'react';
import type { Group } from 'three';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from '../CafeModels';
import type { Vec3 } from '../CafeModels';
import { STAFF_ENTRY, type Point } from '@/domain';
import { useDampedRotation } from '@/hooks/useDampedRotation';
import { useTextSprite } from '@/hooks/useTextSprite';

function Plant({ at, scale = 1 }: { at: Vec3; scale?: number }) {
  return (
    <group position={at} scale={scale}>
      <Cylinder at={[0, 0.32, 0]} size={[0.35, 0.25, 0.62]} color="#c26b50" />
      <Cylinder at={[0, 0.65, 0]} size={[0.29, 0.29, 0.04]} color="#514439" />
      <Cylinder at={[0, 1.08, 0]} size={[0.035, 0.045, 0.9]} color="#5f6c43" />
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 2.4) * 0.26, 0.9 + i * 0.11, Math.cos(i * 2.4) * 0.24]}
          rotation={[i * 0.2, i * 2.4, 0.6]}
          scale={[0.22, 0.55, 0.11]}
          castShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 2 ? '#6a895b' : '#93a86d'} />
        </mesh>
      ))}
    </group>
  );
}

/** Clay upholstery and walnut legs add a restrained accent to the seating. */
function Chair({ at, rotation = 0 }: { at: Vec3; rotation?: number }) {
  return (
    <group position={at} rotation-y={rotation}>
      <SoftBox at={[0, 0.6, 0]} size={[0.66, 0.16, 0.64]} radius={0.075} color={CAFE_COLORS.clay} />
      <SoftBox at={[0, 1.02, -0.25]} size={[0.66, 0.6, 0.15]} radius={0.074} color={CAFE_COLORS.clay} />
      {[-0.23, 0.23].flatMap((x) =>
        [-0.22, 0.22].map((z) => (
          <Cylinder key={`${x}-${z}`} at={[x, 0.29, z]} size={[0.045, 0.045, 0.55]} color={CAFE_COLORS.walnut} />
        )),
      )}
    </group>
  );
}

function Table({ point, depth = 1 }: { point: Point; depth?: number }) {
  return (
    <group position={[point[0], 0, point[1]]}>
      <Cylinder at={[0, 0.12, 0]} size={[0.33, 0.36, 0.16]} color={CAFE_COLORS.walnut} />
      <Cylinder at={[0, 0.66, 0]} size={[0.12, 0.15, 1.08]} color={CAFE_COLORS.walnut} />
      <SoftBox at={[0, 1.23, 0]} size={[1, 0.18, depth]} radius={0.089} color={CAFE_COLORS.sand} />
    </group>
  );
}

/** A small tonal cup graphic marks the café without adding visual clutter. */
function CafeMural() {
  return (
    <group position={[-0.5, 1.38, -6.475]} scale={0.65}>
      <mesh>
        <circleGeometry args={[1.18, 48]} />
        <meshBasicMaterial color={CAFE_COLORS.sand} />
      </mesh>
      <mesh position={[0.55, -0.13, 0.018]}>
        <ringGeometry args={[0.22, 0.34, 32]} />
        <meshBasicMaterial color={CAFE_COLORS.walnut} />
      </mesh>
      <SoftBox at={[-0.05, -0.14, 0.06]} size={[1.08, 0.8, 0.07]} radius={0.03} color={CAFE_COLORS.walnut} />
      <SoftBox at={[0, -0.64, 0.06]} size={[1.5, 0.1, 0.075]} radius={0.04} color={CAFE_COLORS.clay} />
      {[-0.3, 0.1].map((x) => (
        <group key={x} position={[x, 0.53, 0.035]} rotation-z={-0.2}>
          <SoftBox size={[0.1, 0.35, 0.055]} radius={0.025} color={CAFE_COLORS.clay} />
        </group>
      ))}
    </group>
  );
}

/** Canvas-backed lettering sits flush with a walkable tile like a painted floor marking. */
function FloorLabel({ at, label }: { at: Point; label: string }) {
  const texture = useTextSprite(label);
  return (
    <mesh position={[at[0], 0.075, at[1]]} rotation-x={-Math.PI / 2} renderOrder={2}>
      <planeGeometry args={[0.92, 0.27]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

/** Hinged counter leaf swings toward the room when Niko approaches the staff opening. */
function CounterGate({ open }: { open: boolean }) {
  const ref = useRef<Group>(null);
  useDampedRotation(ref, open ? Math.PI / 2 : 0);
  return (
    <group position={[STAFF_ENTRY[0] - 0.47, 0, STAFF_ENTRY[1]]} ref={ref}>
      <SoftBox at={[0.47, 1.03, 0]} size={[0.94, 0.12, 0.82]} radius={0.055} color={CAFE_COLORS.sand} />
      <SoftBox at={[0.47, 0.58, 0]} size={[0.86, 0.74, 0.08]} radius={0.035} color={CAFE_COLORS.walnut} />
      <Box at={[0.78, 0.62, -0.055]} size={[0.11, 0.045, 0.035]} color="#465051" />
    </group>
  );
}

export { Plant, Chair, Table, CafeMural, FloorLabel, CounterGate };
