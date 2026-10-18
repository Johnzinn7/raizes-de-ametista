import { expect, it } from 'vitest';
import { GridMotion, dampCamera } from '../../src/client/motion';
import { CONFIG } from '../../src/shared/config';

it('finishes a visual step in 120 ms while preserving the 200 ms gameplay cadence', () => {
  const motion = new GridMotion({ x: 0, y: 0 });
  expect(CONFIG.moveMs).toBe(200); expect(CONFIG.visualMoveMs).toBe(120);
  for (let i = 1; i <= 12; i++) expect(motion.update({ x: 32, y: 0 }, .01).x).toBeCloseTo(i * 32 / 12);
  expect(motion.update({ x: 32, y: 0 }, .5)).toEqual({ x: 32, y: 0 });
});
it('has the same travel speed at 30, 60 and 120 FPS', () => {
  for (const fps of [30, 60, 120]) {
    const motion = new GridMotion({ x: 0, y: 0 });
    for (let i = 0; i < fps / 10; i++) motion.update({ x: 32, y: 0 }, 1 / fps);
    expect(motion.position.x).toBeCloseTo(32 * 100 / CONFIG.visualMoveMs);
  }
});
it('keeps queued turns on the grid when a snapshot arrives before interpolation finishes', () => {
  const motion = new GridMotion({ x: 0, y: 0 });
  motion.update({ x: 32, y: 0 }, .06);
  expect(motion.update({ x: 32, y: 32 }, .03)).toEqual({ x: 24, y: 0 });
  expect(motion.update({ x: 32, y: 32 }, .09)).toEqual({ x: 32, y: 16 });
});
it('snaps teleport jumps and discards the previous visual path', () => {
  const motion = new GridMotion({ x: 0, y: 0 }); motion.update({ x: 32, y: 0 }, .1);
  expect(motion.update({ x: 320, y: 320 }, .016)).toEqual({ x: 320, y: 320 });
});
it('camera starts gently, converges without overshoot and behaves consistently across frame rates', () => {
  const first = dampCamera(0, 0, 32, 1 / 60); expect(first.position).toBeLessThan(1);
  const endings = [30, 60, 120].map(fps => {
    let axis = { position: 0, velocity: 0 };
    for (let i = 0; i < fps * 2; i++) { axis = dampCamera(axis.position, axis.velocity, 32, 1 / fps); expect(axis.position).toBeLessThanOrEqual(32); }
    return axis.position;
  });
  expect(endings[0]).toBeCloseTo(32, 2); expect(endings[0]).toBeCloseTo(endings[2], 6);
});
