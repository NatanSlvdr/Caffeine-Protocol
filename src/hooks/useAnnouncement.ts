import { useState } from 'react';

const MARK = '\u00a0';

/**
 * Text for a status line that a screen reader reads out. A live region only speaks when its text changes, so a
 * message that repeats the one showing (the same block removed twice, the same export made again) takes a
 * trailing no-break space, and the next repeat drops it again. It reads the same either way.
 */
export function useAnnouncement(): [string, (text: string) => void] {
  const [said, setSaid] = useState('');
  const announce = (text: string) => {
    const marked = said.endsWith(MARK);
    if (text && text === (marked ? said.slice(0, -1) : said)) setSaid(marked ? text : text + MARK);
    else setSaid(text);
  };
  return [said, announce];
}
