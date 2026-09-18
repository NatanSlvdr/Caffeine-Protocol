import { ticketSugar } from './tickets';
import type { HeardOrder, OrderTicket } from './types';

export interface IconOrder {
  item?: string;
  sugar?: number;
  quantity?: number;
}

/** Group identical drinks without merging different sugar preferences. */
export function groupOrders(orders: IconOrder[]): (IconOrder & { quantity: number })[] {
  const groups = new Map<string, IconOrder & { quantity: number }>();
  for (const order of orders) {
    const key = `${order.item ?? 'ambiguous'}:${order.sugar ?? 0}`;
    const previous = groups.get(key);
    groups.set(key, { ...order, quantity: (previous?.quantity ?? 0) + (order.quantity ?? 1) });
  }
  return [...groups.values()];
}

/** Submitted ticket paper as an icon order. */
export function ticketToIconOrder(ticket: OrderTicket): IconOrder {
  return { item: ticket.item, quantity: ticket.quantity ?? 1, sugar: ticketSugar(ticket) };
}

/** Heard order tokens as icon orders: drink per group, sugar from negation, number, or modifier. */
export function heardToIconOrders(heard: HeardOrder[]): IconOrder[] {
  return heard.map((order) => ({
    item: order.tokens.find((token) => token === 'coffee' || token === 'tea'),
    sugar: order.tokens.includes('negation') ? 0 : (order.number ?? (order.tokens.includes('sugar') ? 1 : 0)),
  }));
}
