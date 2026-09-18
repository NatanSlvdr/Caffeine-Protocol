import { useMemo } from 'react';
import { ROOM, gridLinePositions } from '@/domain';
import { Box } from './cafe/primitives';
import { woodTexture } from './cafe/woodTexture';
import { useCanvasTexture } from '@/hooks/useCanvasTexture';

/** Every simulation tile gets an outline in editing mode; service shows only wood. */
export function CafeFloor({ showGrid }: { showGrid: boolean }) {
  const texture = useCanvasTexture(woodTexture, []);
  const grid = useMemo(gridLinePositions, []);
  return (
    <group>
      <Box at={[-0.5, -0.035, -0.5]} size={[ROOM[0], 0.12, ROOM[1]]} color="#a7805a" />
      <mesh position={[-0.5, 0.026, -0.5]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM[0], ROOM[1]]} />
        <meshStandardMaterial map={texture} roughness={0.86} />
      </mesh>
      {showGrid && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[grid, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#fff0d2" transparent opacity={0.75} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
}
