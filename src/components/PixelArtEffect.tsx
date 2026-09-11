import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PIXEL_SIZE = 2;

/** Pixelates the live 3D scene; HTML labels remain at the display's resolution. */
export function PixelArtEffect() {
  const { gl, scene, size, viewport, get } = useThree();
  const pipeline = useRef<{
    composer: EffectComposer;
    pixels: RenderPixelatedPass;
  } | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const pixels = new RenderPixelatedPass(PIXEL_SIZE, scene, get().camera, {
      normalEdgeStrength: 0.25,
      depthEdgeStrength: 0.35,
    });
    // Edge shading must not change the café's transparent background or opacity.
    pixels.pixelatedMaterial.fragmentShader = pixels.pixelatedMaterial.fragmentShader.replace(
      'gl_FragColor = texel * Strength;',
      'gl_FragColor = vec4(texel.rgb * Strength, texel.a);',
    );
    const output = new OutputPass();
    composer.addPass(pixels);
    composer.addPass(output);
    pipeline.current = { composer, pixels };
    return () => {
      pipeline.current = null;
      pixels.dispose();
      output.dispose();
      composer.dispose();
    };
  }, [gl, scene, get]);

  useEffect(() => {
    if (!pipeline.current) return;
    const { composer, pixels } = pipeline.current;
    // Keep the same apparent pixel size on standard and Retina displays.
    pixels.setPixelSize(PIXEL_SIZE * viewport.dpr);
    composer.setPixelRatio(viewport.dpr);
    composer.setSize(Math.max(PIXEL_SIZE, size.width), Math.max(PIXEL_SIZE, size.height));
  }, [gl, scene, size.width, size.height, viewport.dpr]);

  useFrame(({ camera }, delta) => {
    if (!pipeline.current) return;
    pipeline.current.pixels.camera = camera;
    pipeline.current.composer.render(delta);
  }, 1);

  return null;
}
