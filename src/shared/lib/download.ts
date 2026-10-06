/** Trigger a download in the browser: JSON unless said otherwise. */
export function download(text: string, name: string, type = 'application/json'): void {
  downloadBlob(new Blob([text], { type }), name);
}

/** Trigger a download of a file already made: a photo of the café. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
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

/** A photo's file name, dated and timed by the player's own clock, so a morning's photos sort in the order taken. */
export function photoFileName(date = new Date()): string {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0'));
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((n) => String(n).padStart(2, '0'));
  return `caffeine-protocol-photo-${day.join('-')}-${time.join('')}.png`;
}
