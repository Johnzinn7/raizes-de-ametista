import { readdir, readFile } from 'node:fs/promises';
import { createGame, validateLevel } from '../src/shared/engine';
import { advanceAction, solveLevel } from '../src/shared/solver';
import type { Level } from '../src/shared/types';
const files = (await readdir(new URL('../levels/', import.meta.url))).filter(f => f.endsWith('.json')).sort();
if (!files.length) throw new Error('Nenhuma fase encontrada.');
let failed = false;
for (const file of files) {
  const level: Level = JSON.parse(await readFile(new URL(`../levels/${file}`, import.meta.url), 'utf8'));
  const errors = validateLevel(level);
  const solution = errors.length ? null : solveLevel(level);
  if (errors.length || !solution?.solved) { failed = true; console.error(`FALHOU ${file}: ${errors.join('; ') || solution?.reason}`); }
  else {
    const replay = solution.actions.reduce((state, action) => advanceAction(state, action), createGame(level));
    if (replay.status !== 'won' || replay.diamonds !== replay.totalDiamonds || replay.players.some(p => p.deaths)) {
      failed = true; console.error(`FALHOU ${file}: a reprodução da solução não confirmou a vitória.`);
    } else console.log(`OK ${level.id} ${level.name}: BFS ${solution.visited} estados, ${solution.actions.length} ações, todas as gemas obrigatórias; replay confirmado.`);
  }
}
if (failed) process.exitCode = 1;
else console.log(`${files.length} fases solucionáveis pela simulação compartilhada.`);
