import { Box } from './primitives';

/** Three small sugar cubes shared by order icons and menu selectors. */
export function SugarCubes() {
 return <group rotation-y={.25}>
  <Box at={[-.105,-.04,.06]} size={[.18,.18,.18]} color="#fff7e7"/>
  <Box at={[.105,-.04,.06]} size={[.18,.18,.18]} color="#eee4d3"/>
  <Box at={[0,.14,.01]} size={[.18,.18,.18]} color="#fffaf0"/>
 </group>;
}

