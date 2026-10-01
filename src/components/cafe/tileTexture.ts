import { CanvasTexture, SRGBColorSpace } from 'three';

/** Pixels per quarter-tile square: enough for a crisp grout line at the café's zoom. */
const SQUARE = 64;

/** Cream and sage quarry tiles in a checkerboard, four squares to a floor tile, for the staff side of the counter. */
export function tileTexture(width: number, depth: number) {
  const columns = width * 4,
    rows = depth * 4;
  const canvas = document.createElement('canvas');
  canvas.width = columns * SQUARE;
  canvas.height = rows * SQUARE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#cfc6b2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        // A faint tone shift per square keeps the checkerboard from looking printed.
        const dark = (row + col) % 2 === 1;
        const shade = ((row * 7 + col * 3) % 5) - 2;
        ctx.fillStyle = dark
          ? `rgb(${134 + shade},${153 + shade},${138 + shade})`
          : `rgb(${238 + shade},${230 + shade},${212 + shade})`;
        ctx.fillRect(col * SQUARE + 2, row * SQUARE + 2, SQUARE - 4, SQUARE - 4);
      }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
