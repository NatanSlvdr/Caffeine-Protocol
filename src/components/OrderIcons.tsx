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

/** Group identical drinks without merging different sugar preferences. */
export function OrderIcons({ orders, label }: { orders: IconOrder[]; label: string }) {
  return (
    <ul className="order-icons" aria-label={label}>
      {groupOrders(orders).map((order) => {
        const key = `${order.item ?? 'ambiguous'}:${order.sugar ?? 0}`;
        const description = order.item
          ? `${order.item} ×${order.quantity}${order.sugar ? ` + ${order.sugar} sugar` : ''}`
          : 'Ambiguous order';
        return (
          <li key={key} title={description} aria-label={description}>
            {order.item === 'coffee' || order.item === 'tea' ? <ModelThumbnail model={order.item} /> : <CircleHelp size={22} />}
            {order.quantity > 1 && <span>×{order.quantity}</span>}
            {!!order.sugar && <SugarBadge sugar={order.sugar} />}
          </li>
        );
      })}
    </ul>
  );
}
