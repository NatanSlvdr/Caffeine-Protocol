import { ArrowRight, Coffee, Leaf, Play, Terminal } from 'lucide-react';
import { CAMPAIGN_LENGTH } from '@/data';
import { Cafe } from '@/components';
import { go } from '@/shared/lib/navigation';
import { useGame, useProgress } from '@/state/GameStore';

/** Landing page: pitch, café preview, and continue/explore entries. */
export function HomePage() {
  const { save, launch } = useGame();
  const progress = useProgress();
  return (
    <main className="home-page">
      <section className="home-copy">
        <div className="eyebrow">
          <span /> A COZY PROGRAMMING ADVENTURE
        </div>
        <h1>
          Good coffee.
          <br />
          Better <em>instructions.</em>
        </h1>
        <p>
          A little café. A secondhand robot. A fresh start.
          <br />
          Teach Query to listen, one cup at a time.
        </p>
        <button className="primary large" onClick={() => launch(save.selected)}>
          <Play size={17} fill="currentColor" />
          {progress.done ? 'Continue your café' : 'Open the café'}
          <ArrowRight size={18} />
        </button>
        <button className="text-link" onClick={() => go('/campaign')}>
          Explore the {CAMPAIGN_LENGTH} shifts <ArrowRight size={15} />
        </button>
        <div className="home-footer">
          <span>
            <Coffee size={16} /> Slow mornings
          </span>
          <span>
            <Terminal size={16} /> Small puzzles
          </span>
          <span>
            <Leaf size={16} /> No rush
          </span>
        </div>
      </section>
      <section className="home-world">
        <div className="world-caption">
          <span className="status-dot" /> OPEN FOR A FRESH START
        </div>
        <Cafe reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art} />
        <div className="home-note">
          <span className="note-icon">
            Q<span>••</span>
          </span>
          <div>
            <strong>“What is a coffee?”</strong>
            <small>QUERY · YOUR NEW COUNTER COMPANION</small>
          </div>
        </div>
      </section>
      <span className="home-bottom">
        HANDCRAFTED ROUTINES, HAPPILY SERVED. <span>ACT I — QUERY</span>
      </span>
    </main>
  );
}
