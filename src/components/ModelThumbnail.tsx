import { useEffect, useState } from 'react';
import { createRoot, extend, useFrame } from '@react-three/fiber';
import { AmbientLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry } from 'three';
import { Appliance, Cup, RobotModel } from './CafeModels';

type Model = 'coffee' | 'tea' | 'sugar' | 'robot';
const thumbnails = new Map<Model, Promise<string>>();
let queue = Promise.resolve();

/** Render the actual game geometry once per model; all selectors share the resulting image. */
function thumbnail(model: Model) {
  const cached = thumbnails.get(model);
  if (cached) return cached;
  const result = new Promise<string>((resolve, reject) => {
    queue = queue.then(async () => {
      extend({ AmbientLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry });
      const canvas = document.createElement('canvas');
      const root = createRoot(canvas);
      const robot = model === 'robot';
      await root.configure({
        size: { width: 128, height: 128, top: 0, left: 0 }, dpr: 2,
        gl: { alpha: true, antialias: true, preserveDrawingBuffer: true },
        orthographic: true, camera: { position: [2, 3, 5], zoom: robot ? 56 : 205, near: .1, far: 50 },
      });
      await new Promise<void>(done => {
        root.render(<><ambientLight intensity={1.5}/><directionalLight position={[-3, 6, 5]} intensity={2}/>
          {robot ? <group position={[0, -.95, 0]}><RobotModel/></group> : model === 'sugar' ? <group position={[0, -1.33, 0]}><Appliance id="sugar"/></group> : <Cup at={[0, -.15, 0]} tea={model === 'tea'}/>}
          <Capture center={model === 'tea'} onCapture={url => { resolve(url); done(); }}/></>);
      });
      root.unmount();
    }).catch(reject);
  });
  thumbnails.set(model, result);
  return result;
}

function Capture({ onCapture, center }: { onCapture: (url: string) => void; center: boolean }) {
  useFrame(({ gl, scene, camera }) => {
    camera.lookAt(0, 0, 0);
    gl.render(scene, camera);
    if (!center) { onCapture(gl.domElement.toDataURL('image/png')); return; }
    // Center the rendered silhouette, including the handle and tag, without changing its scale.
    const canvas = document.createElement('canvas');
    canvas.width = gl.domElement.width; canvas.height = gl.domElement.height;
    const context = canvas.getContext('2d');
    if (!context) { onCapture(gl.domElement.toDataURL('image/png')); return; }
    context.drawImage(gl.domElement, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (pixels[(y * canvas.width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right >= left) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(gl.domElement, Math.round((canvas.width - 1 - left - right) / 2), Math.round((canvas.height - 1 - top - bottom) / 2));
    }
    onCapture(canvas.toDataURL('image/png'));
  }, 1);
  return null;
}

export function ModelThumbnail({ model }: { model: Model }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (typeof WebGLRenderingContext === 'undefined') return;
    let active = true;
    void thumbnail(model).then(image => { if (active) setUrl(image); }).catch(() => {});
    return () => { active = false; };
  }, [model]);
  return <span className={'model-thumbnail model-' + model} aria-hidden="true">{url && <img src={url} alt=""/>}</span>;
}
