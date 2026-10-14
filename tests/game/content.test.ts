import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createGame, step, validateLevel } from '../../src/shared/engine';
import { cooperativeLevel } from '../../src/shared/coop';
import type { Level } from '../../src/shared/types';
const levels: Level[] = readdirSync('levels').filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(`levels/${f}`, 'utf8')));
it('campaign contains 20 original large maps, four worlds, quotas and secrets', () => {
  expect(levels).toHaveLength(20); expect(new Set(levels.map(l => l.mechanic)).size).toBe(20);
  for (let world = 0; world < 4; world++) expect(levels.filter(l => l.world === world)).toHaveLength(5);
  for (const l of levels) {
    expect(validateLevel(l)).toEqual([]); expect(l.map.length).toBeGreaterThanOrEqual(24); expect(l.map[0].length).toBeGreaterThanOrEqual(24);
    expect(l.map.join('')).toContain('s'); expect(l.quota).toBeGreaterThan(0); expect(l.targetSeconds).toBeGreaterThan(0);
    expect(validateLevel(cooperativeLevel(l))).toEqual([]);
  }
});
it('co-op vaults add a held gate while preserving the original solo map', () => {
  const l = levels.find(l => l.coopVariant)!; const saved = JSON.stringify(l); const variant = cooperativeLevel(l);
  expect(JSON.stringify(l)).toBe(saved); expect(variant.circuits.length).toBe(l.circuits.length + 1);
  const gate = variant.coopVariant!.circuits[0].gates[0], plate = variant.coopVariant!.circuits[0].triggers[0];
  let s = createGame(variant, ['a', 'b'], 'coop'); Object.assign(s.players[0], plate); s = step(s);
  expect(s.gates[`${gate.x},${gate.y}`]).toBe(true);
});
it('a pushed rock can keep a pressure plate activated', () => {
  const l: Level = { id: 'plate', name: 'Placa', world: 0, index: 1, quota: 0, targetSeconds: 20, hint: '', map: ['#######','#@OpGE#','#######','#.....#','#######'], circuits: [{ gates: [{ x: 4, y: 1 }], triggers: [{ x: 3, y: 1 }] }], teleports: [] };
  const next = step(createGame(l), { solo: { direction: 'right' } }); expect(next.rocks[0].x).toBe(3); expect(next.gates['4,1']).toBe(true);
});
