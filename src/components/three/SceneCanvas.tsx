import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneBoundary } from '@/shared/ui/SceneBoundary';

/** Three's renderer requires WebGL 2; probe before its asynchronous creation can throw. */
function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

/** Shared 3D stage: bounded canvas with pixel-art switching, suspense, and WebGL fallback. */
export function SceneCanvas({
  pixelArt,
  fallback,
  children,
}: {
  pixelArt: boolean;
  /** Replaces the café's "no 3D" notice where the scene is purely decorative. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [supported] = useState(webglSupported);
  const [lost, setLost] = useState(false);
  if (fallback !== undefined && (!supported || lost)) return <>{fallback}</>;
  if (!supported)
    return (
      <div className="webgl-fallback">
        <strong>The café is still open.</strong>
        <p>
          3D graphics are unavailable on this device. You can still program Query, run service, and follow each
          customer’s order.
        </p>
      </div>
    );
  return (
    <>
      {lost ? (
        <div className="webgl-fallback">
          The graphics context was interrupted. Your program and service results are safe. Reload to restore the café.
        </div>
      ) : (
        <SceneBoundary fallback={fallback}>
          <Suspense
            fallback={fallback !== undefined ? fallback : <div className="scene-loading">Warming up the café…</div>}
          >
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
