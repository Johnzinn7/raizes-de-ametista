import { at, createGame, step } from './engine';
import { CONFIG, DIRECTIONS, type Direction } from './config';
import type { GameState, Intent, Level } from './types';

export interface Solution { solved: boolean; actions: Intent[]; visited: number; reason?: string }
export const advanceAction = (state: GameState, intent: Intent): GameState => {
  let next = step(state, { [state.players[0].id]: intent });
  for (let t = 1; t < CONFIG.moveMs / CONFIG.tickMs; t++) next = step(next);
  return next;
};
const actions: Intent[] = [...(['up', 'right', 'down', 'left'] as Direction[]).map(direction => ({ direction })), {}, { action: 'fire' }, { action: 'ice' }];
export function stateKey(s: GameState): string {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  let period = 1;
  const include = (milliseconds: number) => { const ticks = milliseconds / CONFIG.tickMs; period = period * ticks / gcd(period, ticks); };
  if (s.rocks.length) include(CONFIG.gravityMs);
  if (s.enemies.some(enemy => enemy.alive)) include(CONFIG.enemyMs);
  if (s.darts.length) include(CONFIG.dartStepMs);
  let spikes = false, statues = false;
  for (const tile of s.tiles) { spikes ||= tile === '!'; statues ||= '><uv'.includes(tile); }
  if (spikes) include(CONFIG.spikeCycleMs);
  if (statues) { include(CONFIG.dartMs); include(CONFIG.dartStepMs); }
  // Checkpoints and facing without a power cannot change a death-free continuation.
  // Cooldowns of 0 and 1 are equivalent: step() advances a tick before reading input.
  return JSON.stringify([s.tick % period, s.tiles.join(''), s.players.map(p => [p.x, p.y, s.fire || s.ice ? p.direction : '', Math.max(0, p.nextMove - s.tick - 1), p.deadUntil ? p.deadUntil - s.tick : 0, p.exited, p.teleportLock]), s.rocks, s.enemies.map(e => [e.x, e.y, e.direction, e.alive]), s.darts, s.diamonds, s.bonus, s.keys, s.fire, s.ice, s.levers]);
}
/** BFS through real simulation states, in collection stages to bound campaign validation. */
export function solveLevel(level: Level, maxStates: number = CONFIG.maxSolverStates): Solution {
  let current = createGame(level);
  let visited = 0;
  const result: Intent[] = [];
  const activated = new Set<string>();
  // Every successful segment commits its actual world state, including rocks and timers.
  while (current.status !== 'won') {
    const diamondsBefore = current.diamonds;
    const collecting = diamondsBefore < current.totalDiamonds;
    const nodes: { state: GameState; parent: number; action: Intent }[] = [{ state: current, parent: -1, action: {} }];
    const seen = new Set<string>([stateKey(current)]);
    let found = -1;
    for (let head = 0; head < nodes.length && found < 0; head++) {
      if (++visited > maxStates) return { solved: false, actions: result, visited, reason: `Limite de estados excedido (${current.diamonds}/${current.totalDiamonds} gemas).` };
      for (const intent of actions) {
        if (intent.action) {
          const state = nodes[head].state, player = state.players[0], [dx, dy] = DIRECTIONS[player.direction];
          const tile = at(state, player.x + dx, player.y + dy);
          if (intent.action === 'fire' ? !state.fire || !'XW,'.includes(tile) : !state.ice || tile !== '~') continue;
        }
        const next = advanceAction(nodes[head].state, intent);
        if (next.players[0].deaths || (!collecting && next.status !== 'won' && next.players[0].exited)) continue;
        // Do not exit before every mandatory diamond has been collected.
        if (next.status === 'won' && next.diamonds < next.totalDiamonds) continue;
        const key = stateKey(next); if (seen.has(key)) continue;
        seen.add(key);
        const index = nodes.push({ state: next, parent: head, action: intent }) - 1;
        const discovery = next.fire > current.fire || next.ice > current.ice || next.keys.some((count, i) => count > current.keys[i]) || Object.entries(next.levers).some(([key, on]) => on && !activated.has(key));
        if ((collecting ? next.diamonds > diamondsBefore : next.status === 'won') || discovery) { found = index; break; }
      }
    }
    if (found < 0) return { solved: false, actions: result, visited, reason: `Nenhum caminho seguro encontrado (${current.diamonds}/${current.totalDiamonds} gemas).` };
    const segment: Intent[] = [];
    for (let i = found; nodes[i].parent >= 0; i = nodes[i].parent) segment.push(nodes[i].action);
    result.push(...segment.reverse()); current = nodes[found].state;
    Object.entries(current.levers).forEach(([key, on]) => { if (on) activated.add(key); });
  }
  return { solved: true, actions: result, visited };
}
