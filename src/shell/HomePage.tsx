import { ArrowRight, BookOpen, CircleHelp, Clapperboard, Settings2, Store } from 'lucide-react';
import { isRated } from '@/data';
import { Button } from '@/shared/ui/Button';
import { Tally } from '@/shared/ui/Tally';
import { pad2 } from '@/shared/lib/format';
import { go, openGuide, openSettings } from '@/shared/lib/navigation';
import { useCafeName, useGame, useNarrative, useProgress } from '@/state/GameStore';
import { useLanguage, useWords, type Language } from '@/shared/language';
import { HomeCafePreview } from './HomeCafePreview';
import { sceneIn } from '@/data/campaign/cutscenes';
import { resumePoint, type ResumePoint } from './resume';
import { HOME_WORDS } from './homeWords';

/** Where the shift stands: served and how well, changed since, or still to start. */
function standing(
  { index, scene, stars, edited }: ResumePoint,
  say: (typeof HOME_WORDS)['en'],
  language: Language,
): string {
  if (scene) return say.scene(sceneIn(scene, language).title);
  if (stars !== undefined) {
    const served = isRated(index) ? say.servedWith(stars) : say.served;
    return edited ? `${served} ${say.changedSince}` : served;
  }
  return edited ? say.notServed : say.ready;
}

/** The café's front door: a menu ticket pinned over the live café, which runs in the background. */
export function HomePage() {
  const { save, launch, cafes, cafeId } = useGame();
  const say = useWords(HOME_WORDS);
  const [language] = useLanguage();
  const progress = useProgress();
  const narrative = useNarrative();
  // With more than one café in the browser, the front door says which one this is, and opens the list of them.
  const playing = cafes.cafes.length > 1 ? cafes.cafes.find((entry) => entry.id === cafeId)?.name : undefined;
  const cafe = useCafeName();
  // A returning player picks up where they left off; a new café gets the welcome instead.
  const resume = resumePoint(save);
  const number = resume ? pad2(resume.index + 1) : '';

  return (
    <main className="front-page">
      <div className="front-scene" aria-hidden="true">
        <HomeCafePreview reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art} />
      </div>
      <section className="front-menu">
        <article className="front-ticket">
          <span className="front-clip" aria-hidden="true" />
          <p className="front-kicker">{say.kicker(cafe)}</p>
          <h1 aria-label="Caffeine Protocol" data-screen-title tabIndex={-1}>
            Caffeine
            <br />
            <em>Protocol</em>
          </h1>
          {resume ? (
            <section className="front-resume" aria-labelledby="front-resume-title">
              <p className="front-resume-kicker">{say.resume}</p>
              <h2 id="front-resume-title">
                {say.shift(number)} · {narrative[resume.index].title}
              </h2>
              <p>{narrative[resume.index].objective}</p>
              <p id="front-resume-standing" className="front-resume-standing">
                {standing(resume, say, language)}
              </p>
            </section>
          ) : (
            <p className="front-tagline">{say.tagline}</p>
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
                {resume.scene ? say.watch : say.continue(number)}
                <ArrowRight size={19} aria-hidden="true" />
              </Button>
            ) : (
              <Button variant="primary" className="front-start" onClick={() => go('/campaign')}>
                <BookOpen size={18} aria-hidden="true" />
                {say.choose}
                <ArrowRight size={19} aria-hidden="true" />
              </Button>
            )}
            <div className="front-links">
              {resume && (
                <button className="front-link" onClick={() => go('/campaign')}>
                  <BookOpen size={17} aria-hidden="true" /> {say.choose}
                </button>
              )}
              <button className="front-link" aria-haspopup="dialog" onClick={openGuide}>
                <CircleHelp size={17} aria-hidden="true" /> {say.guide}
              </button>
              <button className="front-link" aria-haspopup="dialog" onClick={openSettings}>
                <Settings2 size={17} aria-hidden="true" /> {say.settings}
              </button>
              {playing && (
                <button
                  className="front-link"
                  aria-haspopup="dialog"
                  aria-label={say.switchCafes(playing)}
                  onClick={openSettings}
                >
                  <Store size={17} aria-hidden="true" /> {playing}
                </button>
              )}
            </div>
          </div>
          <footer className="front-foot">
            <p>
              <span>{say.servedCount}</span>
              <span>
                <Tally n={progress.done} of={progress.total} />
              </span>
            </p>
            <p>
              <span>{say.stars}</span>
              <span>
                <Tally n={progress.stars} of={progress.max} />
              </span>
            </p>
            <span className="front-barcode" aria-hidden="true" />
            <small>{save.complete ? say.complete : progress.done > 0 ? say.returning : say.fresh}</small>
          </footer>
        </article>
      </section>
    </main>
  );
}
