import type { Level } from './types';
/** Cooperative side vaults need a partner, while the campaign remains playable solo. */
export function cooperativeLevel(original: Level): Level {
  if (!original.coopVariant) return original;
  const level = structuredClone(original);
  const rows = level.map.map(r => r.split(''));
  for (const { x, y, tile } of level.coopVariant!.tiles) rows[y][x] = tile;
  level.map = rows.map(r => r.join(''));
  level.circuits.push(...level.coopVariant!.circuits);
  return level;
}
