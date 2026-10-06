/** Trigger a download in the browser: JSON unless said otherwise. */
export function download(text: string, name: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * An export's file name, dated by the player's own calendar so a folder of backups sorts by day.
 * A recovery copy of an unreadable save, a problem report or a routine notebook is named apart, so it isn't mistaken
 * for a working export.
 */
export function saveFileName(date = new Date(), kind: 'save' | 'recovery' | 'report' | 'notebook' = 'save'): string {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0'));
  return `caffeine-protocol-${kind}-${day.join('-')}.json`;
}
