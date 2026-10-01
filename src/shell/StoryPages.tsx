import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { UNLOCKS } from '@/domain';
import { CAMPAIGN_LENGTH } from '@/data';
import { Cafe, Cutscene } from '@/components';
import { Button } from '@/shared/ui/Button';
import { cutscenes, type Cutscene as CutsceneData } from '@/data/campaign/cutscenes';
import { go } from '@/shared/lib/navigation';
import { useGame, useProgress } from '@/state/GameStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ShellBar } from './ShellBar';

/** The café in the evening light, running quietly behind the page. */
function StoryScene({ level }: { level?: number }) {
  const { save } = useGame();
  const reduced = useReducedMotion(save.settings.reduced_motion);
  return (
    <div className="story-scene" aria-hidden="true">
      <Cafe
        level={level}
        evening={level === undefined || level > UNLOCKS.help}
        reduced={reduced}
        pixelArt={save.settings.pixel_art}
        showStatusBubbles={false}
        zoomScale={0.92}
        cameraAngleDegrees={7}
      />
    </div>
  );
}

/** A story scene between shifts. Finishing or skipping it opens the shift it leads to. */
export function ScenePage({ scene }: { scene: CutsceneData }) {
  const { save, finishScene } = useGame();
  const reduced = useReducedMotion(save.settings.reduced_motion);
  const done = () => {
    finishScene(scene);
    go('/campaign');
  };
  return (
    <main className="story-page scene-page">
      <Cutscene scene={scene} doneLabel="To the counter" reduced={reduced} onDone={done} />
    </main>
  );
}

const closing = cutscenes[cutscenes.length - 1];

/** Closing screen after the final shift: the crew's last scene, then the day's receipt. */
export function EndingPage() {
  const progress = useProgress();
  const { save } = useGame();
  const reduced = useReducedMotion(save.settings.reduced_motion);
  const [talking, setTalking] = useState(true);
  return (
    <main className="story-page ending-page">
      <ShellBar label="Closing time" back="Campaign" onBack={() => go('/campaign')} />
      <StoryScene />
      {talking ? (
        <Cutscene scene={closing} doneLabel="Read the receipt" reduced={reduced} onDone={() => setTalking(false)} />
      ) : (
        <article className="story-note">
          <span className="story-tape" aria-hidden="true" />
          <p className="story-kicker">Café Niko · Under new management</p>
          <h1>Closing time.</h1>
          <p className="story-narration">
            Lou’s card hangs on the wall by the register. Niko sits down with a warm coffee: the café runs itself now,
            and the name over the door is his.
          </p>
          <dl className="story-receipt">
            <div>
              <dt>Shifts served</dt>
              <dd>
                {progress.done}/{CAMPAIGN_LENGTH}
              </dd>
            </div>
            <div>
              <dt>Stars earned</dt>
              <dd>
                {progress.stars}/{progress.max} ★
              </dd>
            </div>
          </dl>
          <div className="story-actions">
            <Button variant="primary" className="story-start" onClick={() => go('/')}>
              Back to the café <ArrowRight size={18} />
            </Button>
            <button className="story-link" onClick={() => go('/campaign')}>
              Keep tinkering
            </button>
          </div>
          <footer className="story-foot story-thanks">
            <span className="story-barcode" aria-hidden="true" />
            <span>Thank you for spending a little time at our café</span>
          </footer>
        </article>
      )}
    </main>
  );
}
