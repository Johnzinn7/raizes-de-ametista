import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createGame, step, validateLevel } from '../src/shared/engine';
import { CONFIG } from '../src/shared/config';
import { solveLevel } from '../src/shared/solver';
import type { Level } from '../src/shared/types';
const selected = process.argv.slice(2).filter(arg => /^\d{2}$/.test(arg));
const files = (await readdir(new URL('../levels/', import.meta.url))).filter(f => f.endsWith('.json') && (!selected.length || selected.includes(f.slice(0, 2)))).sort();
if (!files.length) throw new Error('Nenhuma fase encontrada.');
let failed = false;
const report: Record<string, unknown>[] = [];
for (const file of files) {
  const level: Level = JSON.parse(await readFile(new URL(`../levels/${file}`, import.meta.url), 'utf8'));
  const errors = validateLevel(level);
  const solution = errors.length ? null : solveLevel(level);
  if (errors.length || !solution?.solved) { failed = true; console.error(`FALHOU ${file}: ${errors.join('; ') || solution?.reason}`); }
  else {
    let replay = createGame(level);
    const initial = [...replay.tiles], used = { push: 0, fire: 0, ice: 0, foliage: 0, land: 0, teleport: 0, timedSpikes: 0 };
    const levers = new Set<string>();
    for (const action of solution.actions) for (let tick = 0; tick < CONFIG.moveMs / CONFIG.tickMs; tick++) {
      const old = replay;
      replay = step(replay, tick === 0 ? { solo: action } : {});
      used.fire += Math.max(0, old.fire - replay.fire); used.ice += Math.max(0, old.ice - replay.ice);
      for (const event of replay.events) {
        if (event.kind === 'push' || event.kind === 'foliage' || event.kind === 'land') used[event.kind]++;
        if (event.kind === 'step' && initial[event.y * replay.width + event.x] === '!') used.timedSpikes++;
      }
      if (Math.abs(old.players[0].x - replay.players[0].x) + Math.abs(old.players[0].y - replay.players[0].y) > 1) used.teleport++;
      Object.entries(replay.levers).forEach(([key, on]) => { if (on) levers.add(key); });
    }
    const bridges = initial.filter((tile, i) => tile === '~' && replay.tiles[i] === '=').length;
    const doors = initial.filter((tile, i) => 'ABC'.includes(tile) && replay.tiles[i] === '.').length;
    const weights = replay.rocks.filter(rock => replay.tiles[rock.y * replay.width + rock.x] === 'p').length;
    const requirement: Record<string, boolean> = {
      foliage: used.foliage > 0, push: used.push > 0, bridge: bridges >= 2, 'yellow-key': doors >= 1,
      lever: levers.size >= 2, ice: used.ice >= 3, 'cyclic-spikes': used.timedSpikes >= 3,
      teleport: used.teleport >= 3, 'blue-key': used.ice > 0 && doors > 0,
      'falling-rock': used.land >= 2 && used.foliage > 0,
      fire: used.fire >= 4, 'red-key': used.fire >= 2 && doors > 0,
      snake: replay.enemies.some(enemy => enemy.kind === 'snake'), darts: level.map.join('').includes('>'),
      'pressure-plate': weights >= 2, bat: replay.enemies.some(enemy => enemy.kind === 'bat'),
      'colored-doors': doors === 3, 'element-combination': used.fire >= 4 && used.ice === 3,
      'all-trigger-circuit': levers.size >= 2,
      finale: used.push >= 4 && used.fire > 0 && used.ice > 0 && doors === 2 && weights >= 1,
    };
    if (replay.status !== 'won' || replay.diamonds !== replay.totalDiamonds || replay.players.some(p => p.deaths)) {
      failed = true; console.error(`FALHOU ${file}: a reprodução da solução não confirmou a vitória.`);
    } else if (level.layout && requirement[level.mechanic!] === false) {
      failed = true; console.error(`FALHOU ${file}: a solução evitou o puzzle principal. ${JSON.stringify({ ...used, bridges, doors, weights, levers: levers.size })}`);
    } else {
      report.push({ id: level.id, name: level.name, layout: level.layout, width: replay.width, height: replay.height, diamonds: replay.totalDiamonds, actions: solution.actions.length, visited: solution.visited, ...used, bridges, doors, weights, levers: levers.size });
      console.log(`OK ${level.id} ${level.name}: ${replay.width}×${replay.height}, BFS ${solution.visited} estados, ${solution.actions.length} ações; todas as gemas, puzzle e replay confirmados.`);
    }
  }
}
if (failed) process.exitCode = 1;
else {
  console.log(`${files.length} fases solucionáveis pela simulação compartilhada.`);
  if (!selected.length) await writeFile(new URL('../docs/campaign-validation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
