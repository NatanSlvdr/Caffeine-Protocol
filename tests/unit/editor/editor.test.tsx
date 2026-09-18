import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '../../../src/components/Editor';
import { Harness, choose, currentSource as source } from '../../helpers/editorHarness';
import { CodingPaneHeader } from '../../../src/components/CodingPaneHeader';
import { compileProgram } from '../../../src/domain/program';
import { placeBlock, removeVisualBlock, visualProgram } from '../../../src/domain/visualProgram';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('compact visual code', () => {
 it('offers the simplified library and matching action icons', async () => {
  render(<Harness/>);
  expect(screen.queryByRole('button',{name:'Insert REPEAT'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Insert CHARGE ORDER'})).toBeNull();
  expect(screen.getByRole('button',{name:'Insert TAKE UP'}).querySelector('.lucide-hand')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Insert MOVE RIGHT 1'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Insert DEPOSIT RIGHT'}).querySelector('.lucide-hand')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Insert ITEM coffee'}).querySelector('.lucide-pen-line')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Insert JUMP listen'}).querySelector('.jump-icon')).toBeTruthy();
  expect(screen.getByLabelText('Library Take direction').querySelectorAll('.direction-mini-grid > span')).toHaveLength(9);
  await userEvent.click(screen.getByLabelText('Library Write value'));
  expect(screen.getAllByRole('option').map(e=>e.textContent)).toEqual(['Coffee','Tea','Sugar']);
 });
 it('ignores shop selections and keeps its operands unselected', async () => {
  render(<Harness/>);
  for (const name of ['Library Write value','Library If value','Library If operator','Library If source']) {
   expect(screen.getByLabelText(name).textContent).toBe('');
  }
  expect(screen.getByLabelText('Library Move tiles').getAttribute('value')).toBe('');
  expect(screen.getByLabelText('Library Take direction').querySelector('.chosen')).toBeNull();
  await userEvent.click(screen.getByLabelText('Library If value'));
  await userEvent.click(screen.getByRole('option',{name:'Tea'}));
  expect(screen.getByLabelText('Library If value').textContent).toBe('');
  expect(source()).toBe('LISTEN');
  expect(screen.getByLabelText('Library If operator').textContent).toBe('');
  expect(screen.getByLabelText('Library If source').textContent).toBe('');
 });
 it('shows operand text alongside shared-model miniatures and keeps keyboard selection local', async () => {
  const user = userEvent.setup();
  render(<Harness initial={'LISTEN\nITEM coffee\nMOVE RIGHT 1'}/>);
  expect(screen.getByLabelText('Block 1 value').textContent).toContain('Orders');
  expect(screen.getByLabelText('Block 2 value').textContent).toContain('Coffee');
  expect(screen.getByLabelText('Block 2 value').querySelector('.model-coffee')).toBeTruthy();
  screen.getByLabelText('Block 3 direction').focus();
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('listbox').querySelector('.model-robot')).toBeTruthy();
  expect(document.querySelector('.visual-program.is-dragging')).toBeNull();
  await user.keyboard('{Enter}');
  expect(source()).toContain('MOVE DOWN_RIGHT 1');
 });
 it('expands the direction grid at the trigger and shrinks it back after selection', async () => {
  const user = userEvent.setup(); render(<Harness initial="MOVE RIGHT 1"/>);
  const trigger = screen.getByLabelText('Block 1 direction');
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({x:320,y:180,width:28,height:28}));
  await user.click(trigger);
  const grid = screen.getByRole('listbox', {name:'Block 1 direction'});
  expect(grid.style.left).toBe('264px');expect(grid.style.top).toBe('124px');
  expect(grid.style.width).toBe('140px');expect(grid.style.height).toBe('140px');
  expect([...grid.querySelector('.direction-mini-grid')!.children].map(cell=>cell.getAttribute('aria-label'))).toEqual(['up left','up','up right','left',null,'right','down left','down','down right']);
  expect(grid.querySelector('small')).toBeNull();
  await user.click(within(grid).getByRole('option',{name:'up left'}));
  expect(source()).toBe('MOVE UP_LEFT 1');
  expect(grid.classList.contains('direction-closing')).toBe(true);
  expect(trigger.querySelector('.direction-mini-grid>span.chosen')).toBe(trigger.querySelector('.direction-mini-grid')?.firstElementChild);
  fireEvent.animationEnd(grid);
  expect(document.querySelector('.direction-menu')).toBeNull();
 });
 it('uses renamed ticket actions with inline styled operands', async () => {
  render(<Harness initial={'LISTEN\nTICKET\nITEM coffee\nSUBMIT'}/>);
  expect([...document.querySelectorAll('.block-verb:not(.block-suffix)')].map(e => e.textContent)).toEqual(['Wait for','Take','Write','Deposit']);
  await choose('Block 3 value','tea');
  expect(source()).toContain('ITEM tea');
  expect(document.querySelector('[data-line="2"]')?.textContent).not.toContain('on paper');
 });
 it('keeps Take and Deposit generic and lets Query edit movement', async () => {
  render(<Harness initial={'LISTEN\nTAKE UP\nMOVE RIGHT 1\nDEPOSIT RIGHT'}/>);
  expect(document.querySelector('[data-line="1"] .block-suffix')).toBeNull();
  expect(document.querySelector('[data-line="3"] .block-suffix')).toBeNull();
  await choose('Block 2 direction', 'up left');
  fireEvent.change(screen.getByLabelText('Block 3 tiles'), { target: { value: '2' } });
  expect(source()).toBe('LISTEN\nTAKE UP_LEFT\nMOVE RIGHT 2\nDEPOSIT RIGHT');
  expect(compileProgram(source()).compile_error).toBe('');
 });
 it('puts numbering outside tiles and renders nested branches as one scope', () => {
  render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTICKET\nELSE\nHELP\nEND'}/>);
  expect([...document.querySelectorAll('.block')].map(e => e.getAttribute('data-depth'))).toEqual(['0','0','1','0','1']);
  expect(document.querySelector('.block .line-number')).toBeNull();
  expect(document.querySelector('.code-scope .else-body [data-line="4"]')).toBeTruthy();
  expect(document.querySelector('.else-body .block-verb')?.textContent).toBe('Else');
  expect([...document.querySelectorAll<HTMLElement>('.line-number')].map(e=>e.style.left)).toEqual(['-35px','-35px','-77px','-35px','-77px']);
  expect(document.querySelectorAll('.code-row .block-icon')).toHaveLength(5);
 });
 it('inserts the default block after previewing shop options', async () => {
  const user = userEvent.setup(); render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nEND'}/>);
  await user.click(document.querySelector('[data-line="1"] .block-verb')!);
  await choose('Library Write value','tea');
  await user.click(screen.getByRole('button',{name:'Insert ITEM coffee'}));
  expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\nEND\nITEM coffee');
  expect(document.querySelectorAll('.block.selected')).toHaveLength(0);
 });
 it('preserves branch contents when editing the condition', async () => {
  render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTICKET\nEND'}/>);
  await choose('Block 2 value','coffee');
  expect(source()).toBe('LISTEN\nIF coffee IN CUSTOMER SPEECH\nTICKET\nEND');
  expect(compileProgram(source()).compile_error).toBe('');
 });
 it('edits token membership using one condition block with scoped operands', async () => {
  render(<Harness level={7} initial={'LISTEN\nIF sugar IN CUSTOMER SPEECH\nEND'}/>);
  await choose('Block 2 value','Negation');
  expect(source()).toBe('LISTEN\nIF negation IN CUSTOMER SPEECH\nEND');
  await userEvent.click(screen.getByRole('combobox', {name:'Block 2 source'}));
  expect(screen.getAllByRole('option').map(e=>e.textContent)).toEqual(['Orders']);
  expect(compileProgram(source(),7).compile_error).toBe('');
 });
 it('inserts a FOR scope with separate variable and collection selectors', async () => {
  render(<Harness level={9}/>);
  await userEvent.click(screen.getByRole('button',{name:'Insert FOR item IN heard orders'}));
  expect(source()).toBe('LISTEN\nFOR item IN heard orders\nEND');
  expect(screen.getByLabelText('Block 2 variable').textContent).toBe('item');
  expect(screen.getByLabelText('Block 2 selector').textContent).toBe('order');
  expect(compileProgram(source(),9).compile_error).toBe('');
 });
 it('preserves the kitchen comparison operands independently of Query tokens', async () => {
  render(<Harness role="prep" level={20} initial={'WAIT TICKET\nIF coffee IN CUSTOMER SPEECH\nEND'}/>);
  await choose('Block 2 operator','!=');
  expect(source()).toBe('WAIT TICKET\nIF coffee != CUSTOMER SPEECH\nEND');
  expect(screen.getByLabelText('Block 2 source').textContent).toBe('Orders');
 });
 it('adds, edits, switches and removes logical rows within the same IF', async () => {
  render(<Harness level={7} initial={'LISTEN\nIF sugar IN CUSTOMER SPEECH\nSUGAR true\nEND'}/>);
  expect(screen.getByLabelText('Block 2 value').querySelector('.model-sugar')).toBeTruthy();
  await choose('Block 2 connector','AND');
  await choose('Block 2 condition 2 value','Negation');
  await choose('Block 2 condition 2 operator','NOT IN');
  expect(source()).toBe('LISTEN\nIF sugar IN CUSTOMER SPEECH AND negation NOT IN CUSTOMER SPEECH\nSUGAR true\nEND');
  expect(document.querySelectorAll('[data-line="1"] .if-comparison-operands')).toHaveLength(2);
  expect(compileProgram(source(),7).compile_error).toBe('');
  await choose('Block 2 connector','OR');
  expect(source()).toContain('sugar IN CUSTOMER SPEECH OR negation NOT IN CUSTOMER SPEECH');
  await choose('Block 2 connector','Remove following condition');
  expect(source()).toBe('LISTEN\nIF sugar IN CUSTOMER SPEECH\nSUGAR true\nEND');
 });
 it('offers item only when editing a condition inside FOR', async () => {
  render(<Harness level={9} initial={'LISTEN\nIF coffee IN CUSTOMER SPEECH\nEND\nFOR item IN heard orders\nIF coffee IN item\nEND\nEND'}/>);
  await userEvent.click(screen.getByLabelText('Block 2 source'));
  expect(screen.getAllByRole('option').map(option=>option.textContent)).toEqual(['Orders']);
  await userEvent.keyboard('{Escape}');
  await userEvent.click(screen.getByLabelText('Block 5 source'));
  expect(screen.getAllByRole('option').map(option=>option.textContent)).toEqual(['Orders','item']);
 });
 it('edits quantity before the drink without a paper suffix',()=>{
  render(<Harness initial={'LISTEN\nTAKE UP\nITEM coffee'}/>);
  fireEvent.change(screen.getByLabelText('Block 3 quantity'),{target:{value:'2'}});
  expect(source()).toContain('ITEM 2 coffee');
  expect(document.querySelector('[data-line="2"]')?.textContent).not.toContain('on paper');
 });
 it('floats nested dropdowns outside block stacking contexts and keeps selection and dismissal working', async () => {
  const user=userEvent.setup();render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nITEM coffee\nEND'}/>);
  await user.click(screen.getByLabelText('Block 3 value'));
  const menu=screen.getByRole('listbox');
  expect(menu.parentElement).toBe(document.body);expect(menu.style.position).toBe('fixed');
  await user.click(within(menu).getByRole('option',{name:'Tea'}));
  expect(source()).toContain('ITEM tea');expect(screen.queryByRole('listbox')).toBeNull();
  await user.click(screen.getByLabelText('Block 3 value'));
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('listbox')).toBeNull();
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
 it('offers unlocked operands and all eight movement directions', async () => {
  render(<Harness role="prep" level={4} initial={'LISTEN\nIF tea\nMOVE RIGHT 1\nEND'}/>);
  await userEvent.click(screen.getByLabelText('Block 2 condition'));
  expect(screen.getAllByRole('option').map(e=>e.textContent)).toEqual(['Coffee','Tea','sugar']);
  await userEvent.keyboard('{Escape}');
  await userEvent.click(screen.getByLabelText('Block 3 direction'));
  expect(screen.getAllByRole('option')).toHaveLength(8);
  await userEvent.click(screen.getByRole('option',{name:'up left'}));
  expect(source()).toBe('LISTEN\nIF tea\nMOVE UP_LEFT 1\nEND');
 });
 it('locks editing during replay', async () => {
  render(<Harness locked/>);
  for(const button of screen.getAllByRole('button')) expect(button instanceof HTMLButtonElement ? button.disabled : button.getAttribute('aria-disabled') === 'true').toBe(true);
  for(const combo of screen.getAllByRole('combobox')) expect((combo as HTMLButtonElement).disabled).toBe(true);
  await userEvent.click(screen.getByRole('button',{name:'Insert TAKE UP'}));
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
 it('keeps long and numerous jump connections inside the reserved right gutter', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
   if (this.classList.contains('visual-program')) return DOMRect.fromRect({width:405,height:12000});
   return DOMRect.fromRect({x:80,y:Number(this.dataset.line ?? 0)*500,width:220,height:38});
  });
  render(<Harness initial={'POSITION listen\nLISTEN\n' + Array(20).fill('JUMP listen').join('\n')}/>);
  const paths = [...document.querySelectorAll('.jump-arrows > path')];
  expect(paths).toHaveLength(20);
  for (const path of paths) {
   const coordinates = path.getAttribute('d')!.split(' ');
   const bend = Number(coordinates[coordinates.indexOf('Q') + 1]);
   expect(bend).toBeGreaterThan(300);
   expect(bend).toBeLessThanOrEqual(405 - 8);
  }
 });
 it('draws saved jump connections on first mount and after returning from text mode', () => {
  const props={source:'POSITION listen\nLISTEN\nJUMP listen',onChange:vi.fn(),level:8,locked:false,observation:false};
  const {rerender,unmount}=render(<Editor {...props} textMode={false}/>);
  expect(document.querySelectorAll('.jump-arrows>path')).toHaveLength(1);
  const marker=document.querySelector('.jump-arrows marker')?.id;
  expect(marker).toMatch(/^jump-[a-zA-Z0-9_-]+$/);
  expect(document.querySelector('.jump-arrows>path')?.getAttribute('marker-end')).toBe(`url(#${marker})`);
  rerender(<Editor {...props} textMode/>);
  rerender(<Editor {...props} textMode={false}/>);
  expect(document.querySelectorAll('.jump-arrows>path')).toHaveLength(1);
  unmount();render(<Editor {...props} textMode={false}/>);
  expect(document.querySelectorAll('.jump-arrows>path')).toHaveLength(1);
  expect(props.onChange).not.toHaveBeenCalled();
 });
 it('previews a moved jump destination, updates its connector, and cancels without changing source', async () => {
  const initial = 'POSITION listen\nLISTEN\nITEM coffee\nJUMP listen';
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
   if (this.style.position === 'fixed') return DOMRect.fromRect({x:parseFloat(this.style.left) || 0,y:parseFloat(this.style.top) || 0,width:200,height:38});
   const slot = this.dataset.dropSlot;
   const projectionSlot = this.closest('.drop-projection')?.parentElement?.querySelector<HTMLElement>('[data-drop-slot]')?.dataset.dropSlot;
   const line = Number((projectionSlot ?? slot)?.split(':')[1] ?? this.dataset.line ?? 0);
   const top = 100 + line * 43;
   return DOMRect.fromRect(this.classList.contains('editor-body') || this.classList.contains('visual-program')
    ? {x:0,y:0,width:600,height:700} : {x:48,y:top,width:150,height:slot ? 0 : 38});
  });
  const user = userEvent.setup(); render(<Harness initial={initial}/>);
  const path = document.querySelector('.jump-arrows > path')?.getAttribute('d');
  screen.getByLabelText('Drag jump destination').focus();
  await user.keyboard(' {ArrowDown}{ArrowDown}');
  await waitFor(() => expect(document.querySelector('.drop-projection [data-target="listen"]')).toBeTruthy());
  expect(source()).toBe(initial);
  expect(document.querySelector('.floating-code-preview')?.textContent).toBe('');
  expect(document.querySelector('.drop-projection')?.textContent).toBe('');
  await waitFor(() => expect(document.querySelector('.jump-arrows > path')?.getAttribute('d')).not.toBe(path));
  await user.keyboard('{Escape}');
  expect(source()).toBe(initial);
  expect(document.querySelector('.drop-projection')).toBeNull();
 });
 it('previews a full nested branch inside Else and commits it there', async () => {
  const initial = 'IF tea IN CUSTOMER SPEECH\nTICKET\nEND\nIF coffee IN CUSTOMER SPEECH\nHELP\nEND';
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
   if (this.classList.contains('editor-body') || this.classList.contains('visual-program')) return DOMRect.fromRect({x:0,y:0,width:600,height:800});
   if (this.style.position === 'fixed') return DOMRect.fromRect({x:parseFloat(this.style.left) || 0,y:parseFloat(this.style.top) || 0,width:200,height:38});
   const slot = this.dataset.dropSlot;
   const line = Number(slot?.split(':')[1] ?? this.dataset.line ?? 0);
   return DOMRect.fromRect({x:48,y:slot === 'else:2' ? 270 : 100 + line * 80,width:200,height:slot ? 12 : 38});
  });
  vi.stubGlobal('PointerEvent', class extends MouseEvent { readonly isPrimary = true; readonly pointerId = 1; });
  render(<Harness initial={initial}/>);
  const tile = screen.getByLabelText('Drag block 3 and its group');
  fireEvent.pointerDown(tile, {button:0,buttons:1,clientX:60,clientY:355});
  fireEvent.pointerMove(document, {clientX:60,clientY:280});
  fireEvent.pointerMove(document, {clientX:60,clientY:276});
  await waitFor(() => expect(document.querySelector('[data-drop-slot="else:2"] .drop-projection .code-scope .scope-body')).toBeTruthy());
  expect(source()).toBe(initial);
  fireEvent.pointerUp(document);
  expect(source()).toBe('IF tea IN CUSTOMER SPEECH\nTICKET\nELSE\nIF coffee IN CUSTOMER SPEECH\nHELP\nEND\nEND');
  expect(document.querySelector('.else-body .scope-body .code-scope')).toBeTruthy();
  // dnd-kit briefly suppresses the click following a pointer drop.
  await new Promise(resolve => setTimeout(resolve, 60));
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
  render(<Editor source={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTICKET\nEND'} onChange={()=>{}} level={4} locked observation={false} textMode={false} activeLine={2} failureLine={1}/>);
  expect(document.querySelector('.block.active')?.getAttribute('data-line')).toBe('2');
  expect(document.querySelector('.block.failure')?.getAttribute('data-line')).toBe('1');
 });
});
describe('structural editing',()=>{
 it('deletes a complete nested IF when dragged out, leaving the surrounding routine intact',()=>{
  expect(removeVisualBlock('LISTEN\nIF tea IN CUSTOMER SPEECH\nIF sugar IN CUSTOMER SPEECH\nTICKET\nEND\nELSE\nHELP\nEND\nREPEAT',1)).toBe('LISTEN\nREPEAT');
 });
 it('deletes an ELSE body without deleting the enclosing IF delimiter',()=>{
  expect(removeVisualBlock('IF tea IN CUSTOMER SPEECH\nTICKET\nELSE\nIF sugar IN CUSTOMER SPEECH\nHELP\nEND\nEND',2)).toBe('IF tea IN CUSTOMER SPEECH\nTICKET\nEND');
 });
 it('removes ELSE when its final instruction is deleted',()=>{
  expect(removeVisualBlock('IF tea IN CUSTOMER SPEECH\nTICKET\nELSE\nHELP\nEND',3)).toBe('IF tea IN CUSTOMER SPEECH\nTICKET\nEND');
 });
 it('cleans up disconnected jump endpoints but preserves shared destinations',()=>{
  expect(removeVisualBlock('POSITION listen\nLISTEN\nJUMP listen',2)).toBe('LISTEN');
  expect(removeVisualBlock('POSITION listen\nLISTEN\nJUMP listen\nJUMP listen',2)).toBe('POSITION listen\nLISTEN\nJUMP listen');
  expect(removeVisualBlock('POSITION listen\nLISTEN\nJUMP listen',0)).toBe('LISTEN');
  expect(removeVisualBlock(' POSITION listen \nLISTEN\n JUMP listen ',2)).toBe('LISTEN');
 });
 it('only moves ELSE branches to another IF alternative slot',()=>{
  const code='IF tea IN CUSTOMER SPEECH\nTICKET\nELSE\nHELP\nEND\nIF coffee IN CUSTOMER SPEECH\nEND';
  expect(placeBlock(code,'ELSE',0,2)).toBe(code);
  expect(placeBlock(code,'ELSE',6,2,true)).toBe('IF tea IN CUSTOMER SPEECH\nTICKET\nEND\nIF coffee IN CUSTOMER SPEECH\nELSE\nHELP\nEND');
 });
 it('creates ELSE by dropping an instruction and removes it when emptied',()=>{
  const original='LISTEN\nIF tea IN CUSTOMER SPEECH\nTICKET\nEND';
  const withElse=placeBlock(original,'HELP',3,undefined,true);
  expect(withElse).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\nTICKET\nELSE\nHELP\nEND');
  expect(placeBlock(withElse,'HELP',6,4)).toBe(original+'\nHELP');
 });
 it('populates an existing empty ELSE without adding a second delimiter',()=>{
  expect(placeBlock('IF tea IN CUSTOMER SPEECH\nITEM coffee\nELSE\nEND','ITEM tea',3)).toBe('IF tea IN CUSTOMER SPEECH\nITEM coffee\nELSE\nITEM tea\nEND');
 });
 it('can move the final true-branch instruction into its else branch',()=>{
  expect(placeBlock('IF tea IN CUSTOMER SPEECH\nTICKET\nEND','TICKET',2,1,true)).toBe('IF tea IN CUSTOMER SPEECH\nELSE\nTICKET\nEND');
 });
 it('moves complete nested scopes and prevents dropping them inside themselves',()=>{
  const code='LISTEN\nIF tea IN CUSTOMER SPEECH\nFOR item IN heard orders\nTICKET\nEND\nEND\nHELP';
  expect(placeBlock(code,'IF tea IN CUSTOMER SPEECH',4,1)).toBe(code);
  expect(placeBlock(code,'IF tea IN CUSTOMER SPEECH',7,1)).toBe('LISTEN\nHELP\nIF tea IN CUSTOMER SPEECH\nFOR item IN heard orders\nTICKET\nEND\nEND');
 });
 it('gives independent jumps independent movable targets',()=>{
  const code=placeBlock('POSITION listen\nLISTEN\nJUMP listen','JUMP listen',3);
  expect(code).toContain('POSITION jump_1');
  expect(code).toContain('JUMP jump_1');
  expect(compileProgram(code).compile_error).toBe('');
  expect(placeBlock('POSITION listen\nLISTEN\nTICKET\nJUMP listen','POSITION listen',2,0)).toBe('LISTEN\nPOSITION listen\nTICKET\nJUMP listen');
 });
 it('keeps empty alternatives invisible and resolves nested ELSE correctly',()=>{
  const tree=visualProgram('IF tea IN CUSTOMER SPEECH\nIF coffee IN CUSTOMER SPEECH\nHELP\nELSE\nTICKET\nEND\nELSE\nEND');
  expect(tree[0].alternative).toEqual([]);
  expect(tree[0].children?.[0].alternative?.[0].command).toBe('TICKET');
 });
});
describe('minimal coding pane header',()=>{
 it('shows all robots and enables each at its unlock shift',async()=>{
  const props={shift:'A little sugar',objective:'Make the requested drinks.',role:'query' as const,onRole:vi.fn()};
  const {rerender}=render(<CodingPaneHeader {...props} level={14}/>);
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  expect(screen.getAllByText('Locked')).toHaveLength(1);
  expect(screen.getByRole('tab',{name:'Brew'}).getAttribute('aria-describedby')).toBe(screen.getByRole('tab',{name:'Porter'}).getAttribute('aria-describedby'));
  expect(screen.getByRole('tab',{name:'Brew'}).hasAttribute('disabled')).toBe(true);
  await userEvent.click(screen.getByRole('tab',{name:'Brew'}));
  expect(props.onRole).not.toHaveBeenCalled();
  rerender(<CodingPaneHeader {...props} level={15}/>);
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  expect(screen.getByRole('tab',{name:'Porter'}).hasAttribute('disabled')).toBe(true);
  await userEvent.click(screen.getAllByRole('tab')[1]);
  expect(props.onRole).toHaveBeenCalledWith('prep');
 });
});

