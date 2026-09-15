import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { CustomerSpeech } from '../src/components/CustomerSpeech';

afterEach(cleanup);
it('shows the requested drinks and modifiers, grouping only identical items',()=>{
 render(<CustomerSpeech customer={{customer_id:'C6',arrival:0,phrase:'Two coffees, a sweet tea and a plain tea, please.',intent:{},expected:{tickets:[
  {item:'coffee',sugar_count:0},{item:'coffee',sugar_count:0},{item:'tea',sugar_count:2},{item:'tea',with_sugar:false},
 ]}}}/>);
 expect(screen.getByRole('blockquote').textContent).toBe('“Two coffees, a sweet tea and a plain tea, please.”');
 expect(within(screen.getByRole('list',{name:'Expected order'})).getAllByRole('listitem').map(e=>e.getAttribute('aria-label'))).toEqual(['2 × Coffee · No sugar','1 × Tea · 2 sugars','1 × Tea · No sugar']);
 expect(screen.getByLabelText('2 × Coffee · No sugar').querySelector('.model-coffee')).toBeTruthy();
 expect(screen.getByLabelText('1 × Tea · 2 sugars').querySelector('.model-tea')).toBeTruthy();
 expect(screen.getByLabelText('2 × Coffee · No sugar').querySelector('.order-quantity')?.textContent).toBe('×2');
 expect(screen.getByLabelText('1 × Tea · 2 sugars').querySelector('.order-quantity')).toBeNull();
});
it('shows the clarification expected for an ambiguous request',()=>{
 render(<CustomerSpeech customer={{customer_id:'C1',arrival:0,phrase:'The usual.',intent:{confidence:'ambiguous'},expected:{ask_help:true,tickets:[]}}}/>);
 expect(screen.getByRole('listitem').textContent).toBe('Ask for clarification');
});
