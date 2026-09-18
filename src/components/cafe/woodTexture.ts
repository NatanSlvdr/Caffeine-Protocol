import { CanvasTexture, SRGBColorSpace } from 'three';

/** Staggered oak boards and fine grain stay independent of the editable tile grid. */
export function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const boardWidth = 256,
      boardHeight = 64;
    const tones = ['#b9926a', '#c09b74', '#b68f69', '#c4a17a', '#bd9670'];
    for (let row = 0; row < 24; row++) {
      for (let col = -1; col < 8; col++) {
        const x = (col * boardWidth + ((row % 3) * boardWidth) / 3),
          y = row * boardHeight;
        const seed = row * 17 + (col + 1) * 13;
        ctx.fillStyle = tones[seed % tones.length];
        ctx.fillRect(x, y, boardWidth, boardHeight);
        ctx.strokeStyle = '#725334';
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, boardWidth - 2, boardHeight - 2);
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.13;
        for (let grain = 0; grain < 6; grain++) {
          const gy = y + 8 + grain * 9;
          ctx.beginPath();
          ctx.moveTo(x + 10, gy);
          ctx.bezierCurveTo(x + 80, gy + Math.sin(seed + grain) * 7, x + 175, gy - 4, x + 244, gy + 1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
