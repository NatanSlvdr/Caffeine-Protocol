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
