import { writeFile } from 'node:fs/promises';
import type { Circuit, Level, Point } from '../src/shared/types';
type Cell = [number, number];
const point = ([x, y]: Cell): Point => ({ x, y });
const names = [
  'O despertar das raízes', 'A memória das pedras', 'Pontes sob o musgo', 'A chave do guardião', 'O jardim das alavancas',
  'O primeiro degelo', 'O ritmo do silêncio', 'Ecos entre cristais', 'O selo de safira', 'O lago adormecido',
  'Uma centelha antiga', 'Madeira e cinzas', 'O pátio das serpentes', 'O sopro das estátuas', 'O peso da escolha',
  'Asas na penumbra', 'Três cores para o esquecimento', 'Entre a brasa e a geada', 'O juramento dos dois selos', 'O coração de ametista',
];
const mechanics = ['foliage', 'push', 'bridge', 'yellow-key', 'lever', 'ice', 'cyclic-spikes', 'teleport', 'blue-key', 'falling-rock', 'fire', 'red-key', 'snake', 'darts', 'pressure-plate', 'bat', 'colored-doors', 'element-combination', 'all-trigger-circuit', 'finale'];

/** Drawing primitives only: each campaign plan is authored independently. */
class Board {
  cells: string[][];
  circuits: Circuit[] = [];
  teleports: [Point, Point][] = [];
  constructor(readonly width: number, readonly height: number, readonly layout: string, readonly hint: string) {
    this.cells = Array.from({ length: height }, () => Array<string>(width).fill('#'));
  }
  set(x: number, y: number, tile: string) {
    if (x < 1 || y < 1 || x >= this.width - 1 || y >= this.height - 1) throw new Error(`Outside border: ${x},${y} (${this.layout})`);
    this.cells[y][x] = tile; return this;
  }
  room(x: number, y: number, width: number, height: number) {
    for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) this.set(x + dx, y + dy, '.');
    return this;
  }
  path(...points: Cell[]) {
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1], [bx, by] = points[i];
      if (ax !== bx && ay !== by) throw new Error('Corridors must follow grid axes.');
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) this.set(x, y, '.');
    }
    return this;
  }
  tiles(tile: string, ...points: Cell[]) { points.forEach(([x, y]) => this.set(x, y, tile)); return this; }
  line(tile: string, a: Cell, b: Cell) {
    const [ax, ay] = a, [bx, by] = b;
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) this.set(x, y, tile);
    return this;
  }
  link(triggers: Cell[], gates: Cell[], requireAll = false, traps: Cell[] = []) {
    this.circuits.push({ triggers: triggers.map(point), gates: gates.map(point), requireAll, ...(traps.length ? { traps: traps.map(point) } : {}) }); return this;
  }
  pair(a: Cell, b: Cell) { this.tiles('t', a, b); this.teleports.push([point(a), point(b)]); return this; }
  secret(index: number): Level['coopVariant'] {
    const candidates: { cells: Cell[]; score: number }[] = [];
    for (let y = 2; y < this.height - 2; y++) for (let x = 2; x < this.width - 2; x++) {
      if (this.cells[y][x] !== '.') continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const cells = Array.from({ length: 4 }, (_, n) => [x + dx * (n + 1), y + dy * (n + 1)] as Cell);
        if (cells.some(([cx, cy]) => cx <= 1 || cy <= 1 || cx >= this.width - 2 || cy >= this.height - 2 || this.cells[cy][cx] !== '#' || this.cells[cy + dx]?.[cx - dy] !== '#' || this.cells[cy - dx]?.[cx + dy] !== '#')) continue;
        const [ex, ey] = cells[3];
        if (this.cells[ey + dy]?.[ex + dx] !== '#') continue;
        candidates.push({ cells, score: ((x * 31 + y * 17 + index * 53) % 137) + Math.min(x, y) });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) throw new Error(`No isolated secret alcove in ${this.layout}`);
    const cells = candidates[0].cells;
    cells.forEach(([x, y], i) => this.set(x, y, [',', '.', 'r', 's'][i]));
    if (index % 5 < 2) return undefined;
    return { tiles: [{ ...point(cells[0]), tile: 'p' }, { ...point(cells[1]), tile: 'G' }], circuits: [{ gates: [point(cells[1])], triggers: [point(cells[0])] }] };
  }
}

