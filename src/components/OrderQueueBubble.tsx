import type { OrderTicket } from '@/domain';
import { ticketToIconOrder } from '@/domain';
import { OrderIcons } from './OrderIcons';

/** The handoff bubble shows only paper orders still waiting for the cook. */
export function OrderQueueBubble({ tickets }: { tickets: OrderTicket[] }) {
  return (
    <div className="customer-speech order-queue-bubble" aria-label="Kitchen order queue">
      <strong>Orders to make</strong>
      {tickets.length ? (
        <OrderIcons label="Waiting orders" orders={tickets.map(ticketToIconOrder)} />
      ) : (
        <small>No orders waiting</small>
      )}
    </div>
  );
}
