import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '../src/components/Editor';
import { FailureImpact, explainFailure } from '../src/components/FailureFeedback';
import { CodingPaneHeader } from '../src/components/CodingPaneHeader';
import { shiftBriefs } from '../src/data/shiftBriefs';
import { levels } from '../src/data';

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const editor={source:'LISTEN\nTICKET\nITEM coffee',onChange:()=>{},level:4,locked:true,observation:false,textMode:false};
describe('clear execution feedback',()=>{
 it('puts a labelled execution marker inside the active instruction, separate from the number',()=>{
  render(<Editor {...editor} activeLine={2}/>);
  const active=document.querySelector('[aria-current="step"]')!;
  expect(within(active as HTMLElement).getByText('Running')).toBeTruthy();
  expect(active.querySelector('.line-number')).toBeNull();
  expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
 });
 it('anchors actionable errors beneath the failing block and allows returning to edit',async()=>{
  const onEdit=vi.fn(),message=explainFailure('Wrong item on ticket 1: expected tea, got coffee.');
  render(<Editor {...editor} failureLine={2} failureMessage={message} onEdit={onEdit}/>);
  const error=screen.getByRole('alert');
  expect(error.closest('.code-row')?.querySelector('.block.failure')?.getAttribute('data-line')).toBe('2');
  expect(error.textContent).toContain('This guest asked for tea');
  expect(error.textContent).toContain('Check the If condition');
  await userEvent.click(within(error).getByRole('button',{name:'Edit program'}));
  expect(onEdit).toHaveBeenCalledOnce();
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
  expect(document.querySelectorAll('.code-row .block-verb.block-suffix')).toHaveLength(2);
 });
 it('plays one brief screen impact and cancels it on unmount',()=>{
  const cancel=vi.fn(),animate=vi.fn(()=>({cancel}));
  Object.defineProperty(Element.prototype,'animate',{configurable:true,value:animate});
  const {unmount}=render(<div><FailureImpact reduced={false}/></div>);
  expect(animate).toHaveBeenCalledOnce();
  expect(animate.mock.calls[0]?.length).toBe(2);
  unmount();expect(cancel).toHaveBeenCalledOnce();
  delete (Element.prototype as Partial<Element>).animate;
 });
 it('honors both reduced-motion settings without losing static error feedback',()=>{
  const animate=vi.fn();
  Object.defineProperty(Element.prototype,'animate',{configurable:true,value:animate});
  const {rerender}=render(<div><FailureImpact reduced/></div>);
  expect(animate).not.toHaveBeenCalled();
  vi.stubGlobal('matchMedia',()=>({matches:true}));
  rerender(<div><FailureImpact reduced={false}/></div>);
  expect(animate).not.toHaveBeenCalled();
  delete (Element.prototype as Partial<Element>).animate;
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
