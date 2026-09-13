import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Editor } from '../src/components/Editor';
import { CodingPaneHeader } from '../src/components/CodingPaneHeader';
import { compileProgram } from '../src/domain/program';
import { placeBlock, removeVisualBlock, visualProgram } from '../src/domain/visualProgram';
import type { RobotRole } from '../src/domain/types';
afterEach(cleanup);
function Harness({ initial = 'LISTEN', locked = false, role = 'query', level = 32 }: { initial?: string; locked?: boolean; role?: RobotRole; level?: number }) {
 const [source, setSource] = useState(initial);
 return <><Editor role={role} source={source} onChange={setSource} level={level} locked={locked} observation={false} textMode={false}/><output aria-label="Current source">{source}</output></>;
}
const source = () => screen.getByLabelText('Current source').textContent ?? '';
async function choose(label: string, option: string) {
 const user = userEvent.setup();
 await user.click(screen.getByRole('combobox', { name: label }));
 await user.click(within(screen.getByRole('listbox', { name: label })).getByRole('option', { name: option }));
}
describe('compact visual code', () => {
 it('offers the simplified library and matching action icons', async () => {
  render(<Harness/>);
  expect(screen.queryByRole('button',{name:'Insert REPEAT'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Insert CHARGE ORDER'})).toBeNull();
  expect(screen.getByRole('button',{name:'Insert TICKET'}).querySelector('.lucide-ticket')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Insert SUBMIT'}).querySelector('.lucide-ticket')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Insert ITEM coffee'}).querySelector('.lucide-circle-plus')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Insert JUMP listen'}).querySelector('.lucide-arrow-left')).toBeTruthy();
  await userEvent.click(screen.getByLabelText('Library Add value'));
  expect(screen.getAllByRole('option').map(e=>e.textContent)).toEqual(['coffee','tea']);
 });
 it('uses renamed ticket actions with inline styled operands', async () => {
  render(<Harness initial={'LISTEN\nTICKET\nITEM coffee\nCHARGE ORDER\nSUBMIT'}/>);
  expect([...document.querySelectorAll('.block-verb')].map(e => e.textContent)).toEqual(['Wait for','Create Ticket','Add','Make customer','Submit Ticket']);
  await choose('Block 3 value','tea');
  expect(source()).toContain('ITEM tea');
  expect(document.querySelector('[data-line="2"]')?.textContent).toContain('to ticket');
  expect(screen.getByLabelText('Block 4 value').textContent).toContain('pay');
 });
 it('puts numbering outside tiles and renders nested branches as one scope', () => {
  render(<Harness initial={'LISTEN\nIF tea\nTICKET\nELSE\nHELP\nEND'}/>);
  expect([...document.querySelectorAll('.block')].map(e => e.getAttribute('data-depth'))).toEqual(['0','0','1','0','1']);
  expect(document.querySelector('.block .line-number')).toBeNull();
  expect(document.querySelector('.code-scope .else-body [data-line="4"]')).toBeTruthy();
  expect(document.querySelector('.else-body .block-verb')?.textContent).toBe('Else');
  expect([...document.querySelectorAll<HTMLElement>('.line-number')].map(e=>e.style.left)).toEqual(['-35px','-35px','-77px','-35px','-77px']);
  expect(document.querySelectorAll('.code-row .block-icon')).toHaveLength(5);
 });
 it('chooses operands before inserting blocks into an empty IF', async () => {
  const user = userEvent.setup(); render(<Harness initial={'LISTEN\nIF tea\nEND'}/>);
  await user.click(document.querySelector('[data-line="1"] .block-verb')!);
  await choose('Library Add value','tea');
  await user.click(screen.getByRole('button',{name:'Insert ITEM tea'}));
  expect(source()).toBe('LISTEN\nIF tea\nITEM tea\nEND');
 });
 it('preserves branch contents when editing the condition', async () => {
  render(<Harness initial={'LISTEN\nIF tea\nTICKET\nEND'}/>);
  await choose('Block 2 condition','coffee');
  expect(source()).toBe('LISTEN\nIF coffee\nTICKET\nEND');
  expect(compileProgram(source()).compile_error).toBe('');
 });
 it('supports keyboard choice and Escape without committing', async () => {
  const user = userEvent.setup(); render(<Harness role="floor" initial="WAIT DRINK"/>);
  screen.getByLabelText('Block 1 value').focus();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(source()).toBe('WAIT DIRTY');
  await user.click(screen.getByLabelText('Block 1 value'));
  await user.keyboard('{ArrowUp}{Escape}');
  expect(source()).toBe('WAIT DIRTY');
  expect(screen.queryByRole('listbox')).toBeNull();
 });
 it('offers only unlocked operands and robot movement directions', async () => {
  render(<Harness level={4} initial={'LISTEN\nIF tea\nEND'}/>);
  await userEvent.click(screen.getByLabelText('Block 2 condition'));
  expect(screen.getAllByRole('option').map(e=>e.textContent)).toEqual(['tea','coffee']);
  await userEvent.keyboard('{Escape}');
  await userEvent.click(screen.getByLabelText('Library Move direction'));
  expect(screen.getAllByRole('option').map(e=>e.textContent)).toEqual(['right','left']);
 });
 it('locks editing during replay', async () => {
  render(<Harness locked/>);
  for(const button of screen.getAllByRole('button')) expect((button as HTMLButtonElement).disabled).toBe(true);
  for(const combo of screen.getAllByRole('combobox')) expect((combo as HTMLButtonElement).disabled).toBe(true);
  await userEvent.click(screen.getByRole('button',{name:'Insert TICKET'}));
  expect(source()).toBe('LISTEN');
 });
 it('connects a jump to a draggable empty marker', async () => {
  render(<Harness/>);
  await userEvent.click(screen.getByRole('button',{name:'Insert JUMP listen'}));
  expect(source()).toBe('POSITION listen\nLISTEN\nJUMP listen');
  expect(screen.getByLabelText('Drag jump destination')).toBeTruthy();
  expect(document.querySelector('[data-target] .block-verb')).toBeNull();
  expect(document.querySelectorAll('.jump-arrows>path')).toHaveLength(1);
 });
 it('preserves source comments and whitespace in the text view', () => {
  const original='# morning\n\n LISTEN \n';
  const onChange=vi.fn(), props={source:original,onChange,level:3,locked:false,observation:false};
  const {rerender}=render(<Editor {...props} textMode/>);
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(original);
  rerender(<Editor {...props} textMode={false}/>);
  expect(document.querySelector('[data-line="2"]')).toBeTruthy();
  expect(onChange).not.toHaveBeenCalled();
 });
 it('highlights execution and errors by preserved source line', () => {
  render(<Editor source={'LISTEN\nIF tea\nTICKET\nEND'} onChange={()=>{}} level={4} locked observation={false} textMode={false} activeLine={2} failureLine={1}/>);
  expect(document.querySelector('.block.active')?.getAttribute('data-line')).toBe('2');
  expect(document.querySelector('.block.failure')?.getAttribute('data-line')).toBe('1');
 });
});
describe('structural editing',()=>{
 it('deletes a complete nested IF when dragged out, leaving the surrounding routine intact',()=>{
  expect(removeVisualBlock('LISTEN\nIF tea\nIF sugar\nTICKET\nEND\nELSE\nHELP\nEND\nREPEAT',1)).toBe('LISTEN\nREPEAT');
 });
 it('deletes an ELSE body without deleting the enclosing IF delimiter',()=>{
  expect(removeVisualBlock('IF tea\nTICKET\nELSE\nIF sugar\nHELP\nEND\nEND',2)).toBe('IF tea\nTICKET\nEND');
 });
 it('removes ELSE when its final instruction is deleted',()=>{
  expect(removeVisualBlock('IF tea\nTICKET\nELSE\nHELP\nEND',3)).toBe('IF tea\nTICKET\nEND');
 });
 it('cleans up disconnected jump endpoints but preserves shared destinations',()=>{
  expect(removeVisualBlock('POSITION listen\nLISTEN\nJUMP listen',2)).toBe('LISTEN');
  expect(removeVisualBlock('POSITION listen\nLISTEN\nJUMP listen\nJUMP listen',2)).toBe('POSITION listen\nLISTEN\nJUMP listen');
  expect(removeVisualBlock('POSITION listen\nLISTEN\nJUMP listen',0)).toBe('LISTEN');
  expect(removeVisualBlock(' POSITION listen \nLISTEN\n JUMP listen ',2)).toBe('LISTEN');
 });
 it('only moves ELSE branches to another IF alternative slot',()=>{
  const code='IF tea\nTICKET\nELSE\nHELP\nEND\nIF coffee\nEND';
  expect(placeBlock(code,'ELSE',0,2)).toBe(code);
  expect(placeBlock(code,'ELSE',6,2,true)).toBe('IF tea\nTICKET\nEND\nIF coffee\nELSE\nHELP\nEND');
 });
 it('creates ELSE by dropping an instruction and removes it when emptied',()=>{
  const original='LISTEN\nIF tea\nTICKET\nEND';
  const withElse=placeBlock(original,'HELP',3,undefined,true);
  expect(withElse).toBe('LISTEN\nIF tea\nTICKET\nELSE\nHELP\nEND');
  expect(placeBlock(withElse,'HELP',6,4)).toBe(original+'\nHELP');
 });
 it('can move the final true-branch instruction into its else branch',()=>{
  expect(placeBlock('IF tea\nTICKET\nEND','TICKET',2,1,true)).toBe('IF tea\nELSE\nTICKET\nEND');
 });
 it('moves complete nested scopes and prevents dropping them inside themselves',()=>{
  const code='LISTEN\nIF tea\nEACH\nTICKET\nEND\nEND\nHELP';
  expect(placeBlock(code,'IF tea',4,1)).toBe(code);
  expect(placeBlock(code,'IF tea',7,1)).toBe('LISTEN\nHELP\nIF tea\nEACH\nTICKET\nEND\nEND');
 });
 it('gives independent jumps independent movable targets',()=>{
  const code=placeBlock('POSITION listen\nLISTEN\nJUMP listen','JUMP listen',3);
  expect(code).toContain('POSITION jump_1');
  expect(code).toContain('JUMP jump_1');
  expect(compileProgram(code).compile_error).toBe('');
  expect(placeBlock('POSITION listen\nLISTEN\nTICKET\nJUMP listen','POSITION listen',2,0)).toBe('LISTEN\nPOSITION listen\nTICKET\nJUMP listen');
 });
 it('keeps empty alternatives invisible and resolves nested ELSE correctly',()=>{
  const tree=visualProgram('IF tea\nIF coffee\nHELP\nELSE\nTICKET\nEND\nELSE\nEND');
  expect(tree[0].alternative).toEqual([]);
  expect(tree[0].children?.[0].alternative?.[0].command).toBe('TICKET');
 });
});
describe('minimal coding pane header',()=>{
 it('hides one robot and offers only the available robots',async()=>{
  const props={shift:'A little sugar',objective:'Make the requested drinks.',role:'query' as const,onRole:vi.fn()};
  const {rerender}=render(<CodingPaneHeader {...props} level={14}/>);
  expect(screen.queryByRole('tablist')).toBeNull();
  rerender(<CodingPaneHeader {...props} level={15}/>);
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  await userEvent.click(screen.getAllByRole('tab')[1]);
  expect(props.onRole).toHaveBeenCalledWith('prep');
 });
});
