import { ArrowRight } from 'lucide-react';
import { CAMPAIGN_LENGTH, titleFor } from '@/data';
import { Cafe } from '@/components';
import { Button } from '@/shared/ui/Button';
import { stories } from '@/data/campaign/narrative';
import { go } from '@/shared/lib/navigation';
import { pad2 } from '@/shared/lib/format';
import { useGame, useProgress } from '@/state/GameStore';
import { ShellBar } from './ShellBar';

interface ScriptLine {
  speaker?: string;
  text: string;
}

/** Story text as a little script: a line opening with `NAME:` is spoken, anything else is narration. */
function parseScript(text: string): ScriptLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const spoken = /^([A-Z][A-Z ]+):\s*(.+)$/.exec(line);
      return spoken ? { speaker: spoken[1].toLowerCase(), text: spoken[2] } : { text: line };
    });
}

function Script({ lines }: { lines: ScriptLine[] }) {
  return (
    <div className="story-script">
      {lines.map((line, index) =>
        line.speaker ? (
          <p className="story-line" key={index}>
            <span className="story-speaker">{line.speaker}</span>
            <q>{line.text}</q>
          </p>
        ) : (
          <p className="story-narration" key={index}>
            {line.text}
          </p>
        ),
      )}
    </div>
  );
}

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

/** Between-shifts story beat, written up as a note pinned by the door, with the way into the next shift. */
export function InterludePage({ index }: { index: number }) {
  const { update } = useGame();
  const story = stories[index];
  return (
    <main className="story-page">
      <ShellBar label="Story" back="Campaign" onBack={() => go('/campaign')} />
      <StoryScene level={index + 1} />
      <article className="story-note">
        <span className="story-tape" aria-hidden="true" />
        <p className="story-kicker">Between shifts</p>
        <h1>{story.title}</h1>
        <Script lines={parseScript(story.text)} />
        <div className="story-actions">
          <Button
            variant="primary"
            className="story-start"
            onClick={() => {
              update((s) => ({ ...s, story: { ...s.story, [index]: true } }));
              go(`/shift/${index + 1}`);
            }}
          >
            Let's open the café <ArrowRight size={18} />
          </Button>
        </div>
        <footer className="story-foot">
          <span>Up next</span>
          <strong>
            Shift {pad2(index + 1)} · {titleFor(index)}
          </strong>
        </footer>
      </article>
    </main>
  );
}

/** Closing screen after the final shift: the last word, then the day's receipt. */
export function EndingPage() {
  const progress = useProgress();
  return (
    <main className="story-page ending-page">
      <ShellBar label="Closing time" back="Campaign" onBack={() => go('/campaign')} />
      <StoryScene />
      <article className="story-note">
        <span className="story-tape" aria-hidden="true" />
        <p className="story-kicker">Employee of the month</p>
        <h1>Closing time.</h1>
        <Script
          lines={[
            { speaker: 'query', text: 'That is not in my instruction set.' },
            { speaker: 'niko', text: 'It is now.' },
            {
              text: 'The counter, the kitchen and the floor are working together. Every cup follows your instructions.',
            },
            { text: 'Niko sits down with a warm coffee. The café can finally run itself.' },
          ]}
        />
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
    </main>
  );
}
