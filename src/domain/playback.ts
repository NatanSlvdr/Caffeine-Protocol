/** Default playback fits a full validation run into a minute; 6× finishes in about ten seconds. */
export const BASE_REPLAY_SECONDS=60;
export const MAX_PLAYBACK_SPEED=6;
export function playbackRate(duration:number,speed=1){return Math.max(1,duration/BASE_REPLAY_SECONDS)*Math.max(1,Math.min(MAX_PLAYBACK_SPEED,speed));}
export function playbackSeconds(duration:number,speed=1){return duration/playbackRate(duration,speed);}