// 01: a gentle fork and a loop around an overgrown courtyard.
const grove = () => new Board(24, 24, 'Clareira bifurcada', 'Dois caminhos contornam o jardim. Explore também os cantos cobertos de folhas.')
  .room(1, 1, 5, 5).room(9, 1, 6, 7).room(17, 8, 5, 5).room(2, 10, 6, 5).room(7, 15, 6, 5).room(16, 17, 6, 5)
  .path([3, 3], [11, 3], [11, 10], [20, 10], [20, 19], [9, 19], [9, 12], [4, 12], [4, 4])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles(',', [4, 3], [5, 3], [4, 7], [9, 15], [18, 18])
  .tiles('d', [7, 3], [12, 6], [19, 10], [8, 16], [18, 19]).tiles('P', [9, 12]).tiles('$', [2, 13]).tiles('E', [20, 20]);
// 02: supported boulder runway, a quarry fork and a return tunnel.
const quarry = () => new Board(28, 24, 'Pedreira em ferradura', 'Empurre a pedra pelo trilho. A pedreira se divide depois da primeira passagem.')
  .room(1, 1, 5, 5).room(14, 6, 6, 5).room(3, 7, 6, 5).room(22, 6, 4, 6).room(12, 16, 8, 6).room(1, 17, 6, 5)
  .path([3, 3], [16, 3], [16, 8], [6, 8], [6, 14], [16, 14], [16, 19], [4, 19]).path([16, 8], [24, 8], [24, 19], [16, 19])
  .path([11, 3], [11, 2], [13, 2], [13, 3])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('O', [8, 3]).tiles('d', [6, 3], [13, 3], [5, 9], [24, 9], [17, 18], [4, 20])
  .tiles('P', [16, 14]).tiles(',', [4, 10], [15, 17]).tiles('$', [25, 11]).tiles('E', [25, 10]);
// 03: two marsh banks and a second stone crossing on a narrow causeway.
const marsh = () => new Board(32, 24, 'Margens e passarelas', 'Pedra na água vira ponte. Guarde a segunda pedra para a travessia estreita.')
  .room(1, 2, 10, 7).room(18, 2, 8, 7).room(17, 11, 5, 7).room(27, 14, 3, 7)
  .path([8, 6], [21, 6], [21, 12], [20, 12], [20, 17], [28, 17], [28, 20])
  .line('~', [14, 1], [15, 22]).path([11, 6], [19, 6]).tiles('~', [14, 6], [24, 17]).tiles('O', [13, 6], [23, 17]).tiles('#', [13, 7], [23, 18])
  .tiles('@', [3, 5]).tiles('2', [3, 6]).tiles('d', [7, 5], [20, 4], [24, 7], [19, 14], [28, 16], [28, 20])
  .tiles('P', [21, 12]).tiles(',', [5, 4], [8, 7], [18, 16]).tiles('$', [2, 8]).tiles('E', [29, 20]);
// 04: a key retrieval expedition from a central hub to a remote south-west wing.
const guardian = () => new Board(26, 30, 'Santuário de quatro alas', 'A chave está na ala inferior. Volte ao centro para abrir o santuário do norte.')
  .room(9, 11, 8, 7).room(9, 1, 8, 5).room(1, 10, 6, 7).room(20, 10, 4, 10).room(1, 22, 6, 6).room(17, 24, 7, 4)
  .path([12, 14], [12, 4]).path([12, 14], [4, 14], [4, 25]).path([12, 14], [22, 14], [22, 26], [12, 26], [12, 14])
  .tiles('@', [12, 14]).tiles('2', [13, 14]).tiles('a', [4, 25]).tiles('A', [12, 8])
  .tiles('d', [5, 15], [4, 24], [21, 16], [20, 26], [12, 4], [15, 3]).tiles('P', [12, 17]).tiles('$', [23, 18]).tiles('E', [14, 3]);
