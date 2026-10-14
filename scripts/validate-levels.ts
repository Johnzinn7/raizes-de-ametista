import { readdir, readFile } from 'node:fs/promises';
import { validateLevel } from '../src/shared/engine';
import { solveLevel } from '../src/shared/solver';
import type { Level } from '../src/shared/types';
const files = (await readdir(new URL('../levels/', import.meta.url))).filter(f => f.endsWith('.json')).sort();
if (!files.length) throw new Error('Nenhuma fase encontrada.');
let failed = false;
for (const file of files) {
  const level: Level = JSON.parse(await readFile(new URL(`../levels/${file}`, import.meta.url), 'utf8'));
  const errors = validateLevel(level);
  const solution = errors.length ? null : solveLevel(level);
  if (errors.length || !solution?.solved) { failed = true; console.error(`FALHOU ${file}: ${errors.join('; ') || solution?.reason}`); }
  else console.log(`OK ${level.id} ${level.name}: BFS ${solution.visited} estados, ${solution.actions.length} ações, todas as gemas obrigatórias.`);
}
if (failed) process.exitCode = 1;
else console.log(`${files.length} fases solucionáveis pela simulação compartilhada.`);
