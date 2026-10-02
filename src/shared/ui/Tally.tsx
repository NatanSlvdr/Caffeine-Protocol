/** A printed "3/21" that a screen reader hears as "3 of 21". */
export function Tally({ n, of, unit = '' }: { n: number; of: number; unit?: string }) {
  return (
    <>
      <span aria-hidden="true">
        {n}/{of}
        {unit && ` ${unit}`}
      </span>
      <span className="sr-only">
        {n} of {of}
      </span>
    </>
  );
}
