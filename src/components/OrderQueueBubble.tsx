import type { OrderTicket } from '../domain/types';
import { OrderIcons } from './OrderIcons';

/** The handoff bubble shows only paper orders still waiting for the cook. */
export function OrderQueueBubble({tickets}: {tickets:OrderTicket[]}) {
  return <div className="customer-speech order-queue-bubble" aria-label="Kitchen order queue">
    <strong>Orders to make</strong>
    {tickets.length ? <OrderIcons label="Waiting orders" orders={tickets.map(ticket=>({item:ticket.item,quantity:ticket.quantity??1,sugar:ticket.sugar_count??(ticket.with_sugar?1:0)}))}/> : <small>No orders waiting</small>}
  </div>;
}