it('renders a single assignment with two selectors and uses fixed variables in Write',async()=>{
 render(<Harness level={10} initial={'LISTEN\nTAKE UP\nITEM 2 coffee\nSTORE var1 FROM number\nITEM coffee'}/>);
 await choose('Block 4 variable','Var B');
 await choose('Block 4 source','3');
 expect(source()).toContain('STORE var2 FROM 3');
 const assignment=document.querySelector('[data-line="3"] .assignment-operands')!;
 expect(within(assignment as HTMLElement).getAllByRole('combobox')).toHaveLength(2);
 expect(assignment.querySelector('.assignment-equals')?.textContent).toBe('=');
 expect(screen.queryByRole('textbox',{name:'Block 4 variable'})).toBeNull();
 await choose('Block 4 source','Number in item');
 await choose('Block 5 value','Sugar');
 await choose('Block 5 quantity','Var B');
 expect(source()).toContain('ITEM 2 coffee\nSTORE var2 FROM number\nWRITE var2 sugar');
 expect(compileProgram(source(),10).compile_error).toBe('');
});

it('extends longer jumps farther right than short jumps',()=>{
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  const line=Number(this.dataset.line??0);
  return DOMRect.fromRect(this.classList.contains('visual-program')?{x:0,y:0,width:600,height:800}:{x:64,y:line*40,width:84,height:35});
 });
 render(<Harness initial={'POSITION listen\nJUMP listen\nITEM coffee\nITEM coffee\nITEM coffee\nJUMP listen'}/>);
 const bends=[...document.querySelectorAll('.jump-arrows>path')].map(path=>Number(path.getAttribute('d')!.split('Q')[1].trim().split(' ')[0]));
 expect(bends).toHaveLength(2);
 expect(bends[1]-bends[0]).toBeGreaterThan(40);
});
it('uses semantic color families and an icon for the current item',()=>{
 render(<Harness level={10} initial={'LISTEN\nTAKE UP\nITEM coffee\nSTORE var1 FROM number\nMOVE RIGHT 1\nDEPOSIT RIGHT\nFOR item IN heard orders\nIF tea IN item\nEND\nEND'}/>);
 expect(document.querySelector('[data-line="0"].data')).toBeTruthy();
 expect(document.querySelector('[data-line="1"].motion')).toBeTruthy();
 expect(document.querySelector('[data-line="3"].function')).toBeTruthy();
 expect(document.querySelector('[data-line="4"].motion')).toBeTruthy();
 expect(document.querySelector('[data-line="6"].flow')).toBeTruthy();
 expect(screen.getByLabelText('Block 8 source').querySelector('.operand-icon')).toBeTruthy();
});

