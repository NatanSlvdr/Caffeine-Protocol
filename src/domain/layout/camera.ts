import { ROOM } from './geometry';

export const CAMERA_ELEVATION = (70 * Math.PI) / 180;
// Adjust this value in degrees to change the slight sideways view.
const CAMERA_ANGLE_DEGREES = 0;
export const CAMERA_AZIMUTH = (CAMERA_ANGLE_DEGREES * Math.PI) / 180;
const SCENE_SIZE = [24, ROOM[1]] as const;
export const CAMERA_TARGET = [-3.6, 0.2, -0.5] as const;
export const CAMERA_POSITION: [number, number, number] = [
  CAMERA_TARGET[0] + (Math.sin(CAMERA_AZIMUTH) * 40) / Math.tan(CAMERA_ELEVATION),
  CAMERA_TARGET[1] + 40,
  CAMERA_TARGET[2] + (Math.cos(CAMERA_AZIMUTH) * 40) / Math.tan(CAMERA_ELEVATION),
];
/** Fit the café, neighboring street, and tallest fixtures with an edge-safe gutter. */
export function cameraZoom(width: number, height: number) {
  return Math.max(
    1,
    Math.min(
      width / (SCENE_SIZE[0] * Math.cos(CAMERA_AZIMUTH) + SCENE_SIZE[1] * Math.sin(CAMERA_AZIMUTH) + 1),
      height /
        ((SCENE_SIZE[1] * Math.cos(CAMERA_AZIMUTH) + SCENE_SIZE[0] * Math.sin(CAMERA_AZIMUTH)) *
          Math.sin(CAMERA_ELEVATION) +
          3.4 * Math.cos(CAMERA_ELEVATION) +
          1),
    ),
  );
}
