import type { OrderTicket } from '@/domain';
import { ticketToIconOrder } from '@/domain';
import { ClipboardList } from 'lucide-react';
import { BubbleTail } from './BubbleTail';
import { OrderIcons } from './OrderIcons';
import { SCENE_WORDS } from './sceneWords';
import { useWords } from '@/shared/language';

/** The handoff bubble shows only paper orders still waiting for the cook, under a pill like the robots'. */
export function OrderQueueBubble({ tickets }: { tickets: OrderTicket[] }) {
  const say = useWords(SCENE_WORDS);
  return (
    <div className="customer-speech order-queue-bubble" role="group" aria-label={say.queue}>
      <strong className="bubble-pill">
        <ClipboardList strokeWidth={2.4} aria-hidden="true" />
        {say.orders}
      </strong>
      {tickets.length ? (
        <OrderIcons label={say.waiting} orders={tickets.map(ticketToIconOrder)} />
      ) : (
        <small>{say.noneWaiting}</small>
      )}
      <BubbleTail />
    </div>
  );
}
