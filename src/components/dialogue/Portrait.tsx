import { cast } from '@/data/campaign/cast';
import type { CastId, Mood } from '@/domain';

/** Drop a PNG at src/assets/portraits/<character>/<mood>.png and it is picked up, bundled and precached. */
const files = import.meta.glob<string>('../../assets/portraits/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const portraits: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/portraits/')[1].replace(/\.png$/, ''), url]),
);

/** A missing mood falls back to the character's neutral portrait. */
export function portraitUrl(who: CastId, mood: Mood = 'neutral'): string | undefined {
  return portraits[`${who}/${mood}`] ?? portraits[`${who}/neutral`];
}

/** The character's portrait, or a coloured initial card until the art is in. */
export function Portrait({ who, mood }: { who: CastId; mood?: Mood }) {
  const url = portraitUrl(who, mood);
  const { name, color } = cast[who];
  return (
    <div
      className={`portrait portrait-${who}${url ? '' : ' placeholder'}`}
      data-mood={mood ?? 'neutral'}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <span className="portrait-card" style={{ background: color }}>
          {name.replace(/^Mr\. /, '')[0]}
        </span>
      )}
    </div>
  );
}
