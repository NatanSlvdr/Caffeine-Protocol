import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RobotHolding } from '../src/components/RobotHolding';
import type { Cargo } from '../src/domain/types';

afterEach(cleanup);
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
 expect(screen.getByLabelText('Action progress').getAttribute('value')).toBe('0.4');
 expect(screen.getByLabelText('Query is holding').style.animationPlayState).toBe('paused');
 expect(document.querySelector('.robot-action .lucide-hand')).toBeTruthy();
 rerender(<RobotHolding name="Query" inventory={[]} action={{command:'STORE var1 FROM number',start:1,progress:.5}} reduced/>);
 expect(screen.getByText('Store var 1 in memory')).toBeTruthy();
 expect(screen.queryByLabelText('Query memory')).toBeNull();
 rerender(<RobotHolding name="Query" inventory={[]} variables={{var1:2}}/>);
 expect(screen.getByLabelText('Query memory').textContent).toContain('var 1 = 2');
});

it.each(['LISTEN', 'IF coffee', 'FOR EACH order', 'JUMP 1', 'CALL routine', 'READ ticket', 'WAIT TICKET'])('does not animate %s as a robot action', command=>{
 const {rerender}=render(<RobotHolding name="Query" inventory={[]} action={{command,start:0,progress:.5}}/>);
 expect(screen.queryByLabelText('Query is holding')).toBeNull();
 rerender(<RobotHolding name="Query" inventory={[]} variables={{var1:2}} action={{command,start:0,progress:.5}}/>);
 expect(screen.queryByLabelText('Action progress')).toBeNull();
 expect(screen.getByLabelText('Query memory')).toBeTruthy();
});

it.each(['TAKE UP', 'DEPOSIT DOWN', 'ITEM coffee', 'WRITE 2 sugar', 'STORE var1 FROM number', 'MOVE LEFT', 'TICKET', 'SUBMIT', 'PICKUP'])('shows %s as a robot action', command=>{
 render(<RobotHolding name="Query" inventory={[]} action={{command,start:0,progress:.5}}/>);
 expect(screen.getByLabelText('Action progress')).toBeTruthy();
});

it('shows action, inventory with sugar cubes, and compact memory in order',()=>{
 render(<RobotHolding name="Brew" action={{command:'DEPOSIT UP',start:0,progress:.5}} inventory={[{ticketId:'one',table:2,item:'coffee',stage:'brewed',sugar:2}]} variables={{var1:2}}/>);
 const bubble=screen.getByLabelText('Brew is holding');
 expect(Array.from(bubble.children).map(child=>child.className || child.tagName)).toEqual(['robot-action','UL','robot-memory']);
 expect(screen.getByLabelText('Brew inventory').querySelector('.holding-sugar .model-sugar')).toBeTruthy();
});
