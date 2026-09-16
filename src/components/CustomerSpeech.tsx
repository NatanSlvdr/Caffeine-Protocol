import type { Customer } from '../domain/types';

/** Display recognized groups without revealing the expected ticket or clarification. */
export function CustomerSpeech({ customer, clarified = false }: { customer: Customer; clarified?: boolean }) {
  const orders = clarified ? customer.clarification_heard_orders ?? [] : customer.heard_orders;
  const phrase = clarified ? customer.clarification || 'Niko cannot clarify this request.' : customer.phrase;
  return <div className="customer-speech">
    <blockquote>{clarified && 'Niko: '}“{phrase}”</blockquote>
    <ul aria-label="Heard orders">
      {orders.map((order, index) => <li key={index} aria-label={`Item ${index + 1}: ${order.tokens.join(', ')}${order.number === undefined ? '' : ` (${order.number})`}`}>
        <span>{order.tokens.join(' · ')}{order.number !== undefined && ` (${order.number})`}</span>
      </li>)}
    </ul>
  </div>;
}
