import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '../src/components/Editor';
import { CodingPaneHeader } from '../src/components/CodingPaneHeader';
import { shiftBriefs } from '../src/data/shiftBriefs';
import { levels } from '../src/data';

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const editor={source:'LISTEN\nTICKET\nITEM coffee',onChange:()=>{},level:4,locked:true,observation:false,textMode:false};
describe('clear execution feedback',()=>{
 it('keeps the same moving cursor and adapts its travel time to playback speed',()=>{
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
   if(this.classList.contains('editor-body')) return DOMRect.fromRect({x:60,y:0,width:400,height:600});
   const line=this.getAttribute('data-line');
   return DOMRect.fromRect({x:0,y:line===null?0:100+Number(line)*50,width:200,height:30});
  });
  const {rerender}=render(<Editor {...editor} activeLine={0}/>);
  const cursor=screen.getByRole('img',{name:'Current instruction'});
  expect(cursor.parentElement).toBe(document.querySelector('.visual-program'));
  expect(cursor.style.transform).toContain('-16px, 99px');
  expect(document.querySelector('[data-line="0"]')?.parentElement?.querySelector('.line-number')?.textContent).toBe('01');
  rerender(<Editor {...editor} activeLine={2}/>);
  expect(screen.getByRole('img',{name:'Current instruction'})).toBe(cursor);
  expect(cursor.style.transform).toContain('-16px, 199px');
  expect(cursor.style.transitionDuration).toBe('180ms');
  rerender(<Editor {...editor} activeLine={1} stepSeconds={.125}/>);
  expect(cursor.style.transform).toContain('-16px, 149px');
  expect(cursor.style.transitionDuration).toBe('25ms');
});
 it('moves from the jump instruction to its destination at the playback midpoint',()=>{
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
   if(this.classList.contains('editor-body')) return DOMRect.fromRect({x:60,y:0,width:400,height:600});
   if(this.classList.contains('visual-program')) return DOMRect.fromRect({width:400,height:600});
   return DOMRect.fromRect({x:100,y:100+Number(this.dataset.line ?? 0)*50,width:84,height:30});
  });
  const props={...editor,source:'POSITION listen\nLISTEN\nJUMP listen',level:8,activeLine:2};
  const {rerender}=render(<Editor {...props} instructionProgress={.49}/>);
  const cursor=screen.getByRole('img',{name:'Current instruction'});
  expect(cursor.style.transform).toContain('-16px, 199px');
  rerender(<Editor {...props} instructionProgress={.5}/>);
  expect(cursor.style.transform).toContain('-16px, 99px');
  expect(document.querySelector('[data-line="2"]')?.getAttribute('aria-current')).toBe('step');
  rerender(<Editor {...props} instructionProgress={.5} stepSeconds={.125}/>);
  expect(cursor.style.transform).toContain('-16px, 99px');
 });
 it('scrolls in the same coordinate space as the blocks without repositioning',()=>{
  let scroll = 0;
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
   if(this.classList.contains('editor-body')) return DOMRect.fromRect({x:60,y:0,width:400,height:600});
   if(this.classList.contains('visual-program')) return DOMRect.fromRect({y:-scroll,width:400,height:600});
   return DOMRect.fromRect({x:100,y:100+Number(this.dataset.line ?? 0)*50-scroll,width:84,height:30});
  });
  const {rerender}=render(<Editor {...editor} activeLine={0}/>);
  const cursor=screen.getByRole('img',{name:'Current instruction'});
  const transform=cursor.style.transform;
  scroll=40;
  fireEvent.scroll(screen.getByLabelText('Code zone'));
  expect(cursor.style.transform).toBe(transform);
  expect(cursor.parentElement?.closest('.editor-body')).toBe(screen.getByLabelText('Code zone'));
  rerender(<Editor {...editor} activeLine={1}/>);
  expect(cursor.style.transitionDuration).toBe('180ms');
 });
 it('keeps the shared highlight animated through resize observer notifications',()=>{
  const callbacks: Array<(entries: ResizeObserverEntry[]) => void> = [];
  vi.stubGlobal('ResizeObserver', class {
   constructor(callback: (entries: ResizeObserverEntry[]) => void) { callbacks.push(callback); }
   observe() {} disconnect() {} unobserve() {}
  });
  const {rerender}=render(<Editor {...editor} activeLine={0}/>);
  const cursor=screen.getByRole('img',{name:'Current instruction'});
  const highlight=cursor.querySelector('.execution-line-highlight');
  expect(highlight).toBeTruthy();
  rerender(<Editor {...editor} activeLine={2}/>);
  act(()=>callbacks.forEach(callback=>callback([])));
  expect(cursor.style.transitionDuration).toBe('180ms');
  expect(cursor.querySelector('.execution-line-highlight')).toBe(highlight);
 });
 it('keeps the marker and highlight visible on hidden END instructions',()=>{
  const props={...editor,source:'LISTEN\nIF coffee\nITEM coffee\nEND'};
  const {rerender}=render(<Editor {...props} activeLine={2}/>);
  const cursor=screen.getByRole('img',{name:'Current instruction'});
  rerender(<Editor {...props} activeLine={3}/>);
  expect(screen.getByRole('img',{name:'Current instruction'})).toBe(cursor);
  expect(cursor.querySelector('.execution-line-highlight')).toBeTruthy();
 });
 it('hides the cursor when its instruction no longer has a visible row',()=>{
  const {rerender}=render(<Editor {...editor} activeLine={0}/>);
  expect(screen.getByRole('img',{name:'Current instruction'})).toBeTruthy();
  rerender(<Editor {...editor} activeLine={99}/>);
  expect(screen.queryByRole('img',{name:'Current instruction'})).toBeNull();
 });
 it('marks the full failing block and places the warning outside the code pane',()=>{
  render(<Editor {...editor} failureLine={2} failureMessage="Careful, an error here."/>);
  expect(document.querySelector('.block.failure')?.getAttribute('data-line')).toBe('2');
  expect(document.querySelector('.block.failure')?.parentElement?.querySelector('.line-number')?.textContent).toBe('03');
  const error=screen.getByRole('alert');
  expect(error.parentElement).toBe(document.body);
  expect(error.textContent).toContain('Careful, an error here.');
 });
 it('keeps compile errors visible in empty code and text mode',()=>{
  const {rerender}=render(<Editor {...editor} source="" failureLine={0} failureMessage="Add an instruction."/>);
  expect(screen.getByRole('alert').textContent).toContain('Add an instruction.');
  rerender(<Editor {...editor} textMode failureLine={1} failureMessage="Invalid instruction."/>);
  expect(screen.getAllByRole('alert')).toHaveLength(1);
 });
 it('anchors errors on hidden delimiters to a visible nearby block',()=>{
  render(<Editor {...editor} source={'LISTEN\nIF tea\nTICKET\nEND'} failureLine={3} failureMessage="Check this branch."/>);
  expect(document.querySelector('.block.failure')?.getAttribute('data-line')).toBe('2');
  expect(screen.getByRole('alert')).toBeTruthy();
 });
 it('uses the same type class for leading verbs and trailing words',()=>{
  render(<Editor {...editor} source={'ITEM coffee\nMOVE RIGHT 1'}/>);
  expect(document.querySelectorAll('.code-row .block-verb.block-suffix')).toHaveLength(1);
 });

});
describe('story-led, compact shift header',()=>{
 it('places compact help and options beside the title, with story before goal',async()=>{
  const onHelp=vi.fn(),onOptions=vi.fn(),brief=shiftBriefs[3];
  render(<CodingPaneHeader shift="Coffee or Tea?" story={brief.story} objective={brief.objective} role="query" level={4} onRole={()=>{}} onHelp={onHelp} onOptions={onOptions}/>);
  const title=screen.getByRole('heading',{name:'Coffee or Tea?'}).parentElement!;
  await userEvent.click(within(title).getByRole('button',{name:'Help'}));
  await userEvent.click(within(title).getByRole('button',{name:'Options'}));
  expect(onHelp).toHaveBeenCalledOnce();expect(onOptions).toHaveBeenCalledOnce();
  expect(screen.getByText(brief.story).compareDocumentPosition(screen.getByText('Your goal')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(brief.story).toContain('Tea has joined the menu');
 });
 it('gives every shift a story and a concrete goal',()=>{
  expect(shiftBriefs).toHaveLength(levels.length);
  for(const brief of shiftBriefs){expect(brief.story.length).toBeGreaterThan(40);expect(brief.objective.length).toBeGreaterThan(40);}
 });
});
