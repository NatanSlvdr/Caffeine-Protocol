import { ticketSugar } from './tickets';
import type { HeardOrder, OrderTicket } from './types';

export interface IconOrder {
  item?: string;
  sugar?: number;
  quantity?: number;
  toGo?: boolean;
  rush?: boolean;
  together?: boolean;
  /** Heard only: the guest asked for a drink that has run out. */
  soldOut?: boolean;
  /** Heard only: the guest booked the drink for later, and is back for it then. */
  later?: boolean;
}

/** What tells one kind of drink in an order from another: two orders with the same key are grouped. */
export const orderKey = (order: IconOrder) =>
  `${order.item ?? 'ambiguous'}:${order.sugar ?? 0}:${!!order.toGo}:${!!order.rush}:${!!order.together}:${!!order.soldOut}:${!!order.later}`;

/** Group identical drinks without merging different sugar preferences. */
export function groupOrders(orders: IconOrder[]): (IconOrder & { quantity: number })[] {
  const groups = new Map<string, IconOrder & { quantity: number }>();
  for (const order of orders) {
    const key = orderKey(order);
    const previous = groups.get(key);
    groups.set(key, { ...order, quantity: (previous?.quantity ?? 0) + (order.quantity ?? 1) });
  }
  return [...groups.values()];
}

/** Submitted ticket paper as an icon order. */
export function ticketToIconOrder(ticket: OrderTicket): IconOrder {
  return {
    item: ticket.item,
    quantity: ticket.quantity ?? 1,
    sugar: ticketSugar(ticket),
    toGo: ticket.to_go,
    rush: ticket.rush,
    together: ticket.together,
  };
}

/** Heard order tokens as icon orders: drink per group, sugar from negation, number, or modifier. */
export function heardToIconOrders(heard: HeardOrder[]): IconOrder[] {
  return heard.map((order) => ({
    item: order.tokens.find((token) => token === 'coffee' || token === 'tea'),
    sugar: order.tokens.includes('negation') ? 0 : (order.number ?? (order.tokens.includes('sugar') ? 1 : 0)),
    toGo: order.tokens.includes('togo'),
    rush: order.tokens.includes('rush'),
    together: order.tokens.includes('together'),
    soldOut: order.tokens.includes('soldout'),
    later: order.tokens.includes('later'),
  }));
}
