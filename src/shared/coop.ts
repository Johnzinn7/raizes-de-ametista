import type { Level } from './types';
/** Cooperative side vaults need a partner, while the campaign remains playable solo. */
export function cooperativeLevel(original: Level): Level {
  if (original.index < 3) return original;
  const level = structuredClone(original);
  // Campaign generator reserves this side vault in all 25x25 levels.
  if (level.map[21]?.[17] !== 's' || level.map[21]?.[15] !== '.') return level;
  const rows = level.map.map(r => r.split(''));
  rows[21][14] = 'p'; rows[21][16] = 'G'; rows[20][17] = '#'; rows[22][17] = '#'; rows[21][18] = '#';
  level.map = rows.map(r => r.join(''));
  level.circuits.push({ gates: [{ x: 16, y: 21 }], triggers: [{ x: 14, y: 21 }] });
  return level;
}
