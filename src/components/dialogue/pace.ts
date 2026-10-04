import { createContext } from 'react';
import type { DialoguePace } from '@/domain';

/** How the crew's lines appear, from the house settings. The app sets it once, for every dialogue box. */
export const DialoguePaceContext = createContext<DialoguePace>('typed');
