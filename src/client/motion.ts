import { CONFIG } from '../shared/config';
export interface Position { x: number; y: number }

/** Follow accepted grid positions at constant speed, preserving corners between snapshots. */
export class GridMotion {
  readonly position: Position;
  private pending: Position[] = [];
  private accepted: Position;
  constructor(position: Position) { this.position = { ...position }; this.accepted = { ...position }; }
  update(target: Position, seconds: number) {
    const distance = Math.abs(target.x - this.accepted.x) + Math.abs(target.y - this.accepted.y);
    if (distance > CONFIG.tileSize * 3) {
      Object.assign(this.position, target); this.pending = [];
    } else if (distance) this.pending.push({ ...target });
    this.accepted = { ...target };
    let remaining = Math.max(0, seconds) * CONFIG.tileSize * 1000 / CONFIG.moveMs;
    while (this.pending.length && remaining > 0) {
      const next = this.pending[0], dx = next.x - this.position.x, dy = next.y - this.position.y;
      const length = Math.hypot(dx, dy);
      if (length <= remaining) {
        Object.assign(this.position, next); this.pending.shift(); remaining -= length;
      } else {
        this.position.x += dx / length * remaining; this.position.y += dy / length * remaining; break;
      }
    }
    return this.position;
  }
}

/** Analytic critically damped spring; velocity stays continuous as the target moves. */
export function dampCamera(position: number, velocity: number, target: number, seconds: number) {
  const omega = 2 / CONFIG.cameraSmoothSeconds, delta = position - target;
  const decay = Math.exp(-omega * seconds), intermediate = velocity + omega * delta;
  return { position: target + (delta + intermediate * seconds) * decay, velocity: (velocity - omega * intermediate * seconds) * decay };
}
