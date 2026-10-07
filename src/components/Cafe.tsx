import { LOUS_DECOR, UNLOCKS } from '@/domain';
import type { BlockPreview, Decor, RobotRole, RunResult } from '@/domain';
import { PixelArtEffect } from './cafe/PixelArtEffect';
import { SceneCanvas } from './three/SceneCanvas';
import { Snapshot, type TakeSnapshot } from './three/Snapshot';
import { World } from './cafe/World';
import { SCENE_WORDS } from './sceneWords';
import { useWords } from '@/shared/language';

export function Cafe({
  evening = false,
  result,
  time = 0,
  reduced = false,
  pixelArt = true,
  moving = false,
  level = UNLOCKS.floor,
  showLabels = false,
  serviceView = false,
  focusRole,
  showStatusBubbles = true,
  zoomScale = 1,
  cameraTarget,
  cameraAngleDegrees = 0,
  follow,
  preview,
  restored = level,
  decor = LOUS_DECOR,
  counterLines,
  snapshot,
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
  /** The guest whose order is followed, by round and id; it is ringed wherever it is. */
  follow?: { seed: string; guest: string };
  /** The block picked in the routine, drawn where it goes. */
  preview?: BlockPreview;
  /**
   * The shift whose café is dressed, with what the story has put back by then: the sidewalk board, the photos, the
   * aprons on their hooks, the lights and the herbs. The shift played by default; the shell's views show the furthest.
   */
  restored?: number;
  /** The looks the café has picked: Lou's unless given. */
  decor?: Decor;
  /** What the counter says back to the regulars it recognises, by round and guest: `"L06_B/C1"`. */
  counterLines?: ReadonlyMap<string, string>;
  /** Filled in with a way to photograph the café as drawn, while it is on screen. */
  snapshot?: React.RefObject<TakeSnapshot | null>;
}) {
  return (
    <div className="cafe-canvas" role="group" aria-label={useWords(SCENE_WORDS).scene}>
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
          follow={follow}
          preview={preview}
          restored={restored}
          decor={decor}
          counterLines={counterLines}
        />
        {pixelArt && <PixelArtEffect />}
        {snapshot && <Snapshot take={snapshot} />}
      </SceneCanvas>
    </div>
  );
}
