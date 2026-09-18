import { CanvasTexture, SRGBColorSpace } from 'three';
import { useCanvasTexture } from './useCanvasTexture';

/** Canvas-backed lettering texture; disposes itself when the label changes. */
export function useTextSprite(label: string) {
  return useCanvasTexture(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#29484a';
      context.font = '700 44px ui-monospace, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const width = context.measureText(label).width;
      const scale = Math.min(1, 430 / Math.max(1, width));
      context.save();
      context.translate(256, 64);
      context.scale(scale, scale);
      context.fillText(label, 0, 0);
      context.restore();
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [label]);
}