// 05: a broken outer ring, a central switch spur, and a sealed southern exit.
const aqueduct = () => new Board(34, 26, 'Aqueduto dos dois desvios', 'Uma alavanca abre a ilha central. A alavanca de lá libera a galeria de saída.')
  .room(1, 1, 6, 6).room(25, 1, 7, 6).room(25, 17, 7, 7).room(1, 17, 7, 7).room(11, 9, 8, 5)
  .path([3, 3], [28, 3], [28, 20], [3, 20]).path([3, 3], [3, 8], [9, 8], [9, 3]).path([14, 3], [14, 11], [16, 11])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('l', [7, 3], [16, 11]).tiles('G', [14, 7], [18, 20])
  .link([[7, 3]], [[14, 7]]).link([[16, 11]], [[18, 20]])
  .tiles('d', [5, 4], [12, 3], [14, 10], [29, 5], [27, 18], [10, 20], [4, 22]).tiles('P', [28, 16]).tiles('E', [3, 22]);
// 06: three separate freezes with a side expedition between canal crossings.
const canals = () => new Board(30, 28, 'Três canais congelados', 'O baú tem três usos de gelo. Cada canal pede uma direção diferente.')
  .room(1, 1, 6, 6).room(11, 1, 7, 6).room(11, 12, 7, 5).room(1, 11, 6, 6).room(24, 12, 4, 6).room(20, 21, 8, 5)
  .path([3, 3], [14, 3], [14, 14], [26, 14], [26, 24], [23, 24]).path([14, 14], [3, 14])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('i', [4, 5]).tiles('~', [9, 3], [14, 9], [23, 14])
  .tiles('d', [5, 3], [15, 4], [13, 13], [3, 13], [26, 15], [22, 24]).tiles('P', [14, 15]).tiles('$', [2, 16]).tiles('E', [24, 24]);
// 07: a tall zigzag, timing gates and safe rest bays before each crossing.
const rhythm = () => new Board(24, 36, 'Escadaria do silêncio', 'Espere nas reentrâncias. Os espinhos avisam antes de subir.')
  .room(1, 1, 5, 5).room(18, 9, 4, 5).room(1, 17, 5, 5).room(18, 27, 4, 6).room(2, 29, 5, 5)
  .path([3, 3], [20, 3], [20, 11], [3, 11], [3, 19], [20, 19], [20, 31], [4, 31], [4, 33])
  .room(6, 2, 2, 3).room(14, 10, 2, 3).room(19, 22, 3, 2)
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('!', [9, 3], [12, 11], [20, 25])
  .tiles('d', [6, 3], [20, 6], [16, 11], [3, 18], [11, 19], [20, 28], [5, 31]).tiles('P', [3, 20]).tiles('E', [4, 32]);
// 08: four disconnected islands linked by a teleport constellation.
const constellation = () => new Board(36, 26, 'Constelação de ilhas', 'As runas ligam ilhas separadas. Entre, explore e volte pela mesma runa.')
  .room(1, 1, 8, 7).room(13, 8, 10, 10).room(28, 1, 6, 6).room(26, 19, 8, 5)
  .tiles('#', [16, 11], [16, 12], [19, 13], [20, 13], [30, 3], [30, 4])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).pair([7, 5], [14, 11]).pair([21, 10], [29, 5]).pair([20, 15], [28, 21])
  .tiles('d', [5, 3], [17, 10], [18, 16], [32, 2], [32, 5], [30, 22], [32, 20]).tiles('P', [17, 14]).tiles('$', [2, 7]).tiles('E', [32, 22]);
