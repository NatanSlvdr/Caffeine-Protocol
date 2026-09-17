import { gridRoute, STARTS, STATIONS, TABLE_LAYOUT, tableFront } from './layout';
import type { Point } from './layout';
import type { RobotRole } from './types';
import { MAX_MOVE_COUNT } from './constants';
/** Build readable reference MOVE counts from a route; player execution never calls this helper. */
export function movementSource(from:Point,to:Point,role?:RobotRole){
 const path=gridRoute(from,to,role),moves:{direction:string;count:number}[]=[];
 path.slice(1).forEach((p,i)=>{const prev=path[i],direction=p[0]>prev[0]?'RIGHT':p[0]<prev[0]?'LEFT':p[1]>prev[1]?'DOWN':'UP';const last=moves.at(-1);if(last?.direction===direction&&last.count<MAX_MOVE_COUNT)last.count++;else moves.push({direction,count:1});});
 return moves.map(m=>`MOVE ${m.direction} ${m.count}`);
}
export function preparationSource(level:number,batch=1){
 const at=STATIONS;const move=(a:Point,b:Point)=>movementSource(a,b,'prep');
 const recipe=[...move(STARTS.prep,at.ingredients.prep),'IF coffee','TAKE UP',...move(at.ingredients.prep,at.grinder.prep),'GRIND',...move(at.grinder.prep,at.water.prep),'ELSE','TAKE UP',...move(at.ingredients.prep,at.water.prep),'END','FILL WATER',...move(at.water.prep,at.brewer.prep),'IF coffee','BREW','ELSE','STEEP','END',...move(at.brewer.prep,at.sugar.prep),'ADD SUGAR',...move(at.sugar.prep,at.pickup.prep),'DEPOSIT UP',...move(at.pickup.prep,STARTS.prep)];
 const waits=Array.from({length:batch},()=> 'WAIT TICKET');
 return (level>=20?[...waits,...Array.from({length:batch},()=> 'CALL recipe'),'REPEAT','FUNCTION recipe',...recipe,'RETURN','END']:[...waits,...recipe,'REPEAT']).join('\n');
}
export function floorSource(level:number,batch=1,tableCount=TABLE_LAYOUT.length){
 const move=(a:Point,b:Point)=>movementSource(a,b,'floor');const start=STARTS.floor;
 const serve=Array.from({length:tableCount},(_,i)=>['IF TABLE '+(i+1),...move(start,tableFront(i)),'SERVE',...move(tableFront(i),start),'END']).flat();
 const clear=['WAIT DIRTY',...Array.from({length:tableCount},(_,i)=>['IF TABLE '+(i+1),...move(start,tableFront(i)),'COLLECT',...move(tableFront(i),STATIONS.returns.floor),'RETURN CUPS',...move(STATIONS.returns.floor,start),'END']).flat()];
 return [...Array.from({length:batch},()=>['WAIT DRINK','TAKE DOWN']).flat(),...Array.from({length:batch},()=>['CALL deliver']).flat(),...(level>=23?Array.from({length:batch},()=>['CALL clear']).flat():[]),'REPEAT','FUNCTION deliver',...serve,'RETURN','END',...(level>=23?['FUNCTION clear',...clear,'RETURN','END']:[])].join('\n');
}
