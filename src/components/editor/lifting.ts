import { createContext, useContext } from 'react';

/** The block a finger is resting on, by its drag id, until it lifts or the touch turns out to be a scroll. */
export const Lifting = createContext<string | null>(null);

/** Whether a finger is resting on this block, about to lift it. */
export const useLifting = (id: string) => useContext(Lifting) === id;
