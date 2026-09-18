import { expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CustomerSpeech } from '../../../src/components/CustomerSpeech';
it('shows each recognized order group, negation and numeric metadata',()=>{
 render(<CustomerSpeech customer={{customer_id:'C1',arrival:0,phrase:'coffee without sugar and tea with 2 sugars',intent:{},heard_orders:[{tokens:['coffee','sugar','negation']},{tokens:['tea','sugar','number'],number:2}],expected:{tickets:[{item:'coffee',with_sugar:false},{item:'tea',sugar_count:2}]}}}/>);
 expect(within(screen.getByRole('list',{name:'Heard orders'})).getAllByRole('listitem').map(e=>e.getAttribute('aria-label'))).toEqual(['coffee ×1','tea ×1 + 2 sugar']);
 expect(screen.queryByRole('list',{name:'Expected order'})).toBeNull();
});
it('does not reveal the answer to ambiguous speech',()=>{
 render(<CustomerSpeech customer={{customer_id:'C1',arrival:0,phrase:'The usual.',intent:{},heard_orders:[{tokens:['ambiguous']}],clarification_heard_orders:[{tokens:['tea']}],expected:{ask_help:true,item:'tea'}}}/>);
 expect(screen.getByRole('listitem').getAttribute('aria-label')).toBe('Ambiguous order');expect(screen.queryByText('tea')).toBeNull();
});
it('reveals Niko’s replacement groups only after HELP finishes',()=>{
 const customer={customer_id:'C1',arrival:0,phrase:'The usual.',intent:{},heard_orders:[{tokens:['ambiguous']}],clarification:'tea with 2 sugars',clarification_heard_orders:[{tokens:['tea','sugar','number'],number:2}],expected:{}};
 const {rerender}=render(<CustomerSpeech customer={customer}/>);
 expect(screen.getByRole('listitem').getAttribute('aria-label')).toBe('Ambiguous order');
 rerender(<CustomerSpeech customer={customer} clarified/>);
 expect(screen.getByRole('blockquote').textContent).toBe('“The usual.”');
 expect(screen.getByText('Niko: tea with 2 sugars')).toBeTruthy();
 expect(screen.getByRole('listitem').getAttribute('aria-label')).toBe('tea ×1 + 2 sugar');
});
