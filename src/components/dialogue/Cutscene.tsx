import { useEffect, useMemo, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { sceneLines, type Cutscene as CutsceneData } from '@/data/campaign/cutscenes';
import { DialogueBox } from './DialogueBox';

/** `python3 tools/cutscenes.py` writes src/assets/cutscenes/<scene>/<nn>.webp; each one is picked up, bundled and precached. */
const files = import.meta.glob<string>('../../assets/cutscenes/*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
const stills: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/cutscenes/')[1].replace(/\.webp$/, ''), url]),
);

/** Panel art is numbered from 01 in its scene's folder. */
export function stillUrl(scene: string, panel: number): string | undefined {
  return stills[`${scene}/${String(panel + 1).padStart(2, '0')}`];
}

export interface CutsceneProps {
  scene: CutsceneData;
  onDone: () => void;
  doneLabel?: string;
  reduced?: boolean;
}

/** A story scene: stills dropped one by one like photos on a dark table as the dialogue moves on. */
export function Cutscene({ scene, onDone, doneLabel = 'Continue', reduced = false }: CutsceneProps) {
  const { lines, panels } = useMemo(() => sceneLines(scene), [scene]);
  const [line, setLine] = useState(0);
  const shown = panels[line] ?? 0;

  // Fetch every still up front so the next one never fades in half-loaded.
  useEffect(() => {
    scene.panels.forEach((_, index) => {
      const url = stillUrl(scene.id, index);
      if (url) new Image().src = url;
    });
  }, [scene]);

  return (
    <div className={`cutscene${reduced ? ' still' : ''}`}>
      <div className="cutscene-art" aria-hidden="true">
        {scene.panels.map((panel, index) => {
          const url = stillUrl(scene.id, index);
          return (
            <figure
              key={index}
              className={`cutscene-still${index === shown ? ' shown' : index < shown ? ' under' : ''}`}
            >
              {url ? (
                <img src={url} alt="" draggable={false} />
              ) : (
                <figcaption className="cutscene-placeholder">
                  <Clapperboard size={28} strokeWidth={1.8} />
                  <span>
                    {scene.id}/{String(index + 1).padStart(2, '0')}
                  </span>
                  {panel.art}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
      <DialogueBox
        lines={lines}
        kicker={scene.title}
        doneLabel={doneLabel}
        instant={reduced}
        onLine={setLine}
        onDone={onDone}
      />
    </div>
  );
}
