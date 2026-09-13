import campaign from './campaign.json' with {type:'json'};
import labelsData from './labels.json' with {type:'json'};
import { extensionLevels, extensionLessons } from './extension';
import type { LevelDefinition } from '../domain/types';
/** Include the two newly taught handoff moves in the original campaign's scoring budgets. */
export const levels:LevelDefinition[] = [...(campaign.levels as LevelDefinition[]).map((level,i)=>{
 if(!level.programming_enabled)return level;
 const handoffs=campaign.lessons[i].solution.split('\n').filter(c=>c==='SUBMIT').length;
 const tickets=level.seeds.flatMap(s=>s.customers).reduce((n,c)=>n+(c.expected.tickets?.length??(c.expected.item?1:0)),0);
 return {...level,block_target:level.block_target+handoffs*2,reference_block_count:level.reference_block_count+handoffs*2,instruction_target:level.instruction_target+tickets*2};
}), ...extensionLevels];
export const lessons = [...campaign.lessons.map(l=>({...l,robotStarter:undefined,robotSolution:undefined})),...extensionLessons];
export const CAMPAIGN_LENGTH=levels.length;
export const MAX_STARS=levels.filter(l=>l.programming_enabled).length*3;
export const labels:Record<string,string> = labelsData;
export const titleFor=(index:number)=>levels[index].title.replace(/^Level \d+: /,'');
export const stories:Record<number,{title:string;text:string}>={
2:{title:'A voice at the counter',text:"Niko tightens the last screw. The scrapyard robot's display blinks.\n\nQUERY: Hearing module online. What is a coffee?\nNIKO: Let's begin with one customer, one ticket. I'll handle the brewing."},
7:{title:'The regulars',text:"QUERY: 'One tea' and 'tea please' have different lengths.\nNIKO: But the same drink chip. Put the shared work in a function.\n\nQuery opens a fresh page in the service manual."},
9:{title:'Two is not yes',text:"CUSTOMER: Two sugars, please.\nQUERY: Sugar: yes.\nNIKO: You're not wrong. You're just not precise enough.\n\nA number variable should help."},
13:{title:'The counter is yours',text:"Niko pins a new badge beside the till.\n\nNIKO: One last service. Every order we've learned, all together.\nQUERY: I have retained my instructions.\n\nBehind them, the espresso machine is already busy."}
};

stories[14]={title:'A place at the workbench',text:'Niko sets Brew beside the kitchen counter.\nQuery knows the orders. Now teach Brew the recipes, one tile and one ingredient at a time.\nNiko will keep serving until the floor has a robot of its own.'};
stories[22]={title:'A tray and a little courage',text:'Porter rolls up to the pickup counter.\nBrew has the kitchen. Query has the orders. The room is yours to program.\nEvery delivery begins with one tile.'};
stories[30]={title:'Three routines, one café',text:'The three robots are ready. Niko hangs up the service apron.\nOrders, recipes, and deliveries now depend on your programs working together.'};
