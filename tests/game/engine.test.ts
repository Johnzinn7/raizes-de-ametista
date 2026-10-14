import { describe, expect, it } from 'vitest';
import { createGame, step, at, stars } from '../../src/shared/engine';
import { advanceAction, solveLevel } from '../../src/shared/solver';
import type { Level, GameState, Intent } from '../../src/shared/types';

export const level = (map: string[], extra: Partial<Level> = {}): Level => ({ id: 'test', name: 'Teste', world: 0, index: 1, quota: 0, targetSeconds: 120, hint: '', map, circuits: [], teleports: [], ...extra });
export function ticks(state: GameState, count: number, intent: Intent = {}): GameState { for (let i = 0; i < count; i++) state = step(state, { [state.players[0].id]: intent }); return state; }
describe('deterministic grid core', () => {
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
});
