import type { OrderTicket } from './types';
/** Prices are integer café credits; sugar is included. No real payment service is involved. */
export const PRICES={coffee:3,tea:2} as const;
export function orderTotal(tickets:Pick<OrderTicket,'item'>[]){return tickets.reduce((total,ticket)=>total+(ticket.item==='coffee'?PRICES.coffee:ticket.item==='tea'?PRICES.tea:0),0);}