// 09: ascending fortress with a lateral key wing and a sealed high courtyard.
const frostFort = () => new Board(28, 34, 'Fortaleza da chave azul', 'Congele a passagem para a ala da chave. O selo azul guarda o pátio de cima.')
  .room(1, 26, 7, 6).room(9, 26, 7, 6).room(9, 15, 7, 7).room(1, 15, 6, 7).room(20, 15, 6, 8).room(8, 2, 13, 7)
  .path([3, 29], [12, 29], [12, 5]).path([12, 18], [4, 18]).path([12, 18], [23, 18], [23, 21])
  .tiles('@', [3, 29]).tiles('2', [3, 30]).tiles('i', [6, 29]).tiles('~', [12, 24]).tiles('c', [4, 18]).tiles('C', [12, 12])
  .tiles('d', [5, 28], [12, 27], [3, 20], [23, 20], [13, 17], [10, 5], [18, 6]).tiles('P', [13, 20]).tiles('^', [17, 3], [17, 4]).tiles('E', [18, 4]);
// 10: a spontaneous bridge, then a stone released by clearing its supporting leaf.
const falls = () => new Board(38, 28, 'Terraços da cascata', 'A primeira pedra já cai. Solte a folhagem sob a segunda e saia de baixo.')
  .room(1, 20, 6, 6).room(1, 13, 6, 6).room(12, 14, 6, 5).room(25, 17, 5, 6).room(32, 2, 4, 7)
  .path([3, 23], [3, 16], [14, 16], [14, 9], [26, 9], [26, 20], [34, 20], [34, 4])
  .path([11, 12], [11, 16]).path([18, 9], [18, 6], [24, 6]).path([24, 5], [24, 9])
  .tiles('@', [3, 23]).tiles('2', [3, 24]).tiles('O', [11, 12], [24, 5]).tiles('~', [11, 16], [24, 9]).tiles(',', [24, 6])
  .tiles('d', [4, 22], [7, 16], [14, 14], [23, 6], [26, 9], [27, 20], [34, 12], [33, 5]).tiles('P', [14, 15], [26, 19]).tiles('E', [34, 3]);
// 11: a branching fire tree with an accessible refill before the last barrier.
const embers = () => new Board(26, 32, 'Árvore de cinzas', 'O fogo abre as três alas. Procure a recarga antes da passagem final.')
  .room(9, 25, 8, 5).room(1, 25, 6, 5).room(9, 14, 7, 6).room(1, 14, 5, 6).room(20, 13, 4, 7).room(8, 1, 9, 6)
  .path([12, 28], [4, 28]).path([12, 28], [12, 3]).path([3, 17], [22, 17])
  .tiles('@', [12, 28]).tiles('2', [13, 28]).tiles('f', [4, 27], [12, 12]).tiles('X', [12, 22], [12, 9]).tiles('W', [7, 17], [18, 17])
  .tiles('d', [11, 27], [4, 28], [11, 16], [3, 16], [22, 18], [12, 11], [10, 3], [15, 4]).tiles('P', [12, 18]).tiles('E', [12, 3]);
// 12: offset timber labyrinth with a late red door and an optional central loop.
const timber = () => new Board(34, 30, 'Labirinto de vigas', 'A chave rubra fica no fundo do labirinto. As vigas queimadas também viram atalhos.')
  .room(1, 1, 5, 5).room(12, 1, 5, 5).room(3, 8, 5, 5).room(3, 21, 6, 6).room(14, 21, 5, 6).room(25, 14, 6, 5).room(26, 1, 6, 6)
  .path([3, 3], [14, 3], [14, 10], [5, 10], [5, 23], [16, 23], [16, 16], [27, 16], [27, 3], [30, 3])
  .path([14, 10], [20, 10], [20, 16]).tiles('W', [20, 12])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('f', [5, 3]).tiles('W', [9, 3], [5, 16]).tiles('b', [10, 23]).tiles('B', [27, 10])
  .tiles('d', [4, 2], [14, 4], [5, 11], [4, 24], [15, 23], [23, 16], [28, 17], [30, 4]).tiles('P', [16, 23]).tiles('$', [20, 9]).tiles('E', [30, 3]);
