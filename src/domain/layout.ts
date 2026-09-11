import type { RobotRole } from './types';
export type Point = readonly [number, number];
export const ROOM = [16,12] as const;
export const BOUNDS={minX:-8,maxX:7,minZ:-6,maxZ:5} as const;
export const CAMERA_ELEVATION = 65*Math.PI/180;
export const CAMERA_TARGET = [-.5,.2,-.5] as const;
export const CAMERA_POSITION: [number,number,number]=[-.5,CAMERA_TARGET[1]+40,-.5+40/Math.tan(CAMERA_ELEVATION)];
export type Furniture = {id:string;kind:'counter'|'table'|'chair'|'plant';x:number;z:number;width:number;depth:number};
export const TABLE_LAYOUT=Array.from({length:10},(_,i)=>({id:`T${String(i+1).padStart(2,'0')}`,x:[1,5][i%2],z:-6+Math.floor(i/2)*2,width:1,depth:1}));
export const TABLES:Point[]=TABLE_LAYOUT.map(t=>[t.x,t.z]);
export const tableFront=(index:number):Point=>{const t=TABLE_LAYOUT[index];return [t.x,t.z+1];};
export const tableSeat=(index:number,side:0|1):Point=>{const t=TABLE_LAYOUT[index];return [t.x+(side===0?-1:1),t.z+(t.depth-1)/2];};
export const STATIONS = {
 orders:{cell:[-6,4],query:[-6,5],floor:[-6,3],label:'ORDERS'},
 ingredients:{cell:[-4,4],prep:[-4,5],label:'BEANS + TEA'},
 grinder:{cell:[-2,4],prep:[-2,5],label:'GRINDER'},
 water:{cell:[0,4],prep:[0,5],label:'SINK'},
 brewer:{cell:[2,4],prep:[2,5],label:'BREWER'},
 sugar:{cell:[4,4],prep:[4,5],label:'SUGAR'},
 pickup:{cell:[6,4],prep:[6,5],floor:[6,3],label:'PICKUP'},
 returns:{cell:[7,4],prep:[7,5],floor:[7,3],label:'RETURNS'},
 dock:{cell:[-7,2],floor:[-7,3],label:'CHARGE'},
} as const;
export type StationId=keyof typeof STATIONS;
export const STARTS:Record<RobotRole,Point>={query:STATIONS.orders.query,prep:STATIONS.pickup.prep,floor:STATIONS.pickup.floor};
export const ENTRANCE:Point=[-8,5];
export const FURNITURE:Furniture[]=[
 {id:'equipment',kind:'counter',x:-6,z:4,width:14,depth:1},
 {id:'plant',kind:'plant',x:-8,z:-6,width:1,depth:1},
 ...TABLE_LAYOUT.flatMap(t=>[{...t,kind:'table' as const},{id:`${t.id}-chair`,kind:'chair' as const,x:t.x+1,z:t.z,width:1,depth:1}]),
];
export function zoneAt([x,z]:Point):RobotRole|'room'{return z===5&&x===-6?'query':z===5&&x>=-5?'prep':'room';}
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
/** Fit the complete room, walls, and actors with a small edge-safe gutter. */
export function cameraZoom(width:number,height:number){return Math.max(1,Math.min(width/(ROOM[0]+1),height/(ROOM[1]*Math.sin(CAMERA_ELEVATION)+3.4*Math.cos(CAMERA_ELEVATION)+1)));}
