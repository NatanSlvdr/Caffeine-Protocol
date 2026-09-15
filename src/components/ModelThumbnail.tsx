import { useEffect, useState } from 'react';
import { createRoot, extend, useFrame } from '@react-three/fiber';
import { AmbientLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry } from 'three';
import { Cup, RobotModel } from './CafeModels';

type Model = 'coffee' | 'tea' | 'robot';
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
          {robot ? <group position={[0, -.95, 0]}><RobotModel/></group> : <Cup at={[0, -.15, 0]} tea={model === 'tea'}/>}
          <Capture onCapture={url => { resolve(url); done(); }}/></>);
      });
      root.unmount();
    }).catch(reject);
  });
  thumbnails.set(model, result);
  return result;
}

function Capture({ onCapture }: { onCapture: (url: string) => void }) {
  useFrame(({ gl, scene, camera }) => {
    camera.lookAt(0, 0, 0);
    gl.render(scene, camera);
    onCapture(gl.domElement.toDataURL('image/png'));
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
