import { CircleHelp, CupSoda, Sparkles } from 'lucide-react';
import type { Customer, ExpectedTicket } from '../domain/types';
import { ModelThumbnail } from './ModelThumbnail';

/** Group identical requested drinks while keeping different sugar choices distinct. */
export function CustomerSpeech({ customer }: { customer: Customer }) {
  const expected = customer.expected;
  const tickets = expected.tickets ?? (expected.item ? [expected] : []);
  const items = new Map<string, { ticket: ExpectedTicket; count: number }>();
  for (const ticket of tickets) {
    const drink = ticket.item === 'tea' ? 'Tea' : ticket.item === 'coffee' ? 'Coffee' : 'Drink';
    const sugar = ticket.sugar_count !== undefined
      ? ticket.sugar_count === 0 ? ' · No sugar' : ` · ${ticket.sugar_count} sugar${ticket.sugar_count === 1 ? '' : 's'}`
      : ticket.with_sugar !== undefined ? ticket.with_sugar ? ' · With sugar' : ' · No sugar' : '';
    const label = drink + sugar;
    items.set(label, { ticket, count: (items.get(label)?.count ?? 0) + 1 });
  }
  return <div className="customer-speech">
    <blockquote>“{customer.phrase}”</blockquote>
    <ul aria-label="Expected order">
      {expected.ask_help && <li className="customer-clarification"><CircleHelp size={24} aria-hidden="true"/><span>Ask for clarification</span></li>}
      {[...items].map(([label, { ticket, count }]) => <li key={label} title={`${count} × ${label}`} aria-label={`${count} × ${label}`}>
        {ticket.item ? <ModelThumbnail model={ticket.item}/> : <CupSoda size={36} aria-hidden="true"/>}
        {count > 1 && <span className="order-quantity" aria-hidden="true">×{count}</span>}
        {(ticket.sugar_count !== undefined || ticket.with_sugar !== undefined) && <span className="order-sugar" aria-hidden="true">
          <Sparkles size={10}/>{ticket.sugar_count ?? (ticket.with_sugar ? '+' : '0')}
        </span>}
      </li>)}
    </ul>
  </div>;
}
