import { CircleHelp } from 'lucide-react';
import { groupOrders, orderKey, type IconOrder } from '@/domain';
import { ModelThumbnail } from './thumbnails/ModelThumbnail';
import { SCENE_WORDS } from './sceneWords';
import { useWords } from '@/shared/language';

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

/** The take-away, rush and together marks on an order, as small tags, and whether what was asked for is sold out. */
export function OrderMarks({
  toGo,
  rush,
  together,
  soldOut,
  lid,
}: {
  toGo?: boolean;
  rush?: boolean;
  together?: boolean;
  soldOut?: boolean;
  lid?: boolean;
}) {
  const say = useWords(SCENE_WORDS).marks;
  return (
    <>
      {toGo && <span className="order-mark">{lid ? say.lid : say.toGo}</span>}
      {rush && <span className="order-mark rush">{say.rush}</span>}
      {together && <span className="order-mark together">{say.together}</span>}
      {soldOut && <span className="order-mark sold-out">{say.soldOut}</span>}
    </>
  );
}

/** Group identical drinks without merging different sugar preferences. */
export function OrderIcons({ orders, label }: { orders: IconOrder[]; label: string }) {
  const say = useWords(SCENE_WORDS);
  return (
    <ul className="order-icons" aria-label={label}>
      {groupOrders(orders).map((order) => {
        const key = orderKey(order);
        // An unclear order still reads out the count, sugar and marks its icon shows.
        const description = say.order(order);
        return (
          <li key={key} title={description} aria-label={description}>
            {order.item === 'coffee' || order.item === 'tea' ? (
              <ModelThumbnail model={order.item} />
            ) : (
              <CircleHelp size={22} aria-hidden="true" />
            )}
            {order.quantity > 1 && <span>×{order.quantity}</span>}
            {!!order.sugar && <SugarBadge sugar={order.sugar} />}
            <OrderMarks toGo={order.toGo} rush={order.rush} together={order.together} soldOut={order.soldOut} />
          </li>
        );
      })}
    </ul>
  );
}
