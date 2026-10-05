import type { Customer } from '@/domain';
import { heardToIconOrders } from '@/domain';
import { BubbleTail } from './BubbleTail';
import { OrderIcons } from './OrderIcons';

/** Once intake begins, the customer's phrase and grouped order icons stay attached. */
export function CustomerSpeech({
  customer,
  clarified = false,
  atCounter = false,
  counterLine,
}: {
  customer: Customer;
  clarified?: boolean;
  /** At the counter the bubble grows away from the order taker beside the customer. */
  atCounter?: boolean;
  /** What the counter says back to a regular it recognises, like "Query: *bip* Juno. Tea, never sugar." */
  counterLine?: string;
}) {
  const heard = clarified ? (customer.clarification_heard_orders ?? []) : customer.heard_orders;
  return (
    <div className={`customer-speech${atCounter ? ' at-counter' : ''}`}>
      <blockquote>“{customer.phrase}”</blockquote>
      {counterLine && <small>{counterLine}</small>}
      {clarified && <small>Niko: {customer.clarification || 'No clarification available.'}</small>}
      <OrderIcons orders={heardToIconOrders(heard)} label="Heard orders" />
      <BubbleTail />
    </div>
  );
}
