import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CAMERA_ELEVATION, CAMERA_POSITION, CAMERA_TARGET, cameraZoom, type RobotRole } from '@/domain';

/** Frame each robot's work area, including its reachable counters or dining tables. */
const robotViews = {
  query: { target: [-5, 0.7, 4.4], width: 8, depth: 5.5 },
  prep: { target: [2.5, 0.7, 4.3], width: 12, depth: 5.5 },
  floor: { target: [0, 0.7, -1], width: 17, depth: 11.5 },
} satisfies Record<RobotRole, { target: number[]; width: number; depth: number }>;

/** Pan and zoom together when the code editor switches robots. */
export function CameraFit({
  serviceView,
  reduced,
  focusRole,
}: {
  serviceView: boolean;
  reduced: boolean;
  focusRole?: RobotRole;
}) {
  const { size, camera } = useThree();
  const angle = useRef(0),
    center = useRef<number[]>([...CAMERA_TARGET]),
    zoom = useRef(cameraZoom(size.width, size.height));
  useFrame((_, delta) => {
    const blend = reduced ? 1 : 1 - Math.exp(-delta * 5);
    const view = focusRole ? robotViews[focusRole] : undefined;
    const target = view?.target ?? CAMERA_TARGET;
    angle.current += ((serviceView ? (10 * Math.PI) / 180 : 0) - angle.current) * blend;
    center.current = center.current.map((value, index) => value + (target[index] - value) * blend);
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
    zoom.current += (targetZoom - zoom.current) * blend;
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

