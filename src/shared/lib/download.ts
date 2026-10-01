/** Trigger a JSON download in the browser. */
export function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** An export's file name, dated by the player's own calendar so a folder of backups sorts by day. */
export function saveFileName(date = new Date()): string {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0'));
  return `caffeine-protocol-save-${day.join('-')}.json`;
}
