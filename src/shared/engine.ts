import { CONFIG, DIRECTIONS, type Direction } from './config';
import type { GameState, Level, Point, Intent, Player, GameEvent } from './types';

export const at = (state: GameState, x: number, y: number): string => x < 0 || y < 0 || x >= state.width || y >= state.height ? '#' : state.tiles[y * state.width + x];
export const pointKey = (p: Point): string => `${p.x},${p.y}`;
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const put = (s: GameState, p: Point, tile: string) => { s.tiles[p.y * s.width + p.x] = tile; };
const event = (s: GameState, kind: GameEvent['kind'], p: Point) => s.events.push({ kind, ...p, tick: s.tick });
export const spikePhase = (s: GameState, p: Point): 'safe' | 'warning' | 'active' => {
  const time = s.tick * CONFIG.tickMs % CONFIG.spikeCycleMs;
  const linked = s.circuits.some(c => c.traps?.some(t => same(t, p)));
  if (linked && !s.gates[`trap:${pointKey(p)}`]) return 'safe';
  return time >= CONFIG.spikeCycleMs - CONFIG.spikeActiveMs ? 'active' : time >= CONFIG.spikeCycleMs - CONFIG.spikeActiveMs - CONFIG.spikeWarningMs ? 'warning' : 'safe';
};
export function validateLevel(level: Level): string[] {
  const errors: string[] = [];
  if (!level || !Array.isArray(level.map) || !level.map.length || typeof level.map[0] !== 'string') return ['Mapa ausente.'];
  const w = level.map[0].length;
  if (w < 5 || w > 64 || level.map.length < 5 || level.map.length > 64) errors.push('Dimensões entre 5 e 64.');
  if (level.map.some(r => typeof r !== 'string' || r.length !== w || /[^#.,drOh~^!abcABClpGtf i$XWPEs*>v<unm@2=]/.test(r))) errors.push('Tiles inválidos ou linhas irregulares.');
  const all = level.map.join('');
  if (all.split('@').length !== 2 || !all.includes('E')) errors.push('Defina um início e uma saída.');
  if (!Number.isInteger(level.quota) || level.quota < 0 || level.quota > (all.match(/d/g) ?? []).length) errors.push('Cota inválida.');
  if (!Number.isFinite(level.targetSeconds) || level.targetSeconds <= 0) errors.push('Tempo-alvo inválido.');
  if (!Number.isInteger(level.world) || level.world < 0 || level.world > 3) errors.push('Mundo inválido.');
  if (!Array.isArray(level.circuits) || !Array.isArray(level.teleports)) return [...errors, 'Circuitos ou teleportes ausentes.'];
  const validPoint = (p: Point) => p && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < w && p.y < level.map.length;
  for (const c of level.circuits) {
    if (!c || !Array.isArray(c.gates) || !Array.isArray(c.triggers) || (c.traps !== undefined && !Array.isArray(c.traps)) || !c.triggers.length || [...c.gates, ...c.triggers, ...(c.traps ?? [])].some(p => !validPoint(p))) errors.push('Circuito inválido.');
  }
  for (const pair of level.teleports) if (!Array.isArray(pair) || pair.length !== 2 || pair.some(p => !validPoint(p) || level.map[p.y][p.x] !== 't')) errors.push('Par de teleportes inválido.');
  if (typeof level.name !== 'string' || typeof level.id !== 'string' || typeof level.hint !== 'string') errors.push('Nome, identificador ou dica inválidos.');
  if (level.coopVariant && (!Array.isArray(level.coopVariant.tiles) || !Array.isArray(level.coopVariant.circuits) || level.coopVariant.tiles.some(p => !validPoint(p) || typeof p.tile !== 'string' || p.tile.length !== 1))) errors.push('Variante cooperativa inválida.');
  return errors;
}
export function createGame(level: Level, ids = ['solo'], mode: GameState['mode'] = 'solo'): GameState {
  const errors = validateLevel(level); if (errors.length) throw new Error(errors.join(' '));
  const width = level.map[0].length;
  const tiles = level.map.join('').split('');
  const start = tiles.indexOf('@'), second = tiles.indexOf('2');
  const pos = (i: number) => ({ x: i % width, y: Math.floor(i / width) });
  const rocks: GameState['rocks'] = [], enemies: GameState['enemies'] = [];
  tiles.forEach((tile, i) => {
    if (tile === 'O') rocks.push({ ...pos(i), falling: false, id: i });
    if (tile === 'n' || tile === 'm') enemies.push({ ...pos(i), kind: tile === 'n' ? 'snake' : 'bat', direction: 'right', alive: true });
    if ('O@2nm '.includes(tile)) tiles[i] = '.';
  });
  return {
    levelId: level.id, width, height: level.map.length, tiles, rocks, enemies, darts: [],
    players: ids.map((id, i) => ({ id, ...pos(i && second >= 0 ? second : start), checkpoint: pos(i && second >= 0 ? second : start), direction: 'down', nextMove: 0, deadUntil: 0, deaths: 0, exited: false, teleportLock: false, animation: 'idle', animationUntil: 0 })),
    circuits: structuredClone(level.circuits), teleports: structuredClone(level.teleports),
    tick: 0, diamonds: 0, bonus: 0, totalDiamonds: tiles.filter(t => t === 'd').length,
    totalBonus: tiles.reduce((n, t) => n + (t === 'r' || t === 's' ? 1 : t === '$' ? 3 : 0), 0),
    quota: level.quota, targetSeconds: level.targetSeconds, keys: [0, 0, 0], fire: 0, ice: 0,
    levers: {}, gates: {}, secrets: 0, mode, status: 'playing', events: [],
  };
}
function occupied(s: GameState, p: Point, except?: Player): boolean {
  return s.players.some(o => o !== except && !o.deadUntil && !o.exited && same(o, p));
}
function enemyAt(s: GameState, p: Point) { return s.enemies.find(e => e.alive && same(e, p)); }
function blocking(s: GameState, p: Point): boolean {
  const t = at(s, p.x, p.y);
  return '#XW~ABC><uv*'.includes(t) || (t === 'G' && !s.gates[pointKey(p)]);
}
function circuits(s: GameState) {
  for (const c of s.circuits) {
    const triggers = c.triggers.map(p => at(s, p.x, p.y) === 'l' ? !!s.levers[pointKey(p)] : occupied(s, p) || s.rocks.some(r => same(r, p)));
    const open = c.requireAll ? triggers.every(Boolean) : triggers.some(Boolean);
    for (const g of c.gates) s.gates[pointKey(g)] = open;
    for (const t of c.traps ?? []) s.gates[`trap:${pointKey(t)}`] = open;
  }
}
function kill(s: GameState, p: Player) {
  if (p.deadUntil || p.exited) return;
  p.deaths++; p.deadUntil = s.tick + (s.mode === 'coop' ? CONFIG.respawnMs / CONFIG.tickMs : 1);
  p.animation = 'die'; p.animationUntil = p.deadUntil; event(s, 'death', p);
}
function rockSink(s: GameState, r: Point): boolean {
  if ('h~'.includes(at(s, r.x, r.y))) { put(s, r, at(s, r.x, r.y) === '~' ? '=' : '.'); event(s, 'land', r); return true; }
  return false;
}
function move(s: GameState, p: Player, direction: Direction) {
  p.direction = direction;
  const [dx, dy] = DIRECTIONS[direction], dest = { x: p.x + dx, y: p.y + dy };
  const tile = at(s, dest.x, dest.y);
  const door = 'ABC'.indexOf(tile);
  if (door >= 0 && s.keys[door] > 0) { s.keys[door]--; put(s, dest, '.'); event(s, 'door', dest); }
  if (blocking(s, dest) || occupied(s, dest, p)) return;
  const rock = s.rocks.find(r => same(r, dest));
  let pushed = false;
  if (rock) {
    const next = { x: rock.x + dx, y: rock.y + dy };
    if (!'.=h~p'.includes(at(s, next.x, next.y)) || occupied(s, next) || enemyAt(s, next) || s.rocks.some(r => same(r, next))) return;
    Object.assign(rock, next, { falling: false });
    if (rockSink(s, rock)) s.rocks = s.rocks.filter(r => r !== rock);
    pushed = true; event(s, 'push', dest);
  }
  Object.assign(p, dest); p.animation = pushed ? 'push' : 'walk'; p.animationUntil = s.tick + CONFIG.moveMs / CONFIG.tickMs;
  event(s, 'step', p);
  if (tile === ',') { put(s, p, '.'); event(s, 'foliage', p); }
  if (tile === 'd') { s.diamonds++; put(s, p, '.'); event(s, 'collect', p); }
  if (tile === 'r' || tile === 's') { s.bonus++; put(s, p, '.'); event(s, tile === 's' ? 'secret' : 'collect', p); if (tile === 's') s.secrets++; }
  const key = 'abc'.indexOf(tile); if (key >= 0) { s.keys[key]++; put(s, p, '.'); event(s, 'collect', p); }
  if ('fi$'.includes(tile)) {
    if (tile === 'f') s.fire += CONFIG.powerUses;
    if (tile === 'i') s.ice += CONFIG.powerUses;
    if (tile === '$') s.bonus += 3;
    put(s, p, '.'); event(s, 'collect', p);
  }
  if (tile === 'P') { p.checkpoint = { ...dest }; if (s.mode === 'coop') s.players.forEach(o => { o.checkpoint = { ...dest }; }); event(s, 'checkpoint', p); }
  if (tile === 'l') { s.levers[pointKey(p)] = !s.levers[pointKey(p)]; event(s, 'door', p); }
  if (tile === 't' && !p.teleportLock) {
    const pair = s.teleports.find(pair => pair.some(t => same(t, p)));
    const target = pair?.find(t => !same(t, p));
    if (target && !occupied(s, target, p) && !s.rocks.some(r => same(r, target))) { Object.assign(p, target); p.teleportLock = true; event(s, 'power', p); }
  } else if (tile !== 't') p.teleportLock = false;
  const landed = at(s, p.x, p.y);
  if (landed === 'h' || landed === '^' || (landed === '!' && spikePhase(s, p) === 'active') || enemyAt(s, p) || s.darts.some(d => same(d, p))) kill(s, p);
}
function usePower(s: GameState, p: Player, action: 'fire' | 'ice') {
  const [dx, dy] = DIRECTIONS[p.direction], dest = { x: p.x + dx, y: p.y + dy }, tile = at(s, dest.x, dest.y);
  if (action === 'fire' && s.fire > 0 && 'XW,'.includes(tile)) { s.fire--; put(s, dest, '.'); event(s, 'power', dest); }
  else if (action === 'ice' && s.ice > 0 && tile === '~') { s.ice--; put(s, dest, '='); event(s, 'power', dest); }
  else return;
  p.animation = 'use'; p.animationUntil = s.tick + 6;
}
function gravity(s: GameState) {
  const sunk = new Set<number>();
  for (const rock of [...s.rocks].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const next = { x: rock.x, y: rock.y + 1 }, tile = at(s, next.x, next.y);
    const victim = s.players.find(p => !p.deadUntil && !p.exited && same(p, next));
    const foe = enemyAt(s, next);
    if (!'.=h~p'.includes(tile) || s.rocks.some(r => r !== rock && same(r, next)) || (victim && !rock.falling) || (foe && !rock.falling)) {
      if (rock.falling) event(s, 'land', rock);
      rock.falling = false; continue;
    }
    if (victim) kill(s, victim);
    if (foe) { foe.alive = false; foe.diedAt = s.tick; event(s, 'enemy', foe); }
    rock.y++; rock.falling = true;
    if (rockSink(s, rock)) sunk.add(rock.id);
  }
  s.rocks = s.rocks.filter(r => !sunk.has(r.id));
}
const reverse: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
function enemies(s: GameState) {
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (e.kind === 'bat') {
      const target = s.players.filter(p => !p.deadUntil && !p.exited).sort((a, b) => (Math.abs(a.x - e.x) + Math.abs(a.y - e.y)) - (Math.abs(b.x - e.x) + Math.abs(b.y - e.y)))[0];
      if (!target || Math.abs(target.x - e.x) + Math.abs(target.y - e.y) > CONFIG.batRange) continue;
      e.direction = Math.abs(target.x - e.x) >= Math.abs(target.y - e.y) ? target.x > e.x ? 'right' : 'left' : target.y > e.y ? 'down' : 'up';
    }
    const [dx, dy] = DIRECTIONS[e.direction], dest = { x: e.x + dx, y: e.y + dy };
    if (blocking(s, dest) || 'h^!dri$fPst'.includes(at(s, dest.x, dest.y)) || s.rocks.some(r => same(r, dest)) || s.enemies.some(o => o !== e && o.alive && same(o, dest))) { e.direction = reverse[e.direction]; continue; }
    Object.assign(e, dest);
  }
}
function darts(s: GameState) {
  const directions: Record<string, Direction> = { '>': 'right', '<': 'left', u: 'up', v: 'down' };
  if (s.tick * CONFIG.tickMs % CONFIG.dartMs === 0) s.tiles.forEach((t, i) => {
    const pos = { x: i % s.width, y: Math.floor(i / s.width) };
    const linked = s.circuits.some(c => c.traps?.some(p => same(p, pos)));
    if (directions[t] && (!linked || s.gates[`trap:${pointKey(pos)}`])) s.darts.push({ ...pos, direction: directions[t] });
  });
  s.darts = s.darts.filter(d => {
    const [dx, dy] = DIRECTIONS[d.direction]; d.x += dx; d.y += dy;
    if (blocking(s, d) || s.rocks.some(r => same(r, d))) return false;
    for (const p of s.players) if (same(p, d)) kill(s, p);
    return true;
  });
}
/** Advance exactly one fixed tick. Inputs and the previous state are never mutated. */
export function step(previous: GameState, intents: Record<string, Intent> = {}): GameState {
  if (previous.status === 'won') return previous;
  const s: GameState = { ...previous, tick: previous.tick + 1, tiles: [...previous.tiles],
    players: previous.players.map(p => ({ ...p, checkpoint: { ...p.checkpoint } })), rocks: previous.rocks.map(r => ({ ...r })),
    enemies: previous.enemies.map(e => ({ ...e })), darts: previous.darts.map(d => ({ ...d })),
    keys: [...previous.keys], gates: { ...previous.gates }, levers: { ...previous.levers }, events: [] };
  circuits(s);
  for (const p of s.players) {
    if (p.exited) continue;
    if (p.deadUntil) {
      if (s.tick < p.deadUntil) continue;
      const safe = [p.checkpoint, ...Object.values(DIRECTIONS).map(([dx, dy]) => ({ x: p.checkpoint.x + dx, y: p.checkpoint.y + dy }))].find(q => !blocking(s, q) && !occupied(s, q, p) && !s.rocks.some(r => same(r, q)) && !enemyAt(s, q) && !'h^!'.includes(at(s, q.x, q.y)));
      if (!safe) { p.deadUntil++; continue; }
      Object.assign(p, safe); p.deadUntil = 0; p.teleportLock = false; p.animation = 'idle'; p.nextMove = s.tick + 5;
    }
    if (s.tick >= p.animationUntil) p.animation = 'idle';
    if (s.tick >= p.nextMove) {
      const intent = intents[p.id];
      if (intent?.direction && DIRECTIONS[intent.direction]) move(s, p, intent.direction);
      if (intent?.action && !p.deadUntil) usePower(s, p, intent.action);
      if (intent?.direction || intent?.action) p.nextMove = s.tick + CONFIG.moveMs / CONFIG.tickMs;
    }
  }
  circuits(s);
  if (s.tick * CONFIG.tickMs % CONFIG.gravityMs === 0) gravity(s);
  if (s.tick * CONFIG.tickMs % CONFIG.enemyMs === 0) enemies(s);
  if (s.tick * CONFIG.tickMs % CONFIG.dartStepMs === 0) darts(s);
  for (const p of s.players) {
    if (p.deadUntil || p.exited) continue;
    const t = at(s, p.x, p.y);
    if (t === 'h' || t === '^' || (t === '!' && spikePhase(s, p) === 'active') || enemyAt(s, p) || s.darts.some(d => same(d, p))) kill(s, p);
    if (!p.deadUntil && t === 'E' && s.diamonds >= s.quota) { p.exited = true; p.animation = 'celebrate'; }
  }
  if (s.players.every(p => p.exited)) { s.status = 'won'; event(s, 'win', s.players[0]); }
  return s;
}
export function stars(s: GameState): boolean[] {
  return [s.diamonds === s.totalDiamonds && s.bonus === s.totalBonus, s.players.every(p => p.deaths === 0), s.tick * CONFIG.tickMs <= s.targetSeconds * 1000];
}
