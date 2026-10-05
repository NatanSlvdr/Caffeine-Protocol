/** A WebP's canvas size, and whether it can be see-through. Throws on anything that isn't a WebP. */
export function webpInfo(bytes: Buffer): { width: number; height: number; alpha: boolean };
/** Every way the shipped art under `root` has drifted from its sources or its frame; empty when it hasn't. */
export function artErrors(root: string): string[];
