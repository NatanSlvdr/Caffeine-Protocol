import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CAMERA_ELEVATION, CAMERA_POSITION, CAMERA_TARGET, ROOM, STATIONS, cameraZoom, type RobotRole } from '@/domain';

/** Frame each robot's work area, including its reachable counters or dining tables. */
const robotViews = {
  query: { target: [-5, 0.7, 4.4], width: 8, depth: 5.5 },
  prep: { target: [2, 0.7, 4.3], width: 13, depth: 5.5 },
  floor: { target: [0, 0.7, -1], width: 17, depth: 11.5 },
} satisfies Record<RobotRole, { target: number[]; width: number; depth: number }>;
/** Half the room's depth plus its front rim: a focused view never frames empty space past the walls. */
const ROOM_EDGE = ROOM[1] / 2 + 0.5;
/** The room's right wall. The street runs along the left, so only this side can open onto nothing. */
const ROOM_RIGHT = ROOM[0] / 2 - 0.5;
/** The back edge of the kitchen counter: in the turned service view, the rightmost corner of the kitchen on screen. */
const COUNTER_BACK = STATIONS.water.cell[1] - 0.5;

/** Pan and zoom for editor focus or a scene-specific view. */
export function CameraFit({
  serviceView,
  reduced,
  focusRole,
  zoomScale = 1,
  cameraTarget,
  cameraAngleDegrees = 0,
}: {
  serviceView: boolean;
  reduced: boolean;
  focusRole?: RobotRole;
  zoomScale?: number;
  cameraTarget?: readonly [number, number, number];
  cameraAngleDegrees?: number;
}) {
  const { size, camera } = useThree();
  const angle = useRef(0),
    center = useRef<number[]>([...CAMERA_TARGET]),
    zoom = useRef(cameraZoom(size.width, size.height));
  useFrame((_, delta) => {
    const blend = reduced ? 1 : 1 - Math.exp(-delta * 5);
    const view = focusRole ? robotViews[focusRole] : undefined;
    angle.current += (((serviceView ? 10 : cameraAngleDegrees) * Math.PI) / 180 - angle.current) * blend;
    const cos = Math.cos(angle.current),
      sin = Math.abs(Math.sin(angle.current));
    const targetZoom = view
      ? Math.max(
          1,
          Math.min(
            size.width / (view.width * cos + view.depth * sin + 1),
            size.height /
              ((view.depth * cos + view.width * sin) * Math.sin(CAMERA_ELEVATION) +
                3.4 * Math.cos(CAMERA_ELEVATION) +
                1),
          ),
        )
      : cameraZoom(size.width, size.height) * (serviceView ? 0.8 : 1);
    // A width-bound view on a tall pane slides back into the room rather than showing the void beyond its front.
    const reach = size.height / 2 / (targetZoom * zoomScale * Math.sin(CAMERA_ELEVATION));
    const depth = view
      ? reach >= ROOM_EDGE
        ? 0
        : Math.max(reach - ROOM_EDGE, Math.min(ROOM_EDGE - reach, view.target[2]))
      : 0;
    // Slide along the turned camera's line of sight, so the view keeps its left-right framing.
    const along = view ? view.target[0] + (depth - view.target[2]) * Math.tan(angle.current) : 0;
    // A view narrower than the room then shifts left until the counter's right end meets the edge, rather than
    // framing the void past the wall.
    const halfWidth = size.width / 2 / (targetZoom * zoomScale);
    const across =
      halfWidth < ROOM[0] / 2
        ? Math.min(along, ROOM_RIGHT - (halfWidth + (COUNTER_BACK - depth) * Math.sin(angle.current)) / cos)
        : along;
    const target = view ? [across, view.target[1], depth] : (cameraTarget ?? CAMERA_TARGET);
    center.current = center.current.map((value, index) => value + (target[index] - value) * blend);
    zoom.current += (targetZoom * zoomScale - zoom.current) * blend;
    const radius = CAMERA_POSITION[2] - CAMERA_TARGET[2];
    camera.position.set(
      center.current[0] + Math.sin(angle.current) * radius,
      center.current[1] + CAMERA_POSITION[1] - CAMERA_TARGET[1],
      center.current[2] + cos * radius,
    );
    camera.zoom = zoom.current;
    camera.lookAt(center.current[0], center.current[1], center.current[2]);
    camera.updateProjectionMatrix();
  });
  return null;
}
