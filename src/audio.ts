import type { Settings } from './domain/types';
let music:HTMLAudioElement|undefined;let settings:Settings|undefined;let started=false;
export function configureAudio(next:Settings){settings=next;if(music)music.volume=next.volume*next.music;}
export function startAudio(){if(started||!settings)return;started=true;music=new Audio(`${import.meta.env.BASE_URL}audio/morning_loop.wav`);music.loop=true;music.volume=settings.volume*settings.music;void music.play().catch(()=>{started=false;});}
export function playSound(name:'click'|'success'|'retry'|'serve'){if(!started||!settings)return;const audio=new Audio(`${import.meta.env.BASE_URL}audio/${name}.wav`);audio.volume=settings.volume*settings.effects;void audio.play().catch(()=>{});}
