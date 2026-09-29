import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CAMPAIGN_LENGTH } from '@/data';
import { Cafe, DialogueBox } from '@/components';
import { Button } from '@/shared/ui/Button';
import { endingScene } from '@/data/campaign/dialogue';
import { go } from '@/shared/lib/navigation';
import { useGame, useProgress } from '@/state/GameStore';
import { ShellBar } from './ShellBar';

/** The café in the evening light, running quietly behind the page. */
function StoryScene({ level }: { level?: number }) {
  const { save } = useGame();
  return (
    <div className="story-scene" aria-hidden="true">
      <Cafe
        level={level}
        evening={level === undefined || level > 11}
        reduced={save.settings.reduced_motion}
        pixelArt={save.settings.pixel_art}
        showStatusBubbles={false}
        zoomScale={0.92}
        cameraAngleDegrees={7}
      />
    </div>
  );
}

/** Closing screen after the final shift: the crew's last scene, then the day's receipt. */
export function EndingPage() {
  const progress = useProgress();
  const { save } = useGame();
  const [talking, setTalking] = useState(true);
  return (
    <main className="story-page ending-page">
      <ShellBar label="Closing time" back="Campaign" onBack={() => go('/campaign')} />
      <StoryScene />
      {talking ? (
        <DialogueBox
          lines={endingScene}
          kicker="Closing time"
          doneLabel="Read the receipt"
          instant={save.settings.reduced_motion}
          onDone={() => setTalking(false)}
        />
      ) : (
        <article className="story-note">
          <span className="story-tape" aria-hidden="true" />
          <p className="story-kicker">Employee of the month</p>
          <h1>Closing time.</h1>
          <p className="story-narration">Niko sits down with a warm coffee. The café can finally run itself.</p>
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
