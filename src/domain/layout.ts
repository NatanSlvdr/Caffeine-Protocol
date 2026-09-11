import type { RobotRole } from './types';
export type Point = readonly [number, number];
export const ROOM = [16,12] as const;
export const BOUNDS={minX:-8,maxX:7,minZ:-6,maxZ:5} as const;
export const CAMERA_ELEVATION = 75*Math.PI/180;
export const CAMERA_TARGET = [-.5,.2,-.5] as const;
export const CAMERA_POSITION: [number,number,number]=[-.5,40,-.5+40/Math.tan(CAMERA_ELEVATION)];
export type Furniture = {id:string;kind:'counter'|'table'|'chair'|'plant';x:number;z:number;width:number;depth:number};
export const TABLE_LAYOUT=Array.from({length:10},(_,i)=>({id:`T${String(i+1).padStart(2,'0')}`,x:[0,3,6][i%3],z:-5+Math.floor(i/3)*3,width:1,depth:i<9&&i%3===0?2:1}));
export const TABLES:Point[]=TABLE_LAYOUT.map(t=>[t.x,t.z]);
export const tableFront=(index:number):Point=>{const t=TABLE_LAYOUT[index];return [t.x,t.z+t.depth];};
export const STATIONS = {
 ingredients:{cell:[-8,-4],prep:[-7,-4],label:'INGREDIENTS'},
 grinder:{cell:[-8,-2],prep:[-7,-2],label:'GRINDER'},
 water:{cell:[-8,0],prep:[-7,0],label:'WATER'},
 brewer:{cell:[-8,2],prep:[-7,2],label:'BREW / STEEP'},
 sugar:{cell:[-3,-4],prep:[-4,-4],label:'SUGAR'},
 pickup:{cell:[-3,-1],prep:[-4,-1],floor:[-2,-1],label:'PICKUP'},
 returns:{cell:[-3,1],prep:[-4,1],floor:[-2,1],label:'CUP RETURN'},
 orders:{cell:[-3,4],query:[-4,4],floor:[-2,4],label:'ORDERS'},
 dock:{cell:[-3,5],floor:[-2,5],label:'CHARGE'},
} as const;
export type StationId=keyof typeof STATIONS;
export const STARTS:Record<RobotRole,Point>={query:STATIONS.orders.query,prep:STATIONS.pickup.prep,floor:STATIONS.pickup.floor};
export const ENTRANCE:Point=[1,5];
export const FURNITURE:Furniture[]=[
 {id:'equipment',kind:'counter',x:-8,z:-6,width:1,depth:9},
 {id:'service-top',kind:'counter',x:-3,z:-6,width:1,depth:8},
 {id:'service-bottom',kind:'counter',x:-3,z:3,width:1,depth:3},
 {id:'order-back',kind:'counter',x:-8,z:3,width:3,depth:1},
 {id:'plant',kind:'plant',x:-8,z:5,width:1,depth:1},
 ...TABLE_LAYOUT.flatMap(t=>[{...t,kind:'table' as const},{id:`${t.id}-chair`,kind:'chair' as const,x:t.x+1,z:t.z,width:1,depth:1}]),
];
export function zoneAt([x,z]:Point):RobotRole|'room'{return x<=-3?(z<=2?'prep':'query'):'room';}
export const samePoint=(a:Point,b:Point)=>a[0]===b[0]&&a[1]===b[1];
export function isWalkable([x,z]:Point,role?:RobotRole){return Number.isInteger(x)&&Number.isInteger(z)&&x>=BOUNDS.minX&&x<=BOUNDS.maxX&&z>=BOUNDS.minZ&&z<=BOUNDS.maxZ&&!FURNITURE.some(f=>x>=f.x&&x<f.x+f.width&&z>=f.z&&z<f.z+f.depth)&&(!role||(role==='floor'?zoneAt([x,z])==='room':zoneAt([x,z])===role));}
const cache=new Map<string,Point[]>();
/** Scripted humans and reference programs use cardinal routes; MOVE itself never pathfinds. */
export function gridRoute(start:Point,end:Point,role?:RobotRole):Point[]{
 const key=(p:Point)=>p.join(','),id=`${key(start)}:${key(end)}:${role??'human'}`;const found=cache.get(id);if(found)return found;
 const queue:Point[][]=[[start]],seen=new Set([key(start)]);
 for(let i=0;i<queue.length;i++){const path=queue[i],p=path[path.length-1];if(samePoint(p,end)){cache.set(id,path);return path;}for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const next:Point=[p[0]+dx,p[1]+dz];if(!seen.has(key(next))&&isWalkable(next,role)){seen.add(key(next));queue.push([...path,next]);}}}
 throw new Error(`No ${role??'human'} route from ${start} to ${end}`);
}
/** Width/depth projection plus wall height and label padding, at any viewport size. */
export function cameraZoom(width:number,height:number){return Math.max(1,Math.min(width/(ROOM[0]+3),height/(ROOM[1]*Math.sin(CAMERA_ELEVATION)+3.4*Math.cos(CAMERA_ELEVATION)+4)));}
