import { CircleHelp } from 'lucide-react';
import { groupOrders, type IconOrder } from '@/domain';
import { ModelThumbnail } from './thumbnails/ModelThumbnail';

export type { IconOrder };

/** Sugar amount badge shared by every order icon. */
export function SugarBadge({ sugar }: { sugar: number }) {
  if (!sugar) return null;
  return (
    <>
      <span>+</span>
      <ModelThumbnail model="sugar" />
      {sugar > 1 && <span>×{sugar}</span>}
    </>
  );
}

/** The take-away and rush marks on an order, as small tags. */
export function OrderMarks({ toGo, rush, lid }: { toGo?: boolean; rush?: boolean; lid?: boolean }) {
  return (
    <>
      {toGo && <span className="order-mark">{lid ? 'Lid' : 'To go'}</span>}
      {rush && <span className="order-mark rush">Rush</span>}
    </>
  );
}

/** Group identical drinks without merging different sugar preferences. */
export function OrderIcons({ orders, label }: { orders: IconOrder[]; label: string }) {
  return (
    <ul className="order-icons" aria-label={label}>
      {groupOrders(orders).map((order) => {
        const key = `${order.item ?? 'ambiguous'}:${order.sugar ?? 0}:${!!order.toGo}:${!!order.rush}`;
        // An unclear order still reads out the count, sugar and marks its icon shows.
        const drink = order.item
          ? `${order.item} ×${order.quantity}`
          : `Unclear order${order.quantity > 1 ? ` ×${order.quantity}` : ''}`;
        const description = `${drink}${order.sugar ? ` + ${order.sugar} sugar` : ''}${order.toGo ? ', to go' : ''}${order.rush ? ', in a rush' : ''}`;
        return (
          <li key={key} title={description} aria-label={description}>
            {order.item === 'coffee' || order.item === 'tea' ? (
              <ModelThumbnail model={order.item} />
            ) : (
              <CircleHelp size={22} />
            )}
            {order.quantity > 1 && <span>×{order.quantity}</span>}
            {!!order.sugar && <SugarBadge sugar={order.sugar} />}
            <OrderMarks toGo={order.toGo} rush={order.rush} />
          </li>
        );
      })}
    </ul>
  );
}