// 13: offset garden lanes, refuge pillars and distinct patrol yards.
const serpents = () => new Board(40, 26, 'Pátios dos três jardins', 'As cobras mantêm sua linha. Explore os três jardins; o portal fica no mirante do norte.')
  .room(1, 9, 5, 7).room(8, 2, 13, 9).room(17, 11, 7, 6).room(27, 9, 11, 14).room(28, 2, 8, 5)
  .path([3, 12], [9, 12], [9, 5], [20, 5], [20, 12], [31, 12], [31, 20], [37, 20]).path([20, 5], [33, 5])
  .tiles('#', [12, 4], [12, 5], [9, 7], [16, 7], [16, 8], [30, 15], [31, 15], [29, 17], [36, 17], [34, 18], [34, 19])
  .tiles('@', [3, 12]).tiles('2', [3, 13]).tiles('n', [12, 7], [34, 17]).tiles('h', [28, 20], [29, 20])
  .tiles('d', [4, 11], [7, 12], [9, 9], [10, 5], [18, 8], [20, 5], [32, 4], [20, 14], [25, 12], [29, 11], [36, 14], [36, 21]).tiles('P', [21, 14]).tiles('E', [34, 4]);
// 14: three shooting galleries, each with a refuge bay.
const galleries = () => new Board(30, 38, 'Galerias de dardos', 'Entre uma galeria e outra, há abrigo. Observe a linha de tiro antes de atravessar.')
  .room(2, 1, 4, 5).room(22, 8, 5, 6).room(3, 18, 5, 6).room(22, 29, 5, 6).room(2, 30, 5, 6)
  .path([2, 3], [24, 3], [24, 11], [2, 11]).path([5, 11], [5, 21], [27, 21]).path([24, 21], [24, 32], [5, 32])
  .room(6, 2, 2, 3).room(10, 2, 2, 3).room(16, 2, 2, 3).room(20, 2, 2, 3).room(14, 10, 4, 3).room(8, 10, 2, 3).room(11, 10, 2, 3).room(20, 10, 2, 3).room(9, 20, 4, 3).room(15, 20, 2, 3).room(18, 20, 2, 3).room(22, 20, 3, 3)
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('>', [1, 3], [1, 11]).tiles('<', [28, 21])
  .tiles('d', [7, 2], [20, 2], [24, 9], [16, 10], [8, 10], [5, 14], [5, 18], [12, 20], [18, 20], [24, 24], [24, 30], [6, 32]).tiles('P', [24, 12], [5, 22]).tiles('E', [4, 33]);
// 15: two counterweights, bypass ledges and a final gate that requires both weights.
const foundry = () => new Board(36, 32, 'Oficina de contrapesos', 'Deixe as pedras nas placas. Use as passagens por cima para seguir sem tirar o peso.')
  .room(1, 1, 5, 5).room(18, 1, 6, 5).room(18, 9, 4, 6).room(29, 10, 5, 7).room(27, 23, 7, 6).room(12, 23, 7, 6).room(1, 23, 5, 6)
  .path([3, 3], [20, 3], [20, 12], [31, 12], [31, 25], [3, 25])
  .path([8, 3], [8, 2], [12, 2], [12, 3]).path([23, 12], [23, 11], [27, 11], [27, 12])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('O', [7, 3], [22, 12]).tiles('p', [10, 3], [25, 12]).tiles('G', [14, 3], [28, 12], [9, 25])
  .tiles('#', [10, 4], [25, 13]).link([[10, 3]], [[14, 3]]).link([[25, 12]], [[28, 12]]).link([[10, 3], [25, 12]], [[9, 25]], true)
  .tiles('d', [5, 3], [19, 3], [20, 10], [30, 14], [31, 24], [15, 26], [4, 26]).tiles('P', [20, 13], [16, 25]).tiles('E', [3, 26]);
