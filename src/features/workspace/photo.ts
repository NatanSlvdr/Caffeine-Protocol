import type { RobotRole } from '@/domain';

/** The framings photo mode offers: the whole café, or one robot's corner of it. */
export const PHOTO_VIEWS = [
  { id: 'cafe', label: 'Whole café' },
  { id: 'query', label: 'Counter' },
  { id: 'prep', label: 'Kitchen' },
  { id: 'floor', label: 'Dining room' },
] as const;
export type PhotoView = (typeof PHOTO_VIEWS)[number]['id'];

/** The robot whose corner a framing shows; the whole café has none. */
export const photoFocus = (view: PhotoView): RobotRole | undefined => (view === 'cafe' ? undefined : view);

/** What is written under a photo, the way a print is labelled by hand. */
export interface PhotoCaption {
  /** The shift: "Shift 07 · The Lunch Line". */
  title: string;
  /** The moment of service: "Round 2 · 14.3 s", or "Before opening" for a café not yet serving. */
  moment: string;
  /** The day it was taken: "6 October 2026". */
  date: string;
}

export const photoCaption = ({
  label,
  title,
  when,
  date = new Date(),
}: {
  label: string;
  title: string;
  /** The moment of service on screen, if a service is on screen. */
  when?: string;
  date?: Date;
}): PhotoCaption => ({
  title: `${label} · ${title}`,
  moment: when ?? 'Before opening',
  date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
});

/** The desk's own colours, from the workspace: the café is drawn over them. */
const DESK = { paper: '#fffcf4', rule: '#e3d6c1', ink: '#392b24', muted: '#766659', light: '#e2e9d8', far: '#f6f4ed' };
/** A memory's old-photo colours, as the workspace draws them. */
const OLD_PHOTO = 'sepia(0.45) saturate(0.8) brightness(1.03)';

/**
 * Mounts a shot of the café as a print: on the desk's background, in a paper border with the caption written along
 * its foot. A memory keeps its old-photo colours. Where the browser can't draw a print, the shot comes back as it is.
 */
export async function framePhoto(shot: Blob, caption: PhotoCaption, { memory = false } = {}): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return shot;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return shot;
  const image = await createImageBitmap(shot);
  const { width, height } = image;
  const margin = Math.round(Math.max(16, width * 0.03));
  const titleSize = Math.round(Math.max(15, width * 0.021));
  const smallSize = Math.round(titleSize * 0.68);
  const foot = Math.round(titleSize * 3.6);
  canvas.width = width + margin * 2;
  canvas.height = height + margin + foot;

  context.fillStyle = DESK.paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const desk = context.createRadialGradient(
    margin + width * 0.3,
    margin + height * 0.48,
    0,
    margin + width * 0.3,
    margin + height * 0.48,
    Math.hypot(width, height) * 0.7,
  );
  desk.addColorStop(0, DESK.light);
  desk.addColorStop(1, DESK.far);
  context.fillStyle = desk;
  context.fillRect(margin, margin, width, height);
  if (memory) context.filter = OLD_PHOTO;
  context.drawImage(image, margin, margin);
  context.filter = 'none';
  image.close();
  context.strokeStyle = DESK.rule;
  context.lineWidth = 1;
  context.strokeRect(margin - 0.5, margin - 0.5, width + 1, height + 1);

  const line = height + margin + foot * 0.42;
  const under = line + titleSize * 0.95;
  context.textBaseline = 'middle';
  context.fillStyle = DESK.ink;
  context.font = `${titleSize}px Georgia, 'Times New Roman', serif`;
  context.fillText(caption.title, margin, line, width * 0.68);
  context.fillStyle = DESK.muted;
  context.font = `italic ${titleSize}px Georgia, 'Times New Roman', serif`;
  context.textAlign = 'right';
  context.fillText('Caffeine Protocol', margin + width, line, width * 0.3);
  context.font = `600 ${smallSize}px system-ui, sans-serif`;
  context.fillText(caption.date, margin + width, under, width * 0.3);
  context.textAlign = 'left';
  context.fillText(caption.moment, margin, under, width * 0.68);

  return new Promise((resolve) => canvas.toBlob((print) => resolve(print ?? shot), 'image/png'));
}
