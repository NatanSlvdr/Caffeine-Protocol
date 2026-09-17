import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { newSave, SAVE_KEY } from '../src/features/campaign/save/persistence';
import { lessons } from '../src/data';

vi.mock('../src/components/Cafe',()=>({Cafe:({serviceView,focusRole}:{serviceView?:boolean;focusRole?:string})=><div data-testid="cafe" data-service-view={serviceView} data-focus-role={focusRole}/> }));
vi.mock('../src/audio',()=>({configureAudio:vi.fn(),playSound:vi.fn(),startAudio:vi.fn()}));
beforeEach(()=>{
 vi.useFakeTimers();localStorage.clear();window.location.hash='/shift/3';
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
afterEach(()=>{cleanup();vi.useRealTimers();localStorage.clear();});
function open(source=lessons[2].solution){
 const save=newSave();save.unlocked=2;save.selected=2;save.robotDrafts[2]={query:source,prep:'',floor:''};
 localStorage.setItem(SAVE_KEY,JSON.stringify(save));render(<App/>);
 fireEvent.click(screen.getByRole('button',{name:/Run service/}));
}
function savedStars(){return JSON.parse(localStorage.getItem(SAVE_KEY)!).stars;}
describe('live workspace lifecycle',()=>{
 it('focuses the scene on the robot selected for editing',()=>{
  const save=newSave();save.unlocked=22;save.selected=22;
  window.location.hash='/shift/23';
  localStorage.setItem(SAVE_KEY,JSON.stringify(save));render(<App/>);
  expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('floor');
  fireEvent.click(screen.getByRole('tab',{name:'Query'}));
  expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('query');
  fireEvent.click(screen.getByRole('tab',{name:'Brew'}));
  expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('prep');
  fireEvent.click(screen.getByRole('tab',{name:'Porter'}));
  expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('floor');
  fireEvent.click(screen.getByRole('button',{name:'Full café'}));
  expect(screen.getByTestId('cafe').hasAttribute('data-focus-role')).toBe(false);
  fireEvent.click(screen.getByRole('tab',{name:'Query'}));
  expect(screen.getByTestId('cafe').hasAttribute('data-focus-role')).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'Query’s counter'}));
  expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('query');
  fireEvent.click(screen.getByRole('button',{name:'Brew’s kitchen'}));
  expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('prep');
  expect(screen.getByRole('tab',{name:'Brew'}).getAttribute('aria-selected')).toBe('true');
 });
 it('shows locked robot areas and code tabs before their unlock shifts',()=>{
  const save=newSave();save.unlocked=2;save.selected=2;
  localStorage.setItem(SAVE_KEY,JSON.stringify(save));render(<App/>);
  for(const name of ['Brew’s kitchen','Porter’s dining room']){
   const button=screen.getByRole('button',{name});
   expect(button.hasAttribute('disabled')).toBe(true);
   const notice=document.getElementById(button.getAttribute('aria-describedby')!);
   expect(notice?.textContent).toBe('Locked');
   expect(notice?.querySelector('.lucide-lock-keyhole')).toBeTruthy();
  }
  for(const name of ['Brew','Porter']){
   const tab=screen.getByRole('tab',{name});
   expect(tab.hasAttribute('disabled')).toBe(true);
   const notice=document.getElementById(tab.getAttribute('aria-describedby')!);
   expect(notice?.textContent).toBe('Locked');
   expect(notice?.querySelector('.lucide-lock-keyhole')).toBeTruthy();
  }
  expect(screen.getByRole('tab',{name:'Query'}).hasAttribute('disabled')).toBe(false);
 });
 it('awards progress and opens the receipt only after the live service finishes',()=>{
  open();expect(savedStars()['2']).toBeUndefined();
  expect(screen.queryByText('Service complete')).toBeNull();
  expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('true');
  fireEvent.change(screen.getByLabelText('Playback speed'),{target:{value:'12'}});
  for(let i=0;i<120&&!screen.queryByText('Service complete');i++)act(()=>{vi.advanceTimersByTime(1000);});
  expect(screen.getByText('Service complete')).toBeTruthy();
  expect(savedStars()['2']).toBeGreaterThan(0);
  expect(screen.getByRole('button',{name:/Next shift/})).toBeTruthy();
 });
 it('pauses without advancing and cancels an unfinished run without awarding progress',()=>{
  open();act(()=>{vi.advanceTimersByTime(4000);});
  fireEvent.click(screen.getByRole('button',{name:'Pause playback'}));
  act(()=>{vi.advanceTimersByTime(120000);});
  expect(savedStars()['2']).toBeUndefined();
  fireEvent.click(screen.getByRole('button',{name:/Stop & edit/}));
  expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('false');
  act(()=>{vi.advanceTimersByTime(120000);});
  expect(savedStars()['2']).toBeUndefined();
 });
 it('freezes the error cursor and keeps editing locked until service is stopped',()=>{
  open('LISTEN\nITEM coffee');
  expect([...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))).toBeUndefined();
  for(let i=0;i<30&&![...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'));i++)act(()=>{vi.advanceTimersByTime(1000);});
  expect([...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))?.getAttribute('data-line')).toBe('1');
  expect(screen.getByRole('alert').textContent).toContain('Take the order paper');
  expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('true');
  expect(screen.getByRole('button',{name:/Stop & edit/})).toBeTruthy();
  expect(screen.getByRole('combobox',{name:'Block 2 value'}).hasAttribute('disabled')).toBe(true);
  fireEvent.click(document.body);
  fireEvent.keyDown(document.body,{key:'Shift'});
  const failed=[...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))!;
  expect(failed).toBeTruthy();
  act(()=>{vi.advanceTimersByTime(5000);});
  expect(failed.classList.contains('failure')).toBe(true);
  fireEvent.click(failed);
  expect(failed.classList.contains('failure')).toBe(true);
  expect(screen.getByRole('img',{name:'Current instruction'}).querySelector('.execution-line-highlight')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Stop & edit/}));
  expect([...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))).toBeUndefined();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(savedStars()['2']).toBeUndefined();
 });
});
