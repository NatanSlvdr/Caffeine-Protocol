import campaign from './campaign.json' with {type:'json'};
import labelsData from './labels.json' with {type:'json'};
import type { LevelDefinition } from '../domain/types';
export const levels = campaign.levels as LevelDefinition[];
export const lessons = campaign.lessons;
export const labels:Record<string,string> = labelsData;
export const titleFor=(index:number)=>levels[index].title.replace(/^Level \d+: /,'');
export const stories:Record<number,{title:string;text:string}>={
2:{title:'A voice at the counter',text:"Niko tightens the last screw. The scrapyard robot's display blinks.\n\nQUERY: Hearing module online. What is a coffee?\nNIKO: Let's begin with one customer, one ticket. I'll handle the brewing."},
7:{title:'The regulars',text:"QUERY: 'One tea' and 'tea please' have different lengths.\nNIKO: But the same drink chip. Put the shared work in a function.\n\nQuery opens a fresh page in the service manual."},
9:{title:'Two is not yes',text:"CUSTOMER: Two sugars, please.\nQUERY: Sugar: yes.\nNIKO: You're not wrong. You're just not precise enough.\n\nA number variable should help."},
13:{title:'The counter is yours',text:"Niko pins a new badge beside the till.\n\nNIKO: One last service. Every order we've learned, all together.\nQUERY: I have retained my instructions.\n\nBehind them, the espresso machine is already busy."}
};
