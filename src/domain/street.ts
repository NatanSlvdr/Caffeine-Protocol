import { BOUNDS, ENTRANCE, gridRoute, ROOM, STATIONS } from './layout';
import type { Point } from './layout';

export const STREET_APPROACH_SECONDS=6;
export const STREET_EXIT_SECONDS=8;
export const SIDEWALK_X=-9.6;
/** Street and sidewalk end flush with the café's front and back floor edges. */
export const STREET_BOUNDS={minZ:BOUNDS.minZ-.5,maxZ:BOUNDS.maxZ+.5,length:ROOM[1],centerZ:(BOUNDS.minZ+BOUNDS.maxZ)/2};
// Spawn and finish outside the clipping planes, so customers cross the boundary naturally.
const sidewalkEnds=[STREET_BOUNDS.minZ-1,STREET_BOUNDS.maxZ+1] as const;
/** Outdoor presentation paths meet the existing indoor navigation at the doorway. */
export function customerApproach(index:number):Point[]{
 return [[SIDEWALK_X,sidewalkEnds[index%2?0:1]],[SIDEWALK_X,ENTRANCE[1]],ENTRANCE,...gridRoute(ENTRANCE,STATIONS.orders.floor).slice(1)];
}
export function customerExit(from:Point,index:number):Point[]{
 return [...gridRoute(from,ENTRANCE),[SIDEWALK_X,ENTRANCE[1]],[SIDEWALK_X,sidewalkEnds[index%2?1:0]]];
}
/** Distance-weighted sampling keeps speed consistent across long sidewalk segments. */
export function samplePath(path:readonly Point[],progress:number):Point{
 const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));
 let remaining=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
 for(let i=0;i<lengths.length;i++){
  if(remaining<=lengths[i]&&lengths[i]>0){const t=remaining/lengths[i];return [path[i][0]+(path[i+1][0]-path[i][0])*t,path[i][1]+(path[i+1][1]-path[i][1])*t];}
  remaining-=lengths[i];
 }
 return path.at(-1)??ENTRANCE;
}
