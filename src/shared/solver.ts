import { createGame, step } from './engine';
import { CONFIG, type Direction } from './config';
import type { GameState, Intent, Level } from './types';

export interface Solution { solved: boolean; actions: Intent[]; visited: number; reason?: string }
export const advanceAction = (state: GameState, intent: Intent): GameState => {
  let next = step(state, { [state.players[0].id]: intent });
  for (let t = 1; t < CONFIG.moveMs / CONFIG.tickMs; t++) next = step(next);
  return next;
};
const actions: Intent[] = [...(['up', 'right', 'down', 'left'] as Direction[]).map(direction => ({ direction })), {}, { action: 'fire' }, { action: 'ice' }];
export function stateKey(s: GameState): string {
  const dynamic = s.rocks.length || s.enemies.some(e => e.alive) || s.tiles.some(t => '!><uv'.includes(t));
  return JSON.stringify([dynamic ? s.tick % 120 : 0, s.tiles.join(''), s.players.map(p => [p.x, p.y, p.direction, Math.max(0, p.nextMove - s.tick), p.deadUntil ? p.deadUntil - s.tick : 0, p.checkpoint, p.exited, p.teleportLock]), s.rocks, s.enemies.map(e => [e.x, e.y, e.direction, e.alive]), s.darts, s.diamonds, s.bonus, s.keys, s.fire, s.ice, s.levers]);
}
/** BFS through real simulation states, in collection stages to bound campaign validation. */
export function solveLevel(level: Level, maxStates: number = CONFIG.maxSolverStates): Solution {
  let current = createGame(level);
  let visited = 0;
  const result: Intent[] = [];
  // Every successful segment commits its actual world state, including rocks and timers.
  while (current.status !== 'won') {
    const diamondsBefore = current.diamonds;
    const collecting = diamondsBefore < current.totalDiamonds;
    const nodes: { state: GameState; parent: number; action: Intent }[] = [{ state: current, parent: -1, action: {} }];
    const seen = new Set<string>([stateKey(current)]);
    let found = -1;
    for (let head = 0; head < nodes.length && found < 0; head++) {
      if (++visited > maxStates) return { solved: false, actions: result, visited, reason: 'Limite de estados excedido.' };
      for (const intent of actions) {
        const next = advanceAction(nodes[head].state, intent);
        if (next.players[0].deaths || (!collecting && next.status !== 'won' && next.players[0].exited)) continue;
        // Do not exit before every mandatory diamond has been collected.
        if (next.status === 'won' && next.diamonds < next.totalDiamonds) continue;
        const key = stateKey(next); if (seen.has(key)) continue;
        seen.add(key);
        const index = nodes.push({ state: next, parent: head, action: intent }) - 1;
        if (collecting ? next.diamonds > diamondsBefore : next.status === 'won') { found = index; break; }
      }
    }
    if (found < 0) return { solved: false, actions: result, visited, reason: 'Nenhum caminho seguro encontrado.' };
    const segment: Intent[] = [];
    for (let i = found; nodes[i].parent >= 0; i = nodes[i].parent) segment.push(nodes[i].action);
    result.push(...segment.reverse()); current = nodes[found].state;
  }
  return { solved: true, actions: result, visited };
}
