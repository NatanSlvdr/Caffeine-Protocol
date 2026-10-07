import type { VisualBlock } from '@/domain';
import { EDITOR_WORDS, type EditorWords } from './editorWords';

/** Where a library block goes when a routine block is picked: the source line it takes, and how that reads. */
export interface InsertSpot {
  at: number;
  /** First inside an empty group or an else branch, rather than after the picked block. */
  inside: boolean;
}

/**
 * An empty group, or an else branch, is filled from its top. A group with blocks in it is passed over whole, so picking
 * a branch again after filling it carries on below it; a block inside it carries on inside.
 */
export function insertSpot(block: VisualBlock): InsertSpot {
  if (block.command === 'ELSE' || block.children?.length === 0) return { at: block.line + 1, inside: true };
  return { at: block.end + 1, inside: false };
}

/** Where new blocks go, said against the picked block's number in the code pane. */
export function spotWords(
  block: VisualBlock,
  ordinal: number,
  say: EditorWords['spot'] = EDITOR_WORDS.en.spot,
): string {
  if (insertSpot(block).inside) return say.inside(ordinal, block.command);
  return say.after(ordinal, block.command, !!block.children);
}
