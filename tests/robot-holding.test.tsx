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
