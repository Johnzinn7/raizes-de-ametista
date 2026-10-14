import { writeFile } from 'node:fs/promises';
import type { Circuit, Level, Point } from '../src/shared/types';

const names = [
  'O despertar das raízes', 'A memória das pedras', 'Pontes sob o musgo', 'A chave do guardião', 'O jardim das alavancas',
  'O primeiro degelo', 'O ritmo do silêncio', 'Ecos entre cristais', 'O selo de safira', 'O lago adormecido',
  'Uma centelha antiga', 'Madeira e cinzas', 'O pátio das serpentes', 'O sopro das estátuas', 'O peso da escolha',
  'Asas na penumbra', 'Três cores para o esquecimento', 'Entre a brasa e a geada', 'O juramento dos dois selos', 'O coração de ametista',
];
const mechanics = ['foliage', 'push', 'bridge', 'yellow-key', 'lever', 'ice', 'cyclic-spikes', 'teleport', 'blue-key', 'falling-rock', 'fire', 'red-key', 'snake', 'darts', 'pressure-plate', 'bat', 'colored-doors', 'element-combination', 'all-trigger-circuit', 'finale'];
const hints = ['As folhas cedem. As gemas mostram o caminho.', 'Uma pedra pode ser um obstáculo… ou uma passagem.', 'O que afunda pode virar caminho.', 'O dourado reconhece o dourado.', 'Um toque na alavanca desperta o portão.', 'Abra o baú. Diante da água, use I.', 'Observe o aviso. Atravesse no silêncio.', 'Duas runas, um mesmo caminho.', 'A chave azul guarda o segundo selo.', 'Espere a pedra encontrar seu lugar.', 'Abra o baú. Diante das raízes densas, use F.', 'As tábuas escondem o caminho da chave rubra.', 'Há movimento no pátio. Escolha sua passagem.', 'As estátuas respiram em intervalos.', 'Às vezes, o caminho precisa de peso.', 'O que voa acorda quando você se aproxima.', 'Cada cor abre sua própria história.', 'Brasa primeiro. Geada depois.', 'Os dois selos precisam permanecer acordados.', 'Tudo o que você aprendeu vive aqui.'];