// 16: long catacombs with open evasion rooms and narrow connective tunnels.
const catacombs = () => new Board(28, 40, 'Catacumbas de perseguição', 'O morcego só desperta de perto. Desvie nas câmaras e mantenha uma saída livre.')
  .room(1, 1, 6, 6).room(1, 9, 7, 6).room(16, 7, 10, 9).room(17, 20, 8, 6).room(2, 24, 10, 11).room(19, 32, 7, 6)
  .path([3, 3], [3, 11], [20, 11], [20, 23], [5, 23], [5, 35], [23, 35])
  .tiles('#', [20, 10], [20, 11], [6, 28], [6, 29], [6, 30])
  .tiles('@', [3, 3]).tiles('2', [3, 4]).tiles('m', [23, 14], [9, 32])
  .tiles('d', [4, 4], [4, 12], [18, 9], [22, 12], [20, 22], [5, 25], [8, 33], [21, 35]).tiles('P', [20, 24], [4, 31]).tiles('E', [23, 35]);
// 17: a three-spoke retrieval puzzle, changing direction at each colored seal.
const prisms = () => new Board(42, 30, 'Rosácea das três chaves', 'Dourado a oeste, rubro ao norte, azul a leste. Cada ala guarda a chave da próxima.')
  .room(16, 22, 9, 7).room(16, 11, 9, 7).room(2, 10, 7, 8).room(2, 22, 7, 6).room(16, 1, 10, 6).room(33, 11, 7, 8).room(33, 1, 7, 6)
  .path([20, 25], [20, 3]).path([5, 14], [36, 14], [36, 4]).path([20, 25], [5, 25])
  .tiles('@', [20, 25]).tiles('2', [21, 25]).tiles('a', [5, 24]).tiles('b', [4, 11]).tiles('c', [24, 3]).tiles('A', [12, 14]).tiles('B', [20, 8]).tiles('C', [30, 14])
  .tiles('d', [20, 23], [5, 25], [5, 16], [4, 12], [20, 4], [23, 3], [35, 15], [36, 3], [38, 13]).tiles('P', [21, 14]).tiles('E', [38, 14]);
// 18: element budgeting, a refill detour and three canals around an upper delta.
const delta = () => new Board(32, 40, 'Delta de brasa e geada', 'Reserve fogo para a ala esquerda: lá está a recarga. O gelo abre os três canais.')
  .room(1, 31, 6, 7).room(9, 26, 7, 6).room(10, 21, 7, 4).room(9, 10, 7, 6).room(2, 8, 5, 7).room(23, 9, 6, 7).room(22, 2, 7, 5).room(11, 1, 6, 6)
  .path([3, 35], [3, 28], [12, 28], [12, 12], [25, 12], [25, 4], [14, 4], [14, 2]).path([12, 12], [5, 12], [5, 10])
  .tiles('@', [3, 35]).tiles('2', [3, 36]).tiles('f', [3, 31], [5, 10]).tiles('i', [14, 23]).tiles('W', [8, 28], [8, 12]).tiles('X', [12, 24], [25, 7]).tiles('~', [12, 19], [20, 12], [18, 4])
  .tiles('d', [4, 34], [12, 29], [13, 23], [12, 14], [5, 11], [26, 12], [25, 4], [14, 3], [15, 5]).tiles('P', [12, 22], [24, 12]).tiles('E', [14, 2]);
// 19: two looping wings, an inter-wing shortcut and a two-switch observatory door.
const observatory = () => new Board(44, 32, 'Observatório dos dois selos', 'As duas alas guardam alavancas. Com ambos os selos acesos, o norte abre e a armadilha desperta.')
  .room(18, 24, 9, 6).room(18, 13, 9, 6).room(3, 13, 7, 7).room(3, 4, 6, 6).room(34, 13, 8, 6).room(34, 22, 8, 7).room(18, 1, 9, 6)
  .path([22, 27], [22, 4]).path([6, 16], [37, 16], [37, 26], [29, 26], [29, 16])
  .path([6, 16], [6, 7], [14, 7], [14, 16]).path([6, 8], [4, 8]).path([37, 24], [40, 24])
  .tiles('@', [22, 27]).tiles('2', [23, 27]).tiles('l', [4, 8], [39, 24]).tiles('G', [22, 9]).tiles('!', [22, 11])
  .link([[4, 8], [39, 24]], [[22, 9]], true, [[22, 11]]).pair([14, 7], [29, 26])
  .tiles('d', [21, 26], [20, 16], [5, 17], [4, 7], [12, 7], [37, 15], [39, 25], [23, 4], [20, 3]).tiles('P', [23, 16]).tiles('E', [22, 3]);
