import { useWords, words } from '@/shared/language';

const WORDS = words(
  { of: (n: number, of: number) => `${n} of ${of}` },
  { of: (n: number, of: number) => `${n} sur ${of}` },
);

/** A printed "3/21" that a screen reader hears as "3 of 21". */
export function Tally({ n, of, unit = '' }: { n: number; of: number; unit?: string }) {
  const say = useWords(WORDS);
  return (
    <>
      <span aria-hidden="true">
        {n}/{of}
        {unit && ` ${unit}`}
      </span>
      <span className="sr-only">{say.of(n, of)}</span>
    </>
  );
}
