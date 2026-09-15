import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { newSave, SAVE_KEY } from '../src/domain/persistence';
import { lessons } from '../src/data';

vi.mock('../src/components/Cafe',()=>({Cafe:({serviceView}:{serviceView?:boolean})=><div data-testid="cafe" data-service-view={serviceView}/> }));
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
 it('reveals an error only when reached, and keeps its animation until the failing line is clicked',()=>{
  open('LISTEN\nITEM coffee');
  expect([...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))).toBeUndefined();
  for(let i=0;i<30&&![...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'));i++)act(()=>{vi.advanceTimersByTime(1000);});
  expect([...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))?.getAttribute('data-line')).toBe('1');
  expect(screen.getByRole('alert').textContent).toContain('Careful, an error here.');
  expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('false');
  expect(screen.getByRole('button',{name:/Run service/})).toBeTruthy();
  expect(screen.getByRole('combobox',{name:'Block 2 value'}).hasAttribute('disabled')).toBe(false);
  fireEvent.click(document.body);
  fireEvent.keyDown(document.body,{key:'Shift'});
  const failed=[...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))!;
  expect(failed).toBeTruthy();
  act(()=>{vi.advanceTimersByTime(5000);});
  expect(failed.classList.contains('failure')).toBe(true);
  fireEvent.click(failed);
  expect([...document.querySelectorAll('[data-line]')].find(e=>e.classList.contains('failure'))).toBeUndefined();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(savedStars()['2']).toBeUndefined();
 });
});