it('keeps jump endpoints attached while the final layout animation settles',()=>{
 const frames=new Map<number,FrameRequestCallback>();let id=0,offset=0;
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++id,callback);return id;});
 vi.stubGlobal('cancelAnimationFrame',(frame:number)=>frames.delete(frame));
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  if(this.classList.contains('visual-program'))return DOMRect.fromRect({width:600,height:800});
  const line=Number(this.dataset.line??0);
  return DOMRect.fromRect({x:64,y:line*40+offset,width:84,height:35});
 });
 const props={onChange:vi.fn(),level:8,locked:false,observation:false,textMode:false};
 const {rerender}=render(<Editor {...props} source={'POSITION listen\nLISTEN\nJUMP listen'}/>);
 rerender(<Editor {...props} source={'POSITION listen\nLISTEN\nITEM coffee\nJUMP listen'}/>);
 const path=()=>document.querySelector('.jump-arrows>path')!.getAttribute('d')!;
 const before=path();
 offset=45;
 act(()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(performance.now()));});
 expect(path()).not.toBe(before);
 expect(path()).toMatch(/^M 151 182.5 /);
 expect(path()).toContain('62.5 H 153');
});
it('places the Store icon and label inside the variable tile in both shop and program',()=>{
 render(<Harness level={10} initial={'LISTEN\nSTORE var1 FROM number'}/>);
 const shop=screen.getByRole('button',{name:'Insert STORE var1 FROM number'});
 expect(shop.querySelector('.lucide-save')).toBeTruthy();
 expect(shop.textContent).toBe('Store :');
 expect(shop.closest('.assignment-tile')?.querySelector('[role=combobox]')).toBeTruthy();
 const tile=document.querySelector('[data-line="1"] .assignment-tile')!;
 expect(tile.querySelector('.store-label .lucide-save')).toBeTruthy();
 expect(tile.querySelector('.store-label')?.textContent).toBe('Store :');
 expect(tile.querySelector('[role=combobox]')?.getAttribute('aria-label')).toBe('Block 2 variable');
 expect(document.querySelectorAll('[data-line="1"] .lucide-save')).toHaveLength(1);
});
