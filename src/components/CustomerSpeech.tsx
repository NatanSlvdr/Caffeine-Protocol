import type { Customer } from '../domain/types';

/** Show the intended order, never the player's potentially incorrect ticket. */
export function CustomerSpeech({ customer }: { customer: Customer }) {
  const expected = customer.expected;
  const tickets = expected.tickets ?? (expected.item ? [expected] : []);
  const items = new Map<string, number>();
  for (const ticket of tickets) {
    const drink = ticket.item === 'tea' ? 'Tea' : ticket.item === 'coffee' ? 'Coffee' : 'Drink';
    const sugar = ticket.sugar_count !== undefined
      ? ticket.sugar_count === 0 ? ' · No sugar' : ` · ${ticket.sugar_count} sugar${ticket.sugar_count === 1 ? '' : 's'}`
      : ticket.with_sugar !== undefined ? ticket.with_sugar ? ' · With sugar' : ' · No sugar' : '';
    const label = drink + sugar;
    items.set(label, (items.get(label) ?? 0) + 1);
  }
  return <div className="customer-speech">
    <blockquote>“{customer.phrase}”</blockquote>
    <ul aria-label="Expected order">
      {expected.ask_help && <li>Ask for clarification</li>}
      {[...items].map(([label, count]) => <li key={label}>{count > 1 ? `${count} × ` : ''}{label}</li>)}
    </ul>
  </div>;
}
