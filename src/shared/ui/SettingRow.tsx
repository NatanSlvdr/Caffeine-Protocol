import { useId, type ChangeEvent, type ReactNode } from 'react';

/** Shorter repeats is offered in house settings and in a shift's options, in the same words. */
export const SHORT_REPEATS_HINT =
  'Open a shift you’ve worked on straight on the code, and keep reactions you’ve already heard to one line. Help replays any intro.';

/**
 * Labeled checkbox row shared by settings and workspace options. The title names the checkbox and the hint
 * describes it, so a screen reader announces "Reduced motion, checkbox" before the longer explanation.
 */
export function SettingRow({
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  hint?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const id = useId();
  return (
    <label className="setting-row">
      <span>
        <strong id={`${id}-title`}>{title}</strong>
        {hint && <small id={`${id}-hint`}>{hint}</small>}
      </span>
      <input
        type="checkbox"
        aria-labelledby={`${id}-title`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  );
}
