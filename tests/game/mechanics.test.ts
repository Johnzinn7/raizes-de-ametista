import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/shared/config';
import { at, createGame, step, spikePhase, validateLevel } from '../../src/shared/engine';
import { advanceAction } from '../../src/shared/solver';
import type { GameState, Intent, Level } from '../../src/shared/types';
const fixture = (map: string[], extra: Partial<Level> = {}): Level => ({ id: 'test', name: 'Teste', world: 0, index: 1, quota: 0, targetSeconds: 120, hint: '', map, circuits: [], teleports: [], ...extra });
function tick(s: GameState, n: number, input: Record<string, Intent> = {}) { for (let i = 0; i < n; i++) s = step(s, input); return s; }
const base = ['#########','#@......#','#.......#','#.......#','#......E#','#.......#','#########'];
describe('rocks and gravity', () => {
  it.each(['up', 'right', 'down', 'left'] as const)('can push %s into an empty cell', direction => {
    const s = createGame(fixture(base)); Object.assign(s.players[0], { x: 4, y: 3 });
    const delta = { up: [0, -1], down: [0, 1], right: [1, 0], left: [-1, 0] }[direction];
    s.rocks = [{ x: 4 + delta[0], y: 3 + delta[1], falling: false, id: 1 }];
    const next = step(s, { solo: { direction } }); expect(next.rocks[0]).toMatchObject({ x: 4 + delta[0] * 2, y: 3 + delta[1] * 2 });
  });
  it.each(['#', ',', 'd', 'A', 'B', 'C', 'r', 'X', 'W'])('rests on blocking tile %s', tile => {
    const s = createGame(fixture(base)); s.rocks = [{ x: 5, y: 2, falling: false, id: 1 }]; s.tiles[3 * s.width + 5] = tile;
    expect(tick(s, 6).rocks[0].y).toBe(2);
  });
  it('rests on another rock and processes stacks from the bottom', () => {
    const s = createGame(fixture(base)); s.rocks = [{ x: 4, y: 2, falling: false, id: 1 }, { x: 4, y: 3, falling: false, id: 2 }];
    const next = tick(s, 6); expect(next.rocks.map(r => r.y)).toEqual([3, 4]);
  });
  it('blocks pushing into another rock, foliage, diamond or player', () => {
    for (const tile of ['#', ',', 'd', 'A']) {
      const s = createGame(fixture(base)); s.rocks = [{ x: 2, y: 1, falling: false, id: 1 }]; s.tiles[s.width + 3] = tile;
      expect(step(s, { solo: { direction: 'right' } }).players[0].x).toBe(1);
    }
    const s = createGame(fixture(base), ['a', 'b'], 'coop'); s.rocks = [{ x: 2, y: 1, falling: false, id: 1 }]; Object.assign(s.players[1], { x: 3, y: 1 });
    expect(step(s, { a: { direction: 'right' } }).rocks[0].x).toBe(2);
  });
  it.each([['h', '.'], ['~', '=']])('fills %s and leaves %s', (tile, result) => {
    const s = createGame(fixture(base)); s.rocks = [{ x: 4, y: 2, falling: false, id: 1 }]; s.tiles[3 * s.width + 4] = tile;
    const next = tick(s, 6); expect(next.rocks).toHaveLength(0); expect(at(next, 4, 3)).toBe(result);
  });
  it('does not crush from rest, but crushes while already falling', () => {
    const s = createGame(fixture(base)); s.rocks = [{ x: 1, y: 0, falling: false, id: 1 }];
    expect(tick(s, 6).players[0].deaths).toBe(0); s.rocks[0].falling = true;
    expect(tick(s, 6).players[0].deaths).toBe(1);
  });
  it('enemy blocks a resting rock and is killed by a falling rock', () => {
    const s = createGame(fixture(base)); s.rocks = [{ x: 4, y: 2, falling: false, id: 1 }]; s.enemies = [{ x: 4, y: 3, direction: 'right', alive: true, kind: 'snake' }];
    expect(tick(s, 6).rocks[0].y).toBe(2); s.rocks[0].falling = true;
    const next = tick(s, 6); expect(next.enemies[0].alive).toBe(false); expect(next.rocks[0].y).toBe(3);
  });
});
describe('inventory, terrain and checkpoints', () => {
  it.each([['a', 'A', 0], ['b', 'B', 1], ['c', 'C', 2]] as const)('key %s opens only %s', (key, door, index) => {
    let s = createGame(fixture(['#########',`#@${key}${door}...E#`,'#.......#','#.......#','#########']));
    s = advanceAction(s, { direction: 'right' }); expect(s.keys[index]).toBe(1);
    s = advanceAction(s, { direction: 'right' }); expect(s.keys[index]).toBe(0); expect(s.players[0].x).toBe(3);
    s.tiles[s.width + 4] = ['B', 'C', 'A'][index]; s = advanceAction(s, { direction: 'right' }); expect(s.players[0].x).toBe(3);
  });
  it('chests grant limited fire, ice or bonus gems', () => {
    let s = createGame(fixture(['#########','#@fi$..E#','#.......#','#.......#','#########']));
    s = advanceAction(s, { direction: 'right' }); expect(s.fire).toBe(CONFIG.powerUses);
    s = advanceAction(s, { direction: 'right' }); expect(s.ice).toBe(CONFIG.powerUses);
    s = advanceAction(s, { direction: 'right' }); expect(s.bonus).toBe(3);
  });
  it.each(['X', 'W', ','])('fire burns %s and consumes one charge', tile => {
    const s = createGame(fixture(base)); s.players[0].direction = 'right'; s.fire = 1; s.tiles[s.width + 2] = tile;
    const next = step(s, { solo: { action: 'fire' } }); expect(next.fire).toBe(0); expect(at(next, 2, 1)).toBe('.');
    expect(step(s, { solo: { action: 'ice' } }).tiles).toEqual(s.tiles);
  });
  it('water blocks movement, ice freezes only the tile ahead', () => {
    let s = createGame(fixture(base)); s.ice = 2; s.tiles[s.width + 2] = '~';
    s = advanceAction(s, { direction: 'right' }); expect(s.players[0].x).toBe(1);
    s = advanceAction(s, { action: 'ice' }); expect(at(s, 2, 1)).toBe('='); expect(s.ice).toBe(1);
    s = advanceAction(s, { direction: 'right' }); expect(s.players[0].x).toBe(2);
  });
  it.each(['h', '^'])('%s kills; solo retry keeps collected diamonds and checkpoint', tile => {
    let s = createGame(fixture(['#########',`#@dP${tile}..E#`,'#.......#','#.......#','#########'], { quota: 1 }));
    s = advanceAction(s, { direction: 'right' }); s = advanceAction(s, { direction: 'right' });
    s = advanceAction(s, { direction: 'right' }); expect(s.players[0].deaths).toBe(1); expect(s.players[0].x).toBe(3); expect(s.diamonds).toBe(1);
  });
  it('red gems and secret tiles do not count toward the exit quota', () => {
    let s = createGame(fixture(['#########','#@rs..dE#','#.......#','#.......#','#########'], { quota: 1 }));
    s = advanceAction(s, { direction: 'right' }); s = advanceAction(s, { direction: 'right' });
    expect(s.diamonds).toBe(0); expect(s.bonus).toBe(2); expect(s.secrets).toBe(1);
  });
  it('teleports in pairs, does not bounce and can return after leaving', () => {
    let s = createGame(fixture(['#########','#@t....E#','#.......#','#.....t.#','#########'], { teleports: [[{ x: 2, y: 1 }, { x: 6, y: 3 }]] }));
    s = advanceAction(s, { direction: 'right' }); expect(s.players[0]).toMatchObject({ x: 6, y: 3 });
    s = tick(s, 10); expect(s.players[0].x).toBe(6);
    s = advanceAction(s, { direction: 'left' }); s = advanceAction(s, { direction: 'right' }); expect(s.players[0]).toMatchObject({ x: 2, y: 1 });
  });
  it('rejects invalid imported levels before simulation', () => {
    expect(validateLevel(fixture(['####','#@E#']))).not.toEqual([]);
    expect(() => createGame(fixture(['#####','#@ZE#','#####','#...#','#####']))).toThrow();
  });
});
describe('traps, enemies and cooperation', () => {
  it('contact kills immediately even if the enemy would move away on this tick', () => {
    const s = createGame(fixture(base)); s.tick = 9; s.enemies = [{ x: 2, y: 1, direction: 'right', alive: true, kind: 'snake' }];
    const next = step(s, { solo: { direction: 'right' } }); expect(next.players[0].deaths).toBe(1); expect(next.enemies[0].x).toBe(3);
  });
  it('spikes have safe, warning and active phases', () => {
    const s = createGame(fixture(base)); const p = { x: 2, y: 1 };
    expect(spikePhase(s, p)).toBe('safe'); s.tick = 30; expect(spikePhase(s, p)).toBe('warning'); s.tick = 40; expect(spikePhase(s, p)).toBe('active');
    s.tiles[s.width + 2] = '!'; expect(step(s, { solo: { direction: 'right' } }).players[0].deaths).toBe(1);
  });
  it('lever toggles a gate, pressure plate releases when unoccupied', () => {
    const circuits = [{ gates: [{ x: 4, y: 1 }], triggers: [{ x: 2, y: 1 }] }];
    let s = createGame(fixture(['#########','#@l.G..E#','#.......#','#.......#','#########'], { circuits }));
    s = advanceAction(s, { direction: 'right' }); expect(s.gates['4,1']).toBe(true);
    s = advanceAction(s, { direction: 'left' }); s = advanceAction(s, { direction: 'right' }); expect(s.gates['4,1']).toBe(false);
    s.tiles[s.width + 2] = 'p'; s = step(s); expect(s.gates['4,1']).toBe(true);
    s = advanceAction(s, { direction: 'left' }); expect(s.gates['4,1']).toBe(false);
  });
  it('pressure circuits support rocks, all-trigger gates and linked traps', () => {
    const s = createGame(fixture(base, { circuits: [{ gates: [{ x: 5, y: 3 }], triggers: [{ x: 2, y: 3 }, { x: 3, y: 3 }], traps: [{ x: 4, y: 3 }], requireAll: true }] }));
    s.tiles[3 * s.width + 2] = 'p'; s.tiles[3 * s.width + 3] = 'p'; s.tiles[3 * s.width + 4] = '!';
    s.rocks = [{ x: 2, y: 3, id: 1, falling: false }]; expect(step(s).gates['5,3']).toBe(false);
    Object.assign(s.players[0], { x: 3, y: 3 }); const next = step(s); expect(next.gates['5,3']).toBe(true); expect(next.gates['trap:4,3']).toBe(true);
  });
  it('dart statues fire on a fixed interval and walls stop projectiles', () => {
    const s = createGame(fixture(['#########','#>@....E#','#.......#','#.......#','#########']));
    s.tick = CONFIG.dartMs / CONFIG.tickMs - 1;
    expect(step(s).players[0].deaths).toBe(1);
    s.tiles[s.width + 2] = '#'; expect(tick(s, 20).darts).toHaveLength(0);
  });
  it('snake patrols and reverses on an obstacle; contact kills', () => {
    const s = createGame(fixture(base)); s.enemies = [{ x: 6, y: 2, kind: 'snake', alive: true, direction: 'right' }];
    const a = tick(s, 10); expect(a.enemies[0].x).toBe(7);
    const b = tick(a, 10); expect(b.enemies[0].direction).toBe('left');
    Object.assign(s.enemies[0], { x: 2, y: 1, direction: 'left' }); expect(tick(s, 10).players[0].deaths).toBeGreaterThan(0);
  });
  it('bat pursues a player only inside its range', () => {
    const s = createGame(fixture(base)); s.enemies = [{ x: 5, y: 2, kind: 'bat', alive: true, direction: 'right' }];
    expect(tick(s, 10).enemies[0].x).toBe(4); s.enemies[0].x = 8; expect(tick(s, 10).enemies[0].x).toBe(8);
  });
  it('co-op shares inventory, needs both explorers and respawns after 3s', () => {
    let s = createGame(fixture(['#########','#@d..E..#','#2..h...#','#.......#','#########'], { quota: 1 }), ['a', 'b'], 'coop');
    s = tick(s, 20, { a: { direction: 'right' } }); expect(s.diamonds).toBe(1); expect(s.players[0].exited).toBe(true); expect(s.status).toBe('playing');
    Object.assign(s.players[1], { x: 4, y: 2 }); s = step(s); const deadAt = s.tick; expect(s.players[1].deadUntil - deadAt).toBe(75);
    s = tick(s, 74); expect(s.players[1].deadUntil).toBeGreaterThan(0); s = step(s); expect(s.players[1].deadUntil).toBe(0);
    Object.assign(s.players[1], { x: 5, y: 1 }); s = step(s); expect(s.status).toBe('won');
  });
  it('a second explorer can hold the plate while the first crosses', () => {
    let s = createGame(fixture(['#########','#@p.G..E#','#2......#','#.......#','#########'], { circuits: [{ gates: [{ x: 4, y: 1 }], triggers: [{ x: 2, y: 1 }] }] }), ['a', 'b'], 'coop');
    Object.assign(s.players[1], { x: 2, y: 1 }); s = tick(s, 15, { a: { direction: 'right' } }); expect(s.players[0].x).toBe(1);
    Object.assign(s.players[0], { x: 3, y: 1 }); s = tick(s, 5, { a: { direction: 'right' } }); expect(s.players[0].x).toBe(4);
  });
});
