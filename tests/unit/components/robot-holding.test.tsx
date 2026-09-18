import { afterEach, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { RobotHolding } from '../../../src/components/RobotHolding';
import type { Cargo } from '../../../src/domain/types';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('hides empty hands and shows accessible cargo icons',()=>{
 const cargo:Cargo={ticketId:'one',table:2,item:'coffee',stage:'beans',sugar:0};
 const {rerender}=render(<RobotHolding name="Brew" inventory={[]}/>);
 expect(screen.queryByLabelText('Brew is holding')).toBeNull();
 rerender(<RobotHolding name="Brew" inventory={[cargo]}/>);
 expect(screen.getByLabelText('Coffee beans · Table 2').querySelector('svg')).toBeTruthy();
 rerender(<RobotHolding name="Brew" inventory={[{...cargo,stage:'brewed',sugar:2}]}/>);
 expect(screen.getByLabelText('Coffee · 2 sugar · Table 2').querySelector('.model-coffee')).toBeTruthy();
 rerender(<RobotHolding name="Brew" inventory={[{...cargo,item:'tea',stage:'brewed'}]}/>);
 expect(screen.getByLabelText('Tea · No sugar · Table 2').querySelector('.model-tea')).toBeTruthy();
 rerender(<RobotHolding name="Porter" inventory={[{...cargo,stage:'dirty'}]}/>);
 expect(screen.getByLabelText('Dirty cup · Table 2').querySelector('svg')).toBeTruthy();
});

it('shows an in-flight action even before paper is picked up, and supports paused feedback',()=>{
 const {rerender}=render(<RobotHolding name="Query" inventory={[]} action={{command:'TAKE UP',start:0,progress:.4}} paused/>);
 expect(screen.getByLabelText('Query: Take')).toBeTruthy();
 expect(screen.getByLabelText('Query is holding').style.animationPlayState).toBe('paused');
 expect(document.querySelector('.robot-action .lucide-hand')).toBeTruthy();
 rerender(<RobotHolding name="Query" inventory={[]} action={{command:'STORE var1 FROM number',start:1,progress:.5}} reduced/>);
 expect(screen.getByText('Store Var A in memory')).toBeTruthy();
 expect(screen.queryByLabelText('Query memory')).toBeNull();
 rerender(<RobotHolding name="Query" inventory={[]} variables={{var1:2}}/>);
 expect(screen.getByLabelText('Query memory').textContent).toContain('Var A = 2');
});

it.each(['BREW', 'GRIND'])('does not animate %s as a robot action', command=>{
 const {rerender}=render(<RobotHolding name="Query" inventory={[]} action={{command,start:0,progress:.5}}/>);
 expect(screen.queryByLabelText('Query is holding')).toBeNull();
 rerender(<RobotHolding name="Query" inventory={[]} variables={{var1:2}} action={{command,start:0,progress:.5}}/>);
 expect(document.querySelector('.robot-action')).toBeNull();
 expect(screen.getByLabelText('Query memory')).toBeTruthy();
});

it.each(['LISTEN', 'WAIT TICKET', 'TAKE UP', 'DEPOSIT DOWN', 'ITEM coffee', 'WRITE 2 sugar', 'STORE var1 FROM number', 'MOVE LEFT', 'TICKET', 'SUBMIT', 'PICKUP'])('shows %s as a robot action', command=>{
 render(<RobotHolding name="Query" inventory={[]} action={{command,start:0,progress:.5}}/>);
 expect(document.querySelector('.robot-action')).toBeTruthy();
});

it('shows action, inventory with sugar cubes, and compact memory in order',()=>{
 render(<RobotHolding name="Brew" action={{command:'DEPOSIT UP',start:0,progress:.5}} inventory={[{ticketId:'one',table:2,item:'coffee',stage:'brewed',sugar:2}]} variables={{var1:2}}/>);
 const bubble=screen.getByLabelText('Brew is holding');
 expect(Array.from(bubble.querySelector('.robot-holding-content')!.children).map(child=>child.className || child.tagName)).toEqual(['robot-action','UL','robot-memory']);
 expect(screen.getByLabelText('Brew inventory').querySelector('.holding-sugar .model-sugar')).toBeTruthy();
});

it.each(['IF coffee', 'FOR EACH order', 'JUMP 1', 'CALL routine', 'READ ticket'])('shows two thinking gears for %s', command=>{
 render(<RobotHolding name="Query" inventory={[]} action={{command,start:0,progress:.5}}/>);
 expect(screen.getByText('Thinking')).toBeTruthy();
 expect(document.querySelectorAll('.thinking-gear.lucide-settings')).toHaveLength(2);
 expect(document.querySelector('.robot-action-icon')?.getAttribute('style')).toBeNull();
});

it('animates bubble height without changing its width or remounting the shell',()=>{
 let bounds={width:80,height:90};
 let resize: (()=>void) | undefined;
 const disconnect=vi.fn();
 vi.spyOn(HTMLElement.prototype,'offsetHeight','get').mockImplementation(()=>bounds.height);
 // Camera transforms affect screen bounds, but must not feed back into bubble layout.
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(()=>DOMRect.fromRect({width:bounds.width / 2,height:bounds.height / 2}));
 vi.stubGlobal('ResizeObserver',class {
  constructor(callback:()=>void){resize=callback;}
  observe(){}
  disconnect=disconnect;
 });
 const {rerender,unmount}=render(<RobotHolding name="Query" inventory={[]} action={{command:'LISTEN',start:0,progress:.5}}/>);
 const bubble=screen.getByLabelText('Query is holding');
 expect(bubble.style.width).toBe('');
 expect(bubble.style.height).toBe('100px');
 bounds={width:150,height:140};
 rerender(<RobotHolding name="Query" inventory={[]} action={{command:'STORE var1 FROM number',start:1,progress:.5}} variables={{var1:2}}/>);
 act(()=>resize?.());
 expect(screen.getByLabelText('Query is holding')).toBe(bubble);
 expect(bubble.style.width).toBe('');
 expect(bubble.style.height).toBe('150px');
 bounds={width:50,height:20};
 rerender(<RobotHolding name="Query" inventory={[]} variables={{var1:2}}/>);
 act(()=>resize?.());
 expect(bubble.style.width).toBe('');
 expect(bubble.style.height).toBe('30px');
 unmount();
 expect(disconnect).toHaveBeenCalledOnce();
});
