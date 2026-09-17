import { describe, expect, it } from 'vitest';
import { OrthographicCamera, Vector3 } from 'three';
import { CAMPAIGN_LENGTH } from '../src/data';
import { TRAIL_ELEVATION, TRAIL_STOP_HEIGHT, TRAIL_UNITS, TRAIL_WIDTH, trailPoint, trailWorld } from '../src/domain/campaignTrail';

// Exercise the real projection: DOM targets must sit on the tops of their 3D stepping stones.
describe('trail camera alignment', () => {
  it.each([
    { width: 1000, height: 700, scrollTop: 0 },
    { width: 780, height: 500, scrollTop: 1100 },
    { width: 343, height: 520, scrollTop: 750 },
  ])('keeps all level buttons aligned at $width px wide and scroll $scrollTop', ({ width, height, scrollTop }) => {
    const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 250);
    const scale = width / TRAIL_WIDTH;
    camera.zoom = scale * TRAIL_UNITS;
    const center = (scrollTop + height / 2) / (camera.zoom * TRAIL_ELEVATION);
    camera.position.set(0, 20, center + 15);
    camera.lookAt(0, 0, center);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (let index = 0; index < CAMPAIGN_LENGTH; index++) {
      const point = trailPoint(index);
      const projected = new Vector3(...trailWorld(point));
      projected.y = TRAIL_STOP_HEIGHT;
      projected.project(camera);
      expect((projected.x + 1) * width / 2).toBeCloseTo(point.x * scale, 5);
      expect((1 - projected.y) * height / 2).toBeCloseTo((point.y - TRAIL_STOP_HEIGHT * TRAIL_UNITS * .6) * scale - scrollTop, 5);
    }
  });
});
