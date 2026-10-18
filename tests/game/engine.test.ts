import { describe, expect, it } from 'vitest';
import { createGame, step, at, stars } from '../../src/shared/engine';
import { advanceAction, solveLevel, stateKey } from '../../src/shared/solver';
import type { Level, GameState, Intent } from '../../src/shared/types';

export const level = (map: string[], extra: Partial<Level> = {}): Level => ({ id: 'test', name: 'Teste', world: 0, index: 1, quota: 0, targetSeconds: 120, hint: '', map, circuits: [], teleports: [], ...extra });
export function ticks(state: GameState, count: number, intent: Intent = {}): GameState { for (let i = 0; i < count; i++) state = step(state, { [state.players[0].id]: intent }); return state; }
describe('deterministic grid core', () => {
  it('replays identically after JSON transport, including autonomous timers', () => {
    let a = createGame(level(['#########','#@.d.O.E#','#....!..#','#n......#','#########'], { quota: 1 }));
    let b = JSON.parse(JSON.stringify(a)) as GameState;
    const directions = ['right', 'down', 'left', 'up'] as const;
    for (let i = 0; i < 240; i++) {
      const intent = { solo: { direction: directions[Math.floor(i / 15) % 4] } };
      a = step(a, intent); b = step(JSON.parse(JSON.stringify(b)), intent);
      expect(a).toEqual(b);
    }
  });
  it('is pure and reproducible', () => {
    const a = createGame(level(['#######','#@.,dE#','#.....#','#.....#','#######']));
    const before = JSON.stringify(a);
    expect(step(a, { solo: { direction: 'right' } })).toEqual(step(a, { solo: { direction: 'right' } }));
    expect(JSON.stringify(a)).toBe(before);
  });
  it('moves at 200ms, blocks walls, clears foliage and opens a quota exit', () => {
    let s = createGame(level(['#######','#@,d.E#','#.....#','#.....#','#######'], { quota: 1 }));
    s = ticks(s, 4, { direction: 'right' }); expect(s.players[0].x).toBe(2); expect(at(s, 2, 1)).toBe('.');
    s = ticks(s, 2, { direction: 'right' }); expect(s.diamonds).toBe(1);
    s = ticks(s, 10, { direction: 'right' }); expect(s.status).toBe('won');
  });
  it('pushes rocks and falls exactly every 240ms', () => {
    let s = createGame(level(['#######','#@O..E#','#.....#','#.....#','#######']));
    s = step(s, { solo: { direction: 'right' } }); expect(s.rocks[0].x).toBe(3);
    s = ticks(s, 4); expect(s.rocks[0].y).toBe(1);
    s = step(s); expect(s.rocks[0]).toMatchObject({ y: 2, falling: true });
  });
  it('solver uses simulation and rejects an impossible map', () => {
    expect(solveLevel(level(['#######','#@d..E#','#######','#.....#','#######'], { quota: 1 })).solved).toBe(true);
    expect(solveLevel(level(['#######','#@#d#E#','#######','#.....#','#######'], { quota: 1 }), 1000).solved).toBe(false);
  });
  it('scores stars independently', () => {
    let s = createGame(level(['#######','#@d..E#','#r....#','#.....#','#######'], { quota: 1 }));
    s = advanceAction(s, { direction: 'right' }); expect(stars(s)).toEqual([false, true, true]);
  });
  it('solver keeps real power and key discoveries between collection stages', () => {
    const map = level(['############', '#@fW..i~d.E#', '############', '#..........#', '############'], { quota: 1 });
    const solution = solveLevel(map); expect(solution.solved).toBe(true);
    expect(solution.actions.some(action => action.action === 'fire')).toBe(true);
    expect(solution.actions.some(action => action.action === 'ice')).toBe(true);
    const replay = solution.actions.reduce((s, action) => advanceAction(s, action), createGame(map));
    expect(replay.status).toBe('won'); expect(replay.players[0].deaths).toBe(0);
  });
  it('solver merges only states with equivalent death-free continuations', () => {
    const a = createGame(level(['#######', '#@...E#', '#.....#', '#.....#', '#######']));
    const b = structuredClone(a); b.players[0].direction = 'left'; b.players[0].checkpoint = { x: 4, y: 2 }; b.players[0].nextMove = 1;
    expect(stateKey(a)).toBe(stateKey(b));
    a.fire = b.fire = 1; expect(stateKey(a)).not.toBe(stateKey(b));
    a.fire = b.fire = 0; a.tiles[10] = b.tiles[10] = '!'; b.tick = 1; expect(stateKey(a)).not.toBe(stateKey(b));
    b.tick = 60; expect(stateKey(a)).toBe(stateKey(b));
    a.tiles[10] = b.tiles[10] = '.'; a.enemies.push({ x: 3, y: 2, kind: 'snake', direction: 'right', alive: true }); b.enemies = structuredClone(a.enemies);
    b.tick = 10; expect(stateKey(a)).toBe(stateKey(b)); b.tick = 5; expect(stateKey(a)).not.toBe(stateKey(b));
  });
  it('solver can activate two seals around a loop without repeatedly committing the same switch', () => {
    const map = level(['###########', '#@l...l.GE#', '#.d....####', '###########', '###########'], { quota: 1, circuits: [{ gates: [{ x: 8, y: 1 }], triggers: [{ x: 2, y: 1 }, { x: 6, y: 1 }], requireAll: true }] });
    const solution = solveLevel(map, 10000); expect(solution.solved).toBe(true);
    const replay = solution.actions.reduce((s, action) => advanceAction(s, action), createGame(map));
    expect(replay.status).toBe('won'); expect(Object.values(replay.levers)).toEqual([true, true]);
  });
});
