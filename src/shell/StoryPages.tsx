import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CAMPAIGN_LENGTH, isRated } from '@/data';
import { decorOf } from '@/domain';
import { Cafe, Cutscene } from '@/components';
import { Button } from '@/shared/ui/Button';
import { Tally } from '@/shared/ui/Tally';
import { cutscenes, type Cutscene as CutsceneData } from '@/data/campaign/cutscenes';
import { go } from '@/shared/lib/navigation';
import { useGame, useProgress } from '@/state/GameStore';
import { useMusicMood } from '@/hooks/useMusicMood';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWords } from '@/shared/language';
import { ShellBar } from './ShellBar';
import { acts } from './rail/acts';
import { restoredShift } from './homePreview';
import { STORY_WORDS } from './storyWords';

/** The café in the evening light, as far as it's restored, running quietly behind the page. */
function StoryScene() {
  const { save } = useGame();
  const reduced = useReducedMotion(save.settings.reduced_motion);
  return (
    <div className="story-scene" aria-hidden="true">
      <Cafe
        evening
        restored={restoredShift(save)}
        decor={decorOf(save)}
        reduced={reduced}
        pixelArt={save.settings.pixel_art}
        showStatusBubbles={false}
        zoomScale={0.92}
        cameraAngleDegrees={7}
      />
    </div>
  );
}

/** A story scene between shifts. Finishing or skipping it goes back to the rail, on the shift it leads to. */
export function ScenePage({ scene }: { scene: CutsceneData }) {
  const { save, finishScene, choose } = useGame();
  const say = useWords(STORY_WORDS);
  const reduced = useReducedMotion(save.settings.reduced_motion);
  const done = () => {
    finishScene(scene);
    go('/campaign');
  };
  return (
    <main className="story-page scene-page">
      <Cutscene
        scene={scene}
        doneLabel={say.toCounter}
        reduced={reduced}
        choices={save.choices}
        onChoose={choose}
        onDone={done}
      />
    </main>
  );
}

const closing = cutscenes[cutscenes.length - 1];
/** The shifts the player writes code for: the ones that can earn three stars. */
const rated = Array.from({ length: CAMPAIGN_LENGTH }, (_, index) => index).filter(isRated);
/** The rated shifts of each act after the prologue, which was served by hand: one line each on the closing receipt. */
const actShifts = acts.slice(1).map((act) => rated.filter((index) => index >= act.from && index < act.to));

/** Closing screen after the final shift: the crew's last scene, then the day's receipt. */
export function EndingPage() {
  const progress = useProgress();
  const { save, select, choose } = useGame();
  const say = useWords(STORY_WORDS);
  const reduced = useReducedMotion(save.settings.reduced_motion);
  // Closing time: the café heard from the next room.
  useMusicMood('after-hours');
  const [talking, setTalking] = useState(true);
  // The receipt replaces the scene that held focus, so focus lands on its heading, once, as it appears.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!talking) heading.current?.focus();
  }, [talking]);
  const perfect = rated.filter((index) => save.stars[index] === 3).length;
  // Going back for stars starts at the first shift still short of three.
  const missing = rated.find((index) => (save.stars[index] ?? 0) < 3);
  const starsIn = (shifts: number[]) => shifts.reduce((sum, index) => sum + (save.stars[index] ?? 0), 0);
  return (
    <main className="story-page ending-page">
      <ShellBar label={say.bar} back={say.back} onBack={() => go('/campaign')} />
      <StoryScene />
      {talking ? (
        <Cutscene
          scene={closing}
          doneLabel={say.readReceipt}
          reduced={reduced}
          choices={save.choices}
          onChoose={choose}
          onDone={() => setTalking(false)}
        />
      ) : (
        <article className="story-note">
          <span className="story-tape" aria-hidden="true" />
          <p className="story-kicker">{say.kicker}</p>
          <h1 tabIndex={-1} ref={heading}>
            {say.heading}
          </h1>
          <p className="story-narration">{say.narration(missing === undefined)}</p>
          <dl className="story-receipt">
            {/* The café's day, act by act: what each robot came to do, and the stars it was done for. */}
            {say.milestones.map(({ act, line }, i) => (
              <div key={act} className="story-milestone">
                <dt>
                  {act} · {line}
                  <span className="sr-only">{say.stars}</span>
                </dt>
                <dd>
                  <Tally n={starsIn(actShifts[i])} of={actShifts[i].length * 3} unit="★" />
                </dd>
              </div>
            ))}
            <div className="story-total">
              <dt>{say.served}</dt>
              <dd>
                <Tally n={progress.done} of={CAMPAIGN_LENGTH} />
              </dd>
            </div>
            <div>
              <dt>{say.earned}</dt>
              <dd>
                <Tally n={progress.stars} of={progress.max} unit="★" />
              </dd>
            </div>
            {/* A count of none would only say what's missing: a one-star café is still a served one. */}
            {perfect > 0 && (
              <div>
                <dt>{say.perfect}</dt>
                <dd>
                  <Tally n={perfect} of={rated.length} />
                </dd>
              </div>
            )}
          </dl>
          <div className="story-actions">
            <Button variant="primary" className="story-start" onClick={() => go('/')}>
              {say.home} <ArrowRight size={18} aria-hidden="true" />
            </Button>
            <button
              className="story-link"
              onClick={() => {
                if (missing !== undefined) select(missing);
                go('/campaign');
              }}
            >
              {missing !== undefined ? say.missing : say.tinker}
            </button>
          </div>
          <footer className="story-foot story-thanks">
            <span className="story-barcode" aria-hidden="true" />
            <span>{say.thanks}</span>
          </footer>
        </article>
      )}
    </main>
  );
}
