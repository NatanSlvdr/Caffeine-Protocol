import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '../../src/components/Editor';
import type { RobotRole } from '../../src/domain/types';

/** Stateful editor plus a source readout for interaction tests. */
export function Harness({
  initial = 'LISTEN',
  locked = false,
  role = 'query',
  level = 32,
}: {
  initial?: string;
  locked?: boolean;
  role?: RobotRole;
  level?: number;
}) {
  const [source, setSource] = useState(initial);
  return (
    <>
      <Editor role={role} source={source} onChange={setSource} level={level} locked={locked} observation={false} textMode={false} />
      <output aria-label="Current source">{source}</output>
    </>
  );
}

export const currentSource = () => screen.getByLabelText('Current source').textContent ?? '';

/** Static editor props for render-only feedback tests. */
export function staticEditorProps(
  source: string,
  overrides: Partial<{ level: number; locked: boolean; observation: boolean; textMode: boolean }> = {},
) {
  return { source, onChange: () => {}, level: 32, locked: false, observation: false, textMode: false, ...overrides };
}

export async function choose(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(
    within(screen.getByRole('listbox', { name: label })).getByRole('option', {
      name: option === 'coffee' ? 'Coffee' : option === 'tea' ? 'Tea' : option,
    }),
  );
}
