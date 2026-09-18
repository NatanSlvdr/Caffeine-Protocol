import type { Customer } from '@/domain';
import { heardToIconOrders } from '@/domain';
import { OrderIcons } from './OrderIcons';

/** Once intake begins, the customer's phrase and grouped order icons stay attached. */
export function CustomerSpeech({ customer, clarified = false }: { customer: Customer; clarified?: boolean }) {
  const heard = clarified ? (customer.clarification_heard_orders ?? []) : customer.heard_orders;
  return (
    <div className="customer-speech">
      <blockquote>“{customer.phrase}”</blockquote>
      {clarified && <small>Niko: {customer.clarification || 'No clarification available.'}</small>}
      <OrderIcons orders={heardToIconOrders(heard)} label="Heard orders" />
    </div>
  );
}