// 20: an asymmetric sanctuary combining bridges, keys, elements and counterweights.
const sanctuary = () => new Board(46, 38, 'Santuário dos quatro caminhos', 'Ponte, chave, fogo e gelo abrem a volta longa. A última pedra deve ficar no selo.')
  .room(1, 29, 6, 7).room(13, 27, 7, 8).room(12, 16, 8, 6).room(29, 16, 7, 7).room(36, 3, 8, 8).room(14, 2, 6, 7).room(1, 1, 5, 5)
  .path([3, 32], [15, 32], [15, 19], [32, 19], [32, 7], [3, 7], [3, 3]).path([32, 7], [40, 7]).path([16, 7], [16, 5])
  .path([7, 7], [7, 6], [11, 6], [11, 7])
  .tiles('@', [3, 32]).tiles('2', [3, 33]).tiles('O', [8, 32], [11, 7]).tiles('~', [9, 32], [32, 13]).tiles('#', [8, 33], [8, 8], [9, 8], [10, 8], [11, 8])
  .tiles('a', [14, 30]).tiles('A', [15, 25]).tiles('f', [17, 19]).tiles('W', [23, 19]).tiles('i', [32, 17]).tiles('c', [39, 5]).tiles('C', [24, 7])
  .tiles('l', [16, 5]).tiles('p', [8, 7]).tiles('G', [5, 7]).link([[16, 5], [8, 7]], [[5, 7]], true)
  .tiles('!', [32, 11]).tiles('v', [41, 2]).tiles('n', [39, 9])
  .tiles('d', [5, 31], [14, 31], [14, 18], [21, 19], [31, 18], [32, 8], [38, 4], [28, 7], [17, 6], [3, 4])
  .tiles('P', [15, 20], [33, 18], [37, 6]).tiles('E', [3, 3]);

const plans = [grove, quarry, marsh, guardian, aqueduct, canals, rhythm, constellation, frostFort, falls, embers, timber, serpents, galleries, foundry, catacombs, prisms, delta, observatory, sanctuary];
const targetTimes = [35, 55, 50, 65, 65, 65, 70, 50, 70, 70, 80, 80, 85, 95, 90, 100, 110, 110, 120, 140];
for (const [index, plan] of plans.entries()) {
  const board = plan(), coopVariant = board.secret(index);
  // Wall sconces are solid decorations and preserve the authored connectivity.
  for (let y = 2; y < board.height - 2; y++) for (let x = 2; x < board.width - 2; x++) {
    if (board.cells[y][x] === '#' && board.cells[y + 1][x] === '.' && (x * 13 + y * 7 + index) % 43 === 0) board.set(x, y, '*');
  }
  const map = board.cells.map(row => row.join('')), total = map.join('').split('d').length - 1;
  const level: Level = {
    id: String(index + 1).padStart(2, '0'), name: names[index], world: Math.floor(index / 5), index: index % 5 + 1,
    quota: index === 0 ? 4 : total, targetSeconds: targetTimes[index],
    hint: board.hint, mechanic: mechanics[index], layout: board.layout, difficulty: index + 1,
    map, circuits: board.circuits, teleports: board.teleports, ...(coopVariant ? { coopVariant } : {}),
  };
  await writeFile(new URL(`../levels/${level.id}.json`, import.meta.url), JSON.stringify(level, null, 2) + '\n');
  console.log(`${level.id}: ${board.width}×${board.height}, ${total} gemas — ${board.layout}`);
}
