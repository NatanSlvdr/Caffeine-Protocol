import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RobotRole } from '../src/domain/types';
import { useState } from 'react';
import { Editor } from '../src/components/Editor';
import { CodingPaneHeader } from '../src/components/CodingPaneHeader';
import { compileProgram } from '../src/domain/program';
afterEach(cleanup);

function Harness({ initial = 'LISTEN', locked = false, observation = false, role = 'query', level = 32, textMode = false }: {
  initial?: string; locked?: boolean; observation?: boolean; role?: RobotRole; level?: number; textMode?: boolean;
}) {
  const [source, setSource] = useState(initial);
  return <><Editor role={role} source={source} onChange={setSource} level={level} locked={locked} observation={observation} textMode={textMode}/><output aria-label="Current source">{source}</output></>;
}
const currentSource = () => screen.getByLabelText('Current source').textContent ?? '';

describe('parameterized block editor', () => {
  it('adds a block directly from the available actions', async () => {
    const user = userEvent.setup(); render(<Harness/>);
    await user.click(screen.getByRole('button', { name: 'Insert TICKET' }));
    expect(currentSource()).toBe('LISTEN\nTICKET');
  });
  it('configures library operands before adding structural blocks with END', async () => {
    const user = userEvent.setup(); render(<Harness/>);
    await user.selectOptions(screen.getByLabelText('Library IF condition'), 'IF coffee');
    for (const command of ['IF coffee', 'EACH', 'FUNCTION build_ticket']) {
      await user.click(screen.getByRole('button', { name: 'Insert ' + command }));
      expect(currentSource()).toContain(command + '\nEND');
    }
  });
  it('inserts after the selected source line', async () => {
    const user = userEvent.setup(); render(<Harness initial={'LISTEN\nSUBMIT'}/>);
    await user.click(screen.getByLabelText('Block 1 value'));
    await user.click(screen.getByRole('button', { name: 'Insert TICKET' }));
    expect(currentSource()).toBe('LISTEN\nTICKET\nSUBMIT');
  });
  it('edits an operand without replacing the action', async () => {
    const user = userEvent.setup(); render(<Harness initial={'LISTEN\nITEM coffee'}/>);
    await user.selectOptions(screen.getByLabelText('Block 2 value'), 'ITEM tea');
    expect(currentSource()).toBe('LISTEN\nITEM tea');
    expect(within(screen.getByLabelText('Block 2 value')).queryByRole('option', { name: 'WAIT' })).toBeNull();
  });
  it('presents LISTEN as WAIT customer speech without changing saved syntax', () => {
    render(<Harness/>);
    expect((screen.getByLabelText('Block 1 value') as HTMLSelectElement).selectedOptions[0].text).toBe('Customer speech');
    expect(document.querySelector('.block-verb')?.textContent).toBe('WAIT');
    expect(currentSource()).toBe('LISTEN');
  });
  it('switches supported wait targets for the floor robot', async () => {
    const user = userEvent.setup(); render(<Harness role="floor" initial="WAIT DRINK"/>);
    await user.selectOptions(screen.getByLabelText('Block 1 value'), 'WAIT DIRTY');
    expect(currentSource()).toBe('WAIT DIRTY');
    expect(within(screen.getByLabelText('Block 1 value')).queryByRole('option', { name: 'Customer speech' })).toBeNull();
  });
  it('edits conditions without losing the body or END', async () => {
    const user = userEvent.setup(); render(<Harness initial={'LISTEN\nIF tea\nTICKET\nITEM tea\nSUBMIT\nEND'}/>);
    await user.selectOptions(screen.getByLabelText('Block 2 condition'), 'IF coffee');
    expect(currentSource()).toBe('LISTEN\nIF coffee\nTICKET\nITEM tea\nSUBMIT\nEND');
    expect(compileProgram(currentSource()).compile_error).toBe('');
    expect(document.querySelector('[data-line="2"]')?.getAttribute('data-depth')).toBe('1');
  });
  it('moves and deletes single blocks', async () => {
    const user = userEvent.setup(); render(<Harness initial={'LISTEN\nTICKET\nSUBMIT'}/>);
    await user.click(screen.getByRole('button', { name: 'Move block 2 down' }));
    expect(currentSource()).toBe('LISTEN\nSUBMIT\nTICKET');
    await user.click(screen.getByRole('button', { name: 'Delete block 2' }));
    expect(currentSource()).toBe('LISTEN\nTICKET');
  });
  it('locks library, operands, movement, and deletion during playback', async () => {
    const user = userEvent.setup(); render(<Harness locked/>);
    for (const button of screen.getAllByRole('button')) expect((button as HTMLButtonElement).disabled).toBe(true);
    for (const select of screen.getAllByRole('combobox')) expect((select as HTMLSelectElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Insert TICKET' }));
    expect(currentSource()).toBe('LISTEN');
  });
  it('keeps text mode available through external options and preserves source', () => {
    const source = '# hello\n\n LISTEN \n', props = { source, onChange: vi.fn(), level: 32, locked: false, observation: false };
    const { rerender } = render(<Editor {...props} textMode/>);
    expect((screen.getByRole('textbox', { name: 'Program source' }) as HTMLTextAreaElement).value).toBe(source);
    rerender(<Editor {...props} textMode={false}/>);
    expect(document.querySelector('[data-line="2"] .block-verb')?.textContent).toBe('WAIT');
    expect(props.onChange).not.toHaveBeenCalled();
  });
  it('makes the text view read-only during playback', () => {
    render(<Harness textMode locked/>);
    expect((screen.getByRole('textbox', { name: 'Program source' }) as HTMLTextAreaElement).readOnly).toBe(true);
  });
  it('highlights active and failing lines', () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<Editor source={'LISTEN\nTICKET'} onChange={() => {}} level={3} locked activeLine={0} failureLine={1} observation={false} textMode={false}/>);
    expect(document.querySelector('.block.active')?.getAttribute('data-line')).toBe('0');
    expect(document.querySelector('.block.failure')?.getAttribute('data-line')).toBe('1');
  });
  it('locks observation routines', () => {
    render(<Harness observation/>);
    expect(screen.getByText('Niko’s routine')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Insert TICKET' }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('.block')).toBeNull();
  });
  it('edits movement direction and distance while preserving comments', async () => {
    const user = userEvent.setup(); render(<Harness role="prep" initial={'# route\nMOVE UP 3\nWAIT TICKET'}/>);
    await user.selectOptions(screen.getByLabelText('Block 2 direction'), 'RIGHT');
    expect(currentSource()).toBe('# route\nMOVE RIGHT 3\nWAIT TICKET');
    await user.tripleClick(screen.getByLabelText('Block 2 tiles')); await user.keyboard('5');
    expect(currentSource()).toContain('MOVE RIGHT 5');
  });
  it('changes the action library when the robot changes', () => {
    const props = { source: '', onChange: () => {}, level: 32, locked: false, observation: false, textMode: false };
    const { rerender } = render(<Editor {...props} role="prep"/>);
    expect(screen.getByRole('button', { name: 'Insert TAKE BEANS' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Insert CHARGE' })).toBeNull();
    rerender(<Editor {...props} role="floor"/>);
    expect(screen.getByRole('button', { name: 'Insert CHARGE' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Insert TAKE BEANS' })).toBeNull();
  });
  it('inserts inside a selected branch and preserves comments', async () => {
    const user = userEvent.setup(); render(<Harness initial={'# morning\nIF tea\nEND'}/>);
    await user.click(screen.getByLabelText('Block 2 condition'));
    await user.click(screen.getByRole('button', { name: 'Insert TICKET' }));
    expect(currentSource()).toBe('# morning\nIF tea\nTICKET\nEND');
  });
  it('aligns ELSE and END with their scopes', () => {
    render(<Harness initial={'IF tea\nEACH\nTICKET\nEND\nELSE\nHELP\nEND'}/>);
    expect([...document.querySelectorAll('.block')].map(row => row.getAttribute('data-depth'))).toEqual(['0', '1', '2', '1', '0', '1', '0']);
  });
  it('only offers unlocked condition operands', () => {
    render(<Harness level={4} initial={'LISTEN\nIF tea\nEND'}/>);
    const options = within(screen.getByLabelText('Block 2 condition')).getAllByRole('option').map(o => (o as HTMLOptionElement).value);
    expect(options).toEqual(['IF tea', 'IF coffee']);
  });
  it('places available blocks before the code with no extra toolbar', () => {
    render(<Harness/>);
    const library = screen.getByRole('region', { name: 'Available code blocks' }), code = screen.getByLabelText('Code zone');
    expect(library.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('ROUTINE BLUEPRINT')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Text' })).toBeNull();
  });
});

describe('minimal coding pane header', () => {
  const props = { shift: 'A little sugar', objective: 'Make the requested drinks.', role: 'query' as const, onRole: vi.fn() };
  it('shows the shift and objective but hides single-robot navigation', () => {
    render(<CodingPaneHeader {...props} level={14}/>);
    expect(screen.getByRole('heading', { name: props.shift })).toBeTruthy();
    expect(screen.getByText(props.objective)).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });
  it('offers only unlocked robots and switches the selected pane', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CodingPaneHeader {...props} level={15}/>);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await user.click(screen.getAllByRole('tab')[1]);
    expect(props.onRole).toHaveBeenCalledWith('prep');
    rerender(<CodingPaneHeader {...props} level={23} role="floor"/>);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getAllByRole('tab')[2].getAttribute('aria-selected')).toBe('true');
  });
});
