import { ArrowRight, BookOpen, CircleHelp, Clapperboard, Settings2 } from 'lucide-react';
import { isRated, titleFor } from '@/data';
import { narrativeFor } from '@/data/campaign/narrative';
import { Button } from '@/shared/ui/Button';
import { Tally } from '@/shared/ui/Tally';
import { pad2 } from '@/shared/lib/format';
import { go, openGuide, openSettings } from '@/shared/lib/navigation';
import { useCafeName, useGame, useProgress } from '@/state/GameStore';
import { HomeCafePreview } from './HomeCafePreview';
import { resumePoint, type ResumePoint } from './resume';

/** Where the shift stands: served and how well, changed since, or still to start. */
function standing({ index, scene, stars, edited }: ResumePoint): string {
  if (scene) return `A scene plays first: ${scene.title}.`;
  if (stars !== undefined) {
    const served = isRated(index) ? `Served with ${stars} of 3 stars.` : 'Served.';
    return edited ? `${served} You’ve changed the routine since.` : served;
  }
  return edited ? 'Not served yet. Your routine is as you left it.' : 'Ready to start.';
}

/** The café's front door: a menu ticket pinned over the live café, which runs in the background. */
export function HomePage() {
  const { save, launch } = useGame();
  const progress = useProgress();
  const cafe = useCafeName();
  // A returning player picks up where they left off; a new café gets the welcome instead.
  const resume = resumePoint(save);
  const shift = resume && `Shift ${pad2(resume.index + 1)}`;

  return (
    <main className="front-page">
      <div className="front-scene" aria-hidden="true">
        <HomeCafePreview reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art} />
      </div>
      <section className="front-menu">
        <article className="front-ticket">
          <span className="front-clip" aria-hidden="true" />
          <p className="front-kicker">{cafe} · A cozy coding adventure</p>
          <h1 aria-label="Caffeine Protocol" data-screen-title tabIndex={-1}>
            Caffeine
            <br />
            <em>Protocol</em>
          </h1>
          {resume ? (
            <section className="front-resume" aria-labelledby="front-resume-title">
              <p className="front-resume-kicker">Where you left off</p>
              <h2 id="front-resume-title">
                {shift} · {titleFor(resume.index)}
              </h2>
              <p>{narrativeFor(resume.index).objective}</p>
              <p id="front-resume-standing" className="front-resume-standing">
                {standing(resume)}
              </p>
            </section>
          ) : (
            <p className="front-tagline">
              A little café, a secondhand robot, and a fresh start. Teach Query one thoughtful routine at a time, until
              the café runs itself.
            </p>
          )}
          <div className="front-actions">
            {resume ? (
              <Button
                variant="primary"
                className="front-start"
                aria-describedby="front-resume-standing"
                onClick={() => (resume.scene ? go(`/scene/${resume.scene.id}`) : launch(resume.index))}
              >
                {resume.scene ? <Clapperboard size={18} aria-hidden="true" /> : null}
                {resume.scene ? 'Watch the scene' : `Continue ${shift}`}
                <ArrowRight size={19} aria-hidden="true" />
              </Button>
            ) : (
              <Button variant="primary" className="front-start" onClick={() => go('/campaign')}>
                <BookOpen size={18} aria-hidden="true" />
                Choose a shift
                <ArrowRight size={19} aria-hidden="true" />
              </Button>
            )}
            <div className="front-links">
              {resume && (
                <button className="front-link" onClick={() => go('/campaign')}>
                  <BookOpen size={17} aria-hidden="true" /> Choose a shift
                </button>
              )}
              <button className="front-link" aria-haspopup="dialog" onClick={openGuide}>
                <CircleHelp size={17} aria-hidden="true" /> How to play
              </button>
              <button className="front-link" aria-haspopup="dialog" onClick={openSettings}>
                <Settings2 size={17} aria-hidden="true" /> Settings
              </button>
            </div>
          </div>
          <footer className="front-foot">
            <p>
              <span>Served</span>
              <span>
                <Tally n={progress.done} of={progress.total} />
              </span>
            </p>
            <p>
              <span>Stars</span>
              <span>
                <Tally n={progress.stars} of={progress.max} />
              </span>
            </p>
            <span className="front-barcode" aria-hidden="true" />
            <small>
              {save.complete ? 'Under new management' : progress.done > 0 ? 'Welcome back' : 'Doors open soon'}
            </small>
          </footer>
        </article>
      </section>
    </main>
  );
}
