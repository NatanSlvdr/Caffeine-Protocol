import { createRoot, extend, useFrame } from '@react-three/fiber';
import {
  AmbientLight,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  CylinderGeometry,
  TorusGeometry,
  SphereGeometry,
} from 'three';
import { SugarCubes } from '../cafe/SugarCubes';
import { Cup } from '../cafe/Cup';
import { RobotModel } from '../cafe/RobotModel';
import type { ThumbnailModel } from './thumbnailCache';

const THUMBNAIL_ZOOM_ROBOT = 56;
const THUMBNAIL_ZOOM_ITEM = 205;

function Capture({ onCapture, center }: { onCapture: (url: string) => void; center: boolean }) {
  useFrame(({ gl, scene, camera }) => {
    camera.lookAt(0, 0, 0);
    gl.render(scene, camera);
    if (!center) {
      onCapture(gl.domElement.toDataURL('image/png'));
      return;
    }
    // Center the rendered silhouette, including the handle and tag, without changing its scale.
    const canvas = document.createElement('canvas');
    canvas.width = gl.domElement.width;
    canvas.height = gl.domElement.height;
    const context = canvas.getContext('2d');
    if (!context) {
      onCapture(gl.domElement.toDataURL('image/png'));
      return;
    }
    context.drawImage(gl.domElement, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width,
      right = -1,
      top = canvas.height,
      bottom = -1;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 8) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    if (right >= left) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(gl.domElement, Math.round((canvas.width - 1 - left - right) / 2), Math.round((canvas.height - 1 - top - bottom) / 2));
    }
    onCapture(canvas.toDataURL('image/png'));
  }, 1);
  return null;
}

/** Render the actual game geometry offscreen; resolves once the capture frame lands. */
export function renderThumbnail(model: ThumbnailModel): Promise<string> {
  return (async () => {
    extend({ AmbientLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry });
    const canvas = document.createElement('canvas');
    const root = createRoot(canvas);
    const robot = model === 'robot';
    await root.configure({
      size: { width: 128, height: 128, top: 0, left: 0 },
      dpr: 2,
      gl: { alpha: true, antialias: true, preserveDrawingBuffer: true },
      orthographic: true,
      camera: { position: [2, 3, 5], zoom: robot ? THUMBNAIL_ZOOM_ROBOT : THUMBNAIL_ZOOM_ITEM, near: 0.1, far: 50 },
    });
    const url = await new Promise<string>((done) => {
      root.render(
        <>
          <ambientLight intensity={1.5} />
          <directionalLight position={[-3, 6, 5]} intensity={2} />
          {robot ? (
            <group position={[0, -0.95, 0]}>
              <RobotModel />
            </group>
          ) : model === 'sugar' ? (
            <SugarCubes />
          ) : (
            <Cup at={[0, -0.15, 0]} tea={model === 'tea'} />
          )}
          <Capture center={model === 'tea'} onCapture={done} />
        </>,
      );
    });
    root.unmount();
    return url;
  })();
}
