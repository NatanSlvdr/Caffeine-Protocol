import type { Customer } from '@/domain/types';
import { OrderIcons } from './OrderIcons';

/** Once intake begins, the customer's phrase and grouped order icons stay attached. */
export function CustomerSpeech({customer, clarified=false}: {customer:Customer; clarified?:boolean}) {
  const heard=clarified?customer.clarification_heard_orders??[]:customer.heard_orders;
  const orders=heard.map(order=>({item:order.tokens.find(token=>token==='coffee'||token==='tea'),sugar:order.tokens.includes('negation')?0:order.number??(order.tokens.includes('sugar')?1:0)}));
  return <div className="customer-speech">
    <blockquote>“{customer.phrase}”</blockquote>
    {clarified&&<small>Niko: {customer.clarification || 'No clarification available.'}</small>}
    <OrderIcons orders={orders} label="Heard orders"/>
  </div>;
}
