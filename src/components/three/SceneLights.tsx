/** Shared café lighting: ambient + hemisphere fill + a shadow-casting sun. */
export function SceneLights({ evening }: { evening: boolean }) {
  return (
    <>
      <ambientLight intensity={evening ? 0.65 : 1.1} color={evening ? '#c6c9e4' : '#f4f4ed'} />
      <hemisphereLight args={['#f1f3ed', '#607477', 1.1]} />
      <directionalLight
        position={[-8, 18, 8]}
        intensity={2}
        color="#ffe7ca"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-normalBias={0.04}
      />
    </>
  );
}
