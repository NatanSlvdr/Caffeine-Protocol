import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { NoGraphics, SceneBoundary } from '@/shared/ui/SceneBoundary';
import { STAGE_WORDS } from '@/shared/ui/stageWords';
import { useWords } from '@/shared/language';
import { reclaimFocus } from '@/shared/lib/focus';

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
  const say = useWords(STAGE_WORDS);
  const [supported] = useState(webglSupported);
  const [lost, setLost] = useState(false);
  // Each try builds the renderer afresh. The scene draws from its props alone, so it comes back at the same moment
  // of service, and nothing outside the canvas (routines, the run) is touched.
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setLost(false);
    setAttempt((n) => n + 1);
  };
  // The button that asked goes with the notice, so focus carries on from the screen's title.
  useEffect(() => {
    if (attempt) reclaimFocus();
  }, [attempt]);
  if (fallback !== undefined && (!supported || lost)) return <>{fallback}</>;
  if (!supported) return <NoGraphics />;
  return (
    <>
      {lost ? (
        <div className="webgl-fallback">
          <strong>{say.dark}</strong>
          <p>{say.darkWhy}</p>
          <button className="webgl-retry" onClick={retry}>
            {say.redraw}
          </button>
        </div>
      ) : (
        <SceneBoundary key={attempt} fallback={fallback} onRetry={fallback === undefined ? retry : undefined}>
          <Suspense fallback={fallback !== undefined ? fallback : <div className="scene-loading">{say.warming}</div>}>
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
