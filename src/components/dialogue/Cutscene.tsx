import { useEffect, useMemo, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { sceneLines, type Cutscene as CutsceneData } from '@/data/campaign/cutscenes';
import type { DialogueChoices } from '@/domain';
import { useUntranslated } from '@/shared/language';
import { DialogueBox } from './DialogueBox';

/**
 * `python3 tools/cutscenes.py` writes src/assets/cutscenes/<scene>/<nn>.webp; each one is picked up, bundled and precached.
 * Sync conflict copies ("01 2.webp") are left out, so they never ship.
 */
const files = import.meta.glob<string>(['../../assets/cutscenes/*/*.webp', '!**/* [0-9].webp'], {
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
  /** Label on the last line's button; Continue, in the reader's language, if none. */
  doneLabel?: string;
  reduced?: boolean;
  /** The answers given before, by choice id: what the scene recalls, and which answer it marks as said last time. */
  choices?: DialogueChoices;
  /** Called as the player picks what Niko says. */
  onChoose?: (choice: string, option: string) => void;
}

/** A story scene: stills dropped one by one like photos on a dark table as the dialogue moves on. */
export function Cutscene({ scene, onDone, doneLabel, reduced = false, choices = {}, onChoose }: CutsceneProps) {
  // The answers as the scene began: one picked partway through is kept, but doesn't rewrite the scene being watched.
  const english = useUntranslated();
  const [before] = useState(choices);
  const { lines, panels } = useMemo(() => sceneLines(scene, before), [scene, before]);
  const [line, setLine] = useState(0);
  const shown = panels[line] ?? 0;
  // Empty as it mounts, so the first still is read out too: a live region only speaks up when it changes.
  const [voiced, setVoiced] = useState(false);
  useEffect(() => setVoiced(true), []);

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
                  <Clapperboard size={28} strokeWidth={1.8} aria-hidden="true" />
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
      {/* The stills are pictures only, so their art notes describe each one aloud as it lands. */}
      <p className="sr-only" aria-live="polite" lang={english}>
        {voiced && scene.panels[shown]?.art}
      </p>
      <DialogueBox
        lines={lines}
        kicker={scene.title}
        lang={english}
        doneLabel={doneLabel}
        instant={reduced}
        onLine={setLine}
        onDone={onDone}
        choices={before}
        onChoose={onChoose}
      />
    </div>
  );
}
