import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { RobotRole, RunResult } from '@/domain';
import { PixelArtEffect } from './cafe/PixelArtEffect';
import { SceneBoundary } from '@/shared/ui/SceneBoundary';
import { World } from './cafe/World';

export function Cafe({
  evening = false,
  result,
  time = 0,
  reduced = false,
  pixelArt = true,
  moving = false,
  level = 32,
  showLabels = false,
  serviceView = false,
  focusRole,
}: {
  evening?: boolean;
  result?: RunResult;
  time?: number;
  reduced?: boolean;
  pixelArt?: boolean;
  moving?: boolean;
  level?: number;
  showLabels?: boolean;
  serviceView?: boolean;
  focusRole?: RobotRole;
}) {
  const [lost, setLost] = useState(false);
  return (
    <div className="cafe-canvas" aria-label="Nearly overhead café: grid-aligned kitchen, order counter and dining room">
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
              <World
                evening={evening}
                result={result}
                time={time}
                reduced={reduced}
                moving={moving}
                level={level}
                showLabels={showLabels}
                serviceView={serviceView}
                focusRole={focusRole}
              />
              {pixelArt && <PixelArtEffect />}
            </Canvas>
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}

