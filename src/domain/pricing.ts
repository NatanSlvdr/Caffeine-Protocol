import type { OrderTicket } from './types';
/** Prices are integer café credits; sugar is included. No real payment service is involved. */
export const PRICES={coffee:3,tea:2} as const;
export function orderTotal(tickets:Pick<OrderTicket,'item'>[]){return tickets.reduce((total,ticket)=>total+(ticket.item==='coffee'?PRICES.coffee:ticket.item==='tea'?PRICES.tea:0),0);}
/** Upgrade a previously passing routine when carrying it into a new shift; retain saved source verbatim. */
export function withOrderCharge(source:string){
 if(source.split('\n').some(line=>line.trim()==='CHARGE ORDER')||!source.split('\n').some(line=>line.trim()==='SUBMIT'))return source;
 const lines=source.split('\n'),at=lines.findIndex(line=>['JUMP listen','REPEAT'].includes(line.trim()));
 if(at>=0)lines.splice(at,0,'CHARGE ORDER');else lines.push('CHARGE ORDER');return lines.join('\n');
}
