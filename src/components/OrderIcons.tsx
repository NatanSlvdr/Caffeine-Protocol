import { CircleHelp } from 'lucide-react';
import { ModelThumbnail } from './ModelThumbnail';

export interface IconOrder { item?: string; sugar?: number; quantity?: number }
/** Group identical drinks without merging different sugar preferences. */
export function OrderIcons({orders, label}: {orders: IconOrder[]; label: string}) {
  const groups=new Map<string, IconOrder & {quantity:number}>();
  for(const order of orders){
    const key=`${order.item ?? 'ambiguous'}:${order.sugar ?? 0}`;
    const previous=groups.get(key);
    groups.set(key,{...order,quantity:(previous?.quantity??0)+(order.quantity??1)});
  }
  return <ul className="order-icons" aria-label={label}>{[...groups].map(([key,order])=>{
    const description=order.item ? `${order.item} ×${order.quantity}${order.sugar ? ` + ${order.sugar} sugar` : ''}` : 'Ambiguous order';
    return <li key={key} title={description} aria-label={description}>
      {order.item==='coffee'||order.item==='tea'?<ModelThumbnail model={order.item}/>:<CircleHelp size={22}/>}
      {order.quantity>1&&<span>×{order.quantity}</span>}
      {!!order.sugar&&<><span>+</span><ModelThumbnail model="sugar"/>{order.sugar>1&&<span>×{order.sugar}</span>}</>}
    </li>;
  })}</ul>;
}
