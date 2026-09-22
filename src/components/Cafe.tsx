import type { RobotRole, RunResult } from '@/domain';
import { PixelArtEffect } from './cafe/PixelArtEffect';
import { SceneCanvas } from './three/SceneCanvas';
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
  showStatusBubbles = true,
  zoomScale = 1,
  cameraTarget,
  cameraAngleDegrees = 0,
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
  showStatusBubbles?: boolean;
  zoomScale?: number;
  cameraTarget?: readonly [number, number, number];
  cameraAngleDegrees?: number;
}) {
  return (
    <div className="cafe-canvas" aria-label="Nearly overhead café: grid-aligned kitchen, order counter and dining room">
      <SceneCanvas pixelArt={pixelArt}>
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
          showStatusBubbles={showStatusBubbles}
          zoomScale={zoomScale}
          cameraTarget={cameraTarget}
          cameraAngleDegrees={cameraAngleDegrees}
        />
        {pixelArt && <PixelArtEffect />}
      </SceneCanvas>
    </div>
  );
}
