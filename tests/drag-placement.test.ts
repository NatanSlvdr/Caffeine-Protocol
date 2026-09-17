import { describe, expect, it } from 'vitest';
import { keyboardDropSlot, pickDropSlot } from '../src/domain/dragPlacement';
import type { DropSlot } from '../src/domain/dragPlacement';
import { placeBlock } from '../src/domain/visualProgram';

const slot = (at: number, y: number, left=48, alternative=false): DropSlot => ({id:(alternative?'else:':'gap:')+at,at,left,top:y-6,height:12,alternative});
describe('stable insertion-based dragging',()=>{
 it('moves below a row from its lower half, instead of always inserting before it',()=>{
  const slots=[slot(0,0),slot(1,51),slot(2,102),slot(3,153)];
  const drag={from:0,end:0,command:'TICKET'};
  const above=pickDropSlot({x:48,y:57},slots,drag);
  const below=pickDropSlot({x:48,y:96},slots,drag);
  expect(above?.at).toBe(1);expect(below?.at).toBe(2);
  expect(placeBlock('TICKET\nITEM coffee\nSUBMIT','TICKET',below!.at,0)).toBe('ITEM coffee\nTICKET\nSUBMIT');
 });
 it('moves up and appends at the bottom with the same insertion semantics',()=>{
  const slots=[slot(0,0),slot(1,51),slot(2,102),slot(3,153)];
  expect(pickDropSlot({x:48,y:-10},slots,{from:2,end:2,command:'SUBMIT'})?.at).toBe(0);
  expect(pickDropSlot({x:48,y:230},slots,{from:0,end:0,command:'TICKET'})?.at).toBe(3);
  expect(placeBlock('TICKET\nITEM coffee\nSUBMIT','TICKET',3,0)).toBe('ITEM coffee\nSUBMIT\nTICKET');
 });
 it('keeps the highlighted slot stable near a midpoint, then switches decisively',()=>{
  const slots=[slot(1,50),slot(2,100)];
  expect(pickDropSlot({x:48,y:76},slots,undefined,'gap:1')?.at).toBe(1);
  expect(pickDropSlot({x:48,y:80},slots,undefined,'gap:1')?.at).toBe(2);
  expect(pickDropSlot({x:48,y:74},slots,undefined,'gap:2')?.at).toBe(2);
 });
 it('uses horizontal intent to distinguish inside a branch from after the entire branch',()=>{
  const slots=[slot(3,100,90),slot(4,100,48)];
  expect(pickDropSlot({x:90,y:100},slots)?.at).toBe(3);
  expect(pickDropSlot({x:48,y:100},slots)?.at).toBe(4);
 });
 it('never targets the interior of the scope being dragged',()=>{
  const slots=[slot(1,0),slot(2,50),slot(3,100),slot(4,150),slot(5,200)];
  const drag={from:1,end:4,command:'IF tea'};
  expect(pickDropSlot({x:48,y:100},slots,drag)?.at).toBe(1);
  expect(pickDropSlot({x:48,y:175},slots,drag)?.at).toBe(5);
 });
 it('routes ELSE only to another conditional alternative and handles no valid target',()=>{
  const drag={from:2,end:3,command:'ELSE'};
  expect(pickDropSlot({x:48,y:50},[slot(0,0),slot(6,100,200,true)],drag)?.id).toBe('else:6');
  expect(pickDropSlot({x:48,y:50},[slot(0,0)],drag)).toBeUndefined();
  expect(pickDropSlot({x:48,y:50},[])).toBeUndefined();
 });
 it('supports one-slot keyboard movement and horizontal branch selection',()=>{
  const slots=[slot(0,0),slot(1,51),slot(2,102,90),slot(3,102,48)];
  expect(keyboardDropSlot('ArrowDown',{x:48,y:0},slots)?.at).toBe(1);
  expect(keyboardDropSlot('ArrowUp',{x:48,y:102},slots)?.at).toBe(1);
  expect(keyboardDropSlot('ArrowRight',{x:48,y:102},slots)?.at).toBe(2);
  expect(keyboardDropSlot('ArrowLeft',{x:90,y:102},slots)?.at).toBe(3);
 });
});

it('keeps a stationary pointer on its target when preview layout shifts the slots',()=>{
 const pointer={x:48,y:100};
 const before=[slot(1,50),slot(2,100),slot(3,150)];
 const chosen=pickDropSlot(pointer,before);
 expect(chosen?.id).toBe('gap:2');
 const reflowed=[slot(1,100),slot(2,150),slot(3,200)];
 expect(pickDropSlot(pointer,reflowed,undefined,chosen?.id,pointer)?.id).toBe('gap:2');
 expect(pickDropSlot({x:49,y:101},reflowed,undefined,chosen?.id,pointer)?.id).toBe('gap:2');
 expect(pickDropSlot({x:48,y:195},reflowed,undefined,chosen?.id,pointer)?.id).toBe('gap:3');
});
it('does not keep a now-invalid target after reflow',()=>{
 const point={x:48,y:100};
 expect(pickDropSlot(point,[slot(1,50),slot(2,100),slot(3,150)],{from:0,end:2,command:'IF tea'},'gap:2',point)?.id).toBe('gap:3');
});
