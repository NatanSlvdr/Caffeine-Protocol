import type { OrderTicket } from '@/domain';
import { ticketToIconOrder } from '@/domain';
import { ClipboardList } from 'lucide-react';
import { BubbleTail } from './BubbleTail';
import { OrderIcons } from './OrderIcons';

/** The handoff bubble shows only paper orders still waiting for the cook, under a pill like the robots'. */
export function OrderQueueBubble({ tickets }: { tickets: OrderTicket[] }) {
  return (
    <div className="customer-speech order-queue-bubble" role="group" aria-label="Kitchen order queue">
      <strong className="bubble-pill">
        <ClipboardList strokeWidth={2.4} aria-hidden="true" />
        Orders
      </strong>
      {tickets.length ? (
        <OrderIcons label="Waiting orders" orders={tickets.map(ticketToIconOrder)} />
      ) : (
        <small>None waiting</small>
      )}
      <BubbleTail />
    </div>
  );
}
