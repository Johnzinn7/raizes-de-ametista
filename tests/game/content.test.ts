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
it('campaign keeps twenty distinct plans, varied dimensions and a clear difficulty sequence', () => {
  expect(new Set(levels.map(l => l.layout)).size).toBe(20);
  expect(new Set(levels.map(l => `${l.map[0].length}x${l.map.length}`)).size).toBeGreaterThanOrEqual(16);
  expect(new Set(levels.map(l => l.map.join('').replace(/#/g, '').length)).size).toBeGreaterThanOrEqual(16);
  expect(levels.map(l => l.difficulty)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  expect(Math.max(...levels.map(l => l.map.length * l.map[0].length))).toBeGreaterThan(1600);
});
it('no two campaign silhouettes become copies after rescaling and rotation', () => {
  const silhouettes = levels.map(level => {
    const cells = new Set<number>();
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (!'#*'.includes(level.map[Math.floor(y * level.map.length / 32)][Math.floor(x * level.map[0].length / 32)])) cells.add(y * 32 + x);
    }
    return cells;
  });
  for (let a = 0; a < levels.length; a++) for (let b = a + 1; b < levels.length; b++) {
    let rotated = silhouettes[b];
    for (let turn = 0; turn < 4; turn++) {
      const intersection = [...silhouettes[a]].filter(cell => rotated.has(cell)).length;
      const union = silhouettes[a].size + rotated.size - intersection;
      expect(intersection / union, `${levels[a].id}/${levels[b].id}, rotation ${turn}`).toBeLessThan(.88);
      rotated = new Set([...rotated].map(cell => cell % 32 * 32 + 31 - Math.floor(cell / 32)));
    }
  }
});
it('all cooperative treasure gates have isolated secret alcoves without a bypass', () => {
  const variants = levels.filter(l => l.coopVariant); expect(variants).toHaveLength(12);
  for (const level of variants) {
    const variant = cooperativeLevel(level), gate = variant.coopVariant!.circuits[0].gates[0];
    const width = level.map[0].length, plate = variant.coopVariant!.circuits[0].triggers[0], start = plate.y * width + plate.x;
    const seen = new Set<number>([start]), queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head], x = index % width, y = Math.floor(index / width);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= level.map.length || seen.has(next) || '#*'.includes(level.map[ny][nx]) || nx === gate.x && ny === gate.y) continue;
        seen.add(next); queue.push(next);
      }
    }
    const secret = level.map.join('').indexOf('s'); expect(seen.has(secret), level.id).toBe(false);
  }
});
it('a pushed rock can keep a pressure plate activated', () => {
  const l: Level = { id: 'plate', name: 'Placa', world: 0, index: 1, quota: 0, targetSeconds: 20, hint: '', map: ['#######','#@OpGE#','#######','#.....#','#######'], circuits: [{ gates: [{ x: 4, y: 1 }], triggers: [{ x: 3, y: 1 }] }], teleports: [] };
  const next = step(createGame(l), { solo: { direction: 'right' } }); expect(next.rocks[0].x).toBe(3); expect(next.gates['4,1']).toBe(true);
});
