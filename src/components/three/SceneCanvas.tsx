import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneBoundary } from '@/shared/ui/SceneBoundary';

/** Shared 3D stage: bounded canvas with pixel-art switching, suspense, and WebGL fallback. */
export function SceneCanvas({ pixelArt, children }: { pixelArt: boolean; children: React.ReactNode }) {
  const [lost, setLost] = useState(false);
  return (
    <>
      {lost ? (
        <div className="webgl-fallback">
          The graphics context was interrupted. Your program and service results are safe. Reload to restore the café.
        </div>
      ) : (
        <SceneBoundary>
          <Suspense fallback={<div className="scene-loading">Warming up the café…</div>}>
            <Canvas
              key={pixelArt ? 'pixelated' : 'smooth'}
              shadows
              dpr={[1, 1.5]}
              gl={{ antialias: !pixelArt, alpha: true, localClippingEnabled: true }}
              onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => setLost(true))}
            >
              {children}
            </Canvas>
          </Suspense>
        </SceneBoundary>
      )}
    </>
  );
}