for (let index = 0; index < 20; index++) {
  const map: string[][] = Array.from({ length: 25 }, () => Array<string>(25).fill('#'));
  const set = (x: number, y: number, tile: string) => { map[y][x] = tile; };
  const centers: Point[] = [{ x: 3, y: 3 }, { x: 11, y: 3 }, { x: 20, y: 3 }, { x: 20, y: 11 }, { x: 11, y: 11 }, { x: 3, y: 11 }, { x: 3, y: 20 }, { x: 11, y: 20 }, { x: 20, y: 20 }];
  for (const p of centers) for (let y = p.y - 2; y <= p.y + 2; y++) for (let x = p.x - 2; x <= p.x + 2; x++) set(x, y, '.');
  for (let i = 1; i < centers.length; i++) {
    const a = centers[i - 1], b = centers[i];
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) set(x, a.y, '.');
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) set(b.x, y, '.');
  }
  // Offset room partitions produce original alternate approaches within the route.
  for (const [i, p] of centers.entries()) {
    if ((i + index) % 3 === 0 && i > 0) { set(p.x - 1, p.y - 1, '#'); set(p.x + 1, p.y + 1, '#'); }
    set(p.x - 2, p.y - 2, '*');
    if (i % 2 === 0) { set(p.x + 1, p.y - 1, ','); set(p.x + 2, p.y, ','); set(p.x - 1, p.y + 2, ','); }
  }
  set(3, 3, '@'); set(3, 4, '2'); set(4, 3, ','); set(5, 3, ',');
  for (const p of [centers[1], centers[2], centers[3], centers[5], centers[7]]) set(p.x, p.y, 'd');
  set(3, 12, 'P'); set(20, 20, 'E'); set(21, 19, 'r'); set(10, 12, '$');
  if (index >= 2) set(4, 10, 'h');
  if (index >= 6) set(10, 10, '^');
  // Narrow optional secret vault; co-op replaces its entrance with a held gate.
  for (let x = 14; x <= 17; x++) set(x, 22, '.'); set(14, 21, ','); set(17, 22, 's'); set(18, 22, '#'); set(17, 21, '#');
  const circuits: Circuit[] = []; const teleports: [Point, Point][] = [];
  const relocateGem = () => { set(11, 3, '.'); set(10, 3, 'd'); };
  const key = (color: number, doorX = 15, doorY = 3) => { relocateGem(); set(11, 3, 'abc'[color]); set(doorX, doorY, 'ABC'[color]); };
  const ice = () => { relocateGem(); set(11, 3, 'i'); set(15, 3, '~'); };
  const fire = (wood = false) => { relocateGem(); set(11, 3, 'f'); set(15, 3, wood ? 'W' : 'X'); };
  const lever = () => { relocateGem(); set(11, 3, 'l'); set(15, 3, 'G'); circuits.push({ gates: [{ x: 15, y: 3 }], triggers: [{ x: 11, y: 3 }] }); };
  if (index === 1) { set(7, 3, 'O'); }
  if (index === 2 || index === 9) { set(14, 3, 'O'); set(15, 3, '~'); }
  if (index === 3) key(0);
  if (index === 4) lever();
  if (index === 5 || index === 8) ice();
  if (index === 6) set(15, 3, '!');
  if (index === 7) { set(20, 7, '#'); set(20, 5, 't'); set(20, 9, 't'); teleports.push([{ x: 20, y: 5 }, { x: 20, y: 9 }]); }
  if (index === 8) { set(20, 3, 'c'); set(21, 3, 'd'); set(20, 7, 'C'); }
  if (index === 9) { set(20, 6, 'O'); set(20, 7, '~'); }
  if (index === 10 || index === 11 || index === 17 || index === 19) fire(index !== 10);
  if (index === 11) { set(20, 3, 'b'); set(21, 3, 'd'); set(20, 7, 'B'); }
  if (index === 12) { set(21, 10, 'n'); set(4, 19, 'n'); }
  if (index === 13) { set(22, 9, '<'); set(1, 19, '>'); }
  if (index === 14) {
    relocateGem(); set(10, 3, 'O'); set(10, 2, 'd'); set(12, 3, 'p');
    for (let x = 9; x <= 13; x++) set(x, 4, '#');
    set(15, 3, 'G'); circuits.push({ gates: [{ x: 15, y: 3 }], triggers: [{ x: 12, y: 3 }] });
  }
  if (index === 15) { set(5, 19, 'm'); set(21, 10, 'm'); }
  if (index === 16) { key(1); set(20, 3, 'c'); set(21, 3, 'd'); set(20, 7, 'C'); }
  if (index === 17 || index === 19) { set(20, 3, 'i'); set(21, 3, 'd'); set(20, 7, '~'); }
  if (index === 18) {
    relocateGem(); set(11, 3, 'l'); set(20, 3, 'l'); set(21, 3, 'd'); set(20, 7, 'G');
    circuits.push({ gates: [{ x: 20, y: 7 }], triggers: [{ x: 11, y: 3 }, { x: 20, y: 3 }], requireAll: true });
  }
  if (index === 19) { set(12, 11, 'a'); set(7, 11, 'A'); set(3, 16, '!'); set(22, 18, '<'); set(4, 21, 'n'); }
  // Rotate the complete level and its declarative links, not only the rendered map.
  const rotations = index % 4;
  const transform = (p: Point): Point => { let { x, y } = p; for (let r = 0; r < rotations; r++) [x, y] = [24 - y, x]; return { x, y }; };
  const rotated = Array.from({ length: 25 }, () => Array<string>(25).fill('#'));
  const arrow = ['>', 'v', '<', 'u'];
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const p = transform({ x, y }), t = map[y][x]; rotated[p.y][p.x] = arrow.includes(t) ? arrow[(arrow.indexOf(t) + rotations) % 4] : t;
  }
  // Gravity is always screen-down; rotated pushing tutorials get solid support.
  if ([1, 2, 9, 14].includes(index) && rotations) {
    // Use an unrotated mechanical layout where gravity is part of the puzzle.
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) rotated[y][x] = map[y][x];
  }
  const mechanical = [1, 2, 9, 14].includes(index) && rotations;
  const p = mechanical ? (v: Point) => ({ ...v }) : transform;
  const circuit = (c: Circuit): Circuit => ({ ...c, gates: c.gates.map(p), triggers: c.triggers.map(p), traps: c.traps?.map(p) });
  const level: Level = { id: String(index + 1).padStart(2, '0'), name: names[index], world: Math.floor(index / 5), index: index % 5 + 1, quota: index === 19 ? 5 : 4, targetSeconds: 35 + Math.floor(index / 5) * 12 + index % 5 * 3, hint: hints[index], mechanic: mechanics[index], map: rotated.map(r => r.join('')), circuits: circuits.map(circuit), teleports: teleports.map(pair => pair.map(p) as [Point, Point]) };
  if (index % 5 >= 2) level.coopVariant = { tiles: [{ ...p({ x: 14, y: 22 }), tile: 'p' }, { ...p({ x: 16, y: 22 }), tile: 'G' }], circuits: [circuit({ gates: [{ x: 16, y: 22 }], triggers: [{ x: 14, y: 22 }] })] };
  await writeFile(new URL(`../levels/${level.id}.json`, import.meta.url), JSON.stringify(level, null, 2) + '\n');
}
console.log('20 fases originais geradas. Execute npm run validate-levels.');
