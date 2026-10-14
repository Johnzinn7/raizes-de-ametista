import { CONFIG, WORLDS } from '../shared/config';
import { at, pointKey, spikePhase } from '../shared/engine';
import type { GameState, GameEvent } from '../shared/types';
import { Atlas, hash, rock } from './art';
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
export class Renderer {
  private c: CanvasRenderingContext2D;
  private atlas = new Atlas();
  private positions = new Map<string, { x: number; y: number }>();
  private camera = { x: 0, y: 0 };
  private particles: Particle[] = [];
  private width = 640; private height = 480; private scale = 1.7;
  private shake = 0; private eventTick = -1; private lastTime = 0; private fade = 1;
  effects = true; world = 0; focusId = 'solo'; colors = ['#6d9e87', '#ba7e82'];
  fps = 60;
  constructor(readonly canvas: HTMLCanvasElement) { this.c = canvas.getContext('2d', { alpha: false })!; }
  reset() { this.positions.clear(); this.particles = []; this.fade = 1; this.eventTick = -1; }
  private resize() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(r.width * dpr) || this.canvas.height !== Math.round(r.height * dpr)) {
      this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    }
    this.width = r.width; this.height = r.height; this.scale = r.width < 600 ? 1.3 : 1.8;
    this.c.setTransform(dpr, 0, 0, dpr, 0, 0); this.c.imageSmoothingEnabled = false;
  }
  consume(events: GameEvent[]) {
    if (!events.length || events[0].tick === this.eventTick) return;
    this.eventTick = events[0].tick;
    if (!this.effects) return;
    for (const e of events) {
      if (e.kind === 'step') continue;
      if (e.kind === 'land') this.shake = 5;
      const color = e.kind === 'foliage' ? '#83b46b' : e.kind === 'death' ? '#e49c8b' : e.kind === 'land' || e.kind === 'push' ? '#b5ad7d' : e.kind === 'power' ? '#96dbdf' : '#d6b8fa';
      for (let i = 0; i < 12; i++) this.particles.push({ x: e.x * 32 + 16, y: e.y * 32 + 16, vx: Math.cos(i * 2.4) * (20 + i * 3), vy: Math.sin(i * 2.4) * 35 - 30, life: .5 + i % 3 * .1, color });
    }
    if (this.particles.length > 250) this.particles.splice(0, this.particles.length - 250);
  }
  render(state: GameState, time: number, ghost?: GameState) {
    this.resize();
    const dt = Math.min(.05, (time - this.lastTime) / 1000 || .016); this.lastTime = time;
    this.fps += (1 / Math.max(.001, dt) - this.fps) * .04;
    const c = this.c, tile = CONFIG.tileSize, frame = Math.floor(time / 180) % 4;
    c.fillStyle = '#101c18'; c.fillRect(0, 0, this.width, this.height);
    for (const p of state.players) {
      const key = `p${p.id}`, old = this.positions.get(key) ?? { x: p.x * tile, y: p.y * tile };
      const jump = Math.abs(old.x - p.x * tile) + Math.abs(old.y - p.y * tile) > tile * 3;
      old.x += (p.x * tile - old.x) * (jump ? 1 : Math.min(1, dt * 15)); old.y += (p.y * tile - old.y) * (jump ? 1 : Math.min(1, dt * 15)); this.positions.set(key, old);
    }
    const player = state.players.find(p => p.id === this.focusId) ?? state.players[0];
    const focus = this.positions.get(`p${player.id}`)!;
    const viewW = this.width / this.scale, viewH = this.height / this.scale;
    const cx = Math.max(0, Math.min(state.width * tile - viewW, focus.x + 16 - viewW / 2));
    const cy = Math.max(0, Math.min(state.height * tile - viewH, focus.y + 16 - viewH / 2));
    this.camera.x += (cx - this.camera.x) * Math.min(1, dt * 7); this.camera.y += (cy - this.camera.y) * Math.min(1, dt * 7);
    c.save(); c.scale(this.scale, this.scale);
    const shakeX = this.effects ? Math.sin(time * .12) * this.shake : 0; this.shake = Math.max(0, this.shake - dt * 20);
    c.translate(Math.round(-this.camera.x + shakeX), Math.round(-this.camera.y));
    const minX = Math.max(0, Math.floor(this.camera.x / tile) - 1), maxX = Math.min(state.width, Math.ceil((this.camera.x + viewW) / tile) + 1);
    const minY = Math.max(0, Math.floor(this.camera.y / tile) - 1), maxY = Math.min(state.height, Math.ceil((this.camera.y + viewH) / tile) + 1);
    for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
      let t = at(state, x, y), f = ',drs~=t*'.includes(t) ? frame : 0;
      if (t === 'G' && state.gates[pointKey({ x, y })]) t = '.';
      if (t === '!') f = { safe: 0, warning: 2, active: 3 }[spikePhase(state, { x, y })];
      if (t === 'E') f = frame + (state.diamonds >= state.quota ? 4 : 0);
      c.drawImage(this.atlas.tile(t, this.world, f, hash(x, y) % 4), x * tile, y * tile);
      if (t === '*' && this.effects) {
        const g = c.createRadialGradient(x * tile + 16, y * tile + 14, 3, x * tile + 16, y * tile + 14, 58);
        g.addColorStop(0, '#ffca6a28'); g.addColorStop(1, '#ffca6a00'); c.fillStyle = g; c.fillRect(x * tile - 42, y * tile - 44, 116, 116);
      }
    }
    for (const r of state.rocks) {
      const key = `r${r.id}`, pos = this.positions.get(key) ?? { x: r.x * tile, y: r.y * tile };
      const distance = r.x * tile - pos.x; pos.x += distance * Math.min(1, dt * 20); pos.y += (r.y * tile - pos.y) * Math.min(1, dt * 20); this.positions.set(key, pos);
      c.fillStyle = '#00000060'; c.fillRect(pos.x + 3, pos.y + 29 + (r.falling ? 5 : 0), 26, 3);
      c.save(); c.translate(Math.round(pos.x), Math.round(pos.y)); rock(c, distance * .025); c.restore();
    }
    for (const e of state.enemies) {
      if (!e.alive && state.tick - (e.diedAt ?? 0) > 8) continue;
      c.save(); c.translate(e.x * tile, e.y * tile); if (!e.alive) { c.globalAlpha = .4; c.translate(0, 22); c.scale(1, .25); }
      if (e.kind === 'snake') {
        c.fillStyle = '#15251e'; c.fillRect(4, 19, 25, 11); c.fillStyle = '#bc6d6c'; c.fillRect(6, 20, 22, 7); c.fillRect(18, 9 + frame % 2, 10, 14);
        c.fillStyle = '#efa98a'; c.fillRect(21, 11, 6, 4); c.fillStyle = '#1b2423'; c.fillRect(24, 12, 2, 2); c.fillStyle = '#e5b575'; c.fillRect(9, 23, 16, 2);
      } else {
        c.fillStyle = '#121a22'; c.beginPath(); c.moveTo(16, 11); c.lineTo(1, 5 + frame % 2 * 9); c.lineTo(3, 25); c.lineTo(16, 20); c.lineTo(30, 25); c.lineTo(31, 5 + frame % 2 * 9); c.closePath(); c.fill();
        c.fillStyle = '#98779d'; c.fillRect(3, 12 + frame % 2 * 5, 10, 7); c.fillRect(21, 12 + frame % 2 * 5, 9, 7); c.fillStyle = '#594769'; c.fillRect(13, 9, 9, 17); c.fillStyle = '#ffcdab'; c.fillRect(14, 13, 2, 2); c.fillRect(19, 13, 2, 2);
      } c.restore();
    }
    for (const d of state.darts) { c.fillStyle = '#e8cd9c'; c.fillRect(d.x * tile + 5, d.y * tile + 15, 23, 2); }
    for (const [i, p] of state.players.entries()) {
      if (p.deadUntil && state.tick < p.deadUntil - 8) continue;
      const pos = this.positions.get(`p${p.id}`)!;
      c.drawImage(this.atlas.player(p.direction, frame, this.colors[i] ?? this.colors[0], p.animation), Math.round(pos.x), Math.round(pos.y));
      if (state.players.length > 1) { c.fillStyle = '#fff1ca'; c.font = '8px monospace'; c.textAlign = 'center'; c.fillText(`P${i + 1}`, pos.x + 16, pos.y - 3); }
    }
    if (ghost) {
      const p = ghost.players[0]; c.save(); c.globalAlpha = .35;
      c.drawImage(this.atlas.player(p.direction, frame, '#e4b2df', p.animation), p.x * tile, p.y * tile); c.restore();
    }
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 110 * dt;
      c.globalAlpha = Math.max(0, p.life * 2); c.fillStyle = p.color; c.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    c.globalAlpha = 1; this.particles = this.particles.filter(p => p.life > 0);
    if (this.effects) for (let i = 0; i < 15; i++) {
      const n = hash(i, this.world + 42), x = n % (state.width * tile), y = (n % (state.height * tile) + time * .004 * (i % 2 ? 1 : -1) + state.height * tile) % (state.height * tile);
      c.fillStyle = `rgba(222,235,167,${.15 + Math.sin(time / 1200 + i) * .12})`; c.fillRect(x + Math.sin(time / 2000 + i) * 7, y, 1, 1);
    }
    c.restore();
    if (this.effects) { const g = c.createRadialGradient(this.width / 2, this.height / 2, this.width * .22, this.width / 2, this.height / 2, this.width * .7); g.addColorStop(0, '#07120f00'); g.addColorStop(1, '#07120f88'); c.fillStyle = g; c.fillRect(0, 0, this.width, this.height); }
    if (this.fade > 0) { this.fade = Math.max(0, this.fade - dt * 1.8); c.fillStyle = `rgba(12,24,19,${this.fade})`; c.fillRect(0, 0, this.width, this.height); }
  }
  thumbnail(world: number): string { return this.atlas.tile('E', world, 5).toDataURL(); }
}
