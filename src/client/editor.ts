import { WORLDS } from '../shared/config';
import { validateLevel } from '../shared/engine';
import type { Level } from '../shared/types';
import { Atlas } from './art';
import { escapeHTML, modal, toast } from './ui';
const PALETTE = [
  ['.', 'Chão'], ['#', 'Parede'], [',', 'Folhagem'], ['d', 'Diamante'], ['r', 'Gema vermelha'], ['O', 'Pedra'], ['h', 'Buraco'], ['~', 'Água'], ['^', 'Espinhos'], ['!', 'Espinhos cíclicos'], ['a', 'Chave dourada'], ['A', 'Porta dourada'], ['b', 'Chave rubra'], ['B', 'Porta rubra'], ['c', 'Chave azul'], ['C', 'Porta azul'], ['l', 'Alavanca'], ['p', 'Placa'], ['G', 'Portão'], ['>', 'Dardos direita'], ['<', 'Dardos esquerda'], ['u', 'Dardos cima'], ['v', 'Dardos baixo'], ['t', 'Teleporte'], ['f', 'Baú de fogo'], ['i', 'Baú de gelo'], ['$', 'Baú de gemas'], ['X', 'Raízes espessas'], ['W', 'Barricada'], ['n', 'Cobra'], ['m', 'Morcego'], ['P', 'Checkpoint'], ['E', 'Saída'], ['s', 'Segredo'], ['@', 'Jogador 1'], ['2', 'Jogador 2'], ['*', 'Tocha'], ['=', 'Gelo'],
];
export class Editor {
  private atlas = new Atlas(); private selected = '#'; private level: Level; private painting = false;
  constructor(private play: (level: Level) => void) {
    this.level = this.blank();
    try { const saved = JSON.parse(localStorage.getItem('amethyst-editor') || 'null'); if (saved && !validateLevel(saved).length) this.level = saved; } catch { /* A fresh canvas is always available. */ }
  }
  private blank(): Level {
    const map: string[][] = Array.from({ length: 25 }, (_, y) => Array.from({ length: 25 }, (_, x) => x === 0 || y === 0 || x === 24 || y === 24 ? '#' : '.'));
    map[2][2] = '@'; map[22][22] = 'E';
    return { id: 'custom', name: 'Meu templo', world: 0, index: 1, quota: 0, targetSeconds: 120, hint: 'Um caminho imaginado por você.', map: map.map(r => r.join('')), circuits: [], teleports: [] };
  }
  open() {
    const el = modal('A oficina dos caminhos', `<div class="editor-layout"><div><div class="form-grid"><label>Nome da fase<input id="editor-name" maxlength="60" value="${escapeHTML(this.level.name)}"></label><label>Mundo<select id="editor-world">${WORLDS.map((w, i) => `<option value="${i}" ${i === this.level.world ? 'selected' : ''}>${w.name}</option>`).join('')}</select></label><div class="form-row"><label>Cota<input id="editor-quota" type="number" min="0" max="100" value="${this.level.quota}"></label><label>Tempo (s)<input id="editor-target" type="number" min="1" value="${this.level.targetSeconds}"></label></div><span class="eyebrow">PINTE SEU TEMPLO</span><div class="editor-palette">${PALETTE.map(([tile, label]) => `<button data-tile="${tile}" title="${label}" aria-label="${label}" class="${tile === this.selected ? 'selected' : ''}">${['@', '2', 'O', 'n', 'm'].includes(tile) ? escapeHTML(tile) : `<img src="${this.atlas.tile(tile, this.level.world).toDataURL()}" width="22" height="22" alt="">`}</button>`).join('')}</div><p class="editor-info" id="selected-tile">Selecione um tile. Arraste para pintar.</p></div></div><div><canvas class="editor-canvas" width="800" height="800" aria-label="Mapa editável"></canvas><details><summary class="editor-info">Circuitos e teleportes</summary><p class="editor-info">Coordenadas começam em zero. Sem configuração manual, alavancas e placas abrem todos os portões, e teleportes são pareados na ordem do mapa.</p><textarea id="editor-links" rows="5" aria-label="Circuitos JSON">${escapeHTML(JSON.stringify({ circuits: this.level.circuits, teleports: this.level.teleports }, null, 2))}</textarea></details></div></div><div class="modal-actions"><button class="primary" id="editor-test">Testar agora</button><button class="secondary" id="editor-validate">Validar com BFS</button><button class="secondary" id="editor-export">Exportar JSON</button><button class="secondary" id="editor-import">Importar JSON</button><button class="secondary" id="editor-new">Novo mapa</button><input type="file" accept=".json,application/json" id="editor-file" hidden></div><p id="editor-result" role="status"></p>`, true);
    const canvas = el.querySelector<HTMLCanvasElement>('canvas')!;
    canvas.width = this.level.map[0].length * 32; canvas.height = this.level.map.length * 32;
    canvas.style.aspectRatio = `${this.level.map[0].length} / ${this.level.map.length}`;
    const draw = () => {
      const c = canvas.getContext('2d')!; c.imageSmoothingEnabled = false;
      this.level.map.forEach((row, y) => [...row].forEach((tile, x) => {
        const display = '@2Onm'.includes(tile) ? '.' : tile; c.drawImage(this.atlas.tile(display, this.level.world), x * 32, y * 32);
        if (display !== tile) { c.fillStyle = tile === 'O' ? '#bbb583' : '#f2e4bc'; c.font = 'bold 19px monospace'; c.textAlign = 'center'; c.fillText(tile, x * 32 + 16, y * 32 + 23); }
      }));
    };
    const paint = (event: PointerEvent) => {
      const r = canvas.getBoundingClientRect(), x = Math.floor((event.clientX - r.left) / r.width * this.level.map[0].length), y = Math.floor((event.clientY - r.top) / r.height * this.level.map.length);
      if (!this.level.map[y] || x < 0 || x >= this.level.map[0].length) return;
      const rows = this.level.map.map(r => r.split(''));
      if ('@2E'.includes(this.selected)) for (const row of rows) for (let i = 0; i < row.length; i++) if (row[i] === this.selected) row[i] = '.';
      rows[y][x] = this.selected; this.level.map = rows.map(r => r.join('')); draw();
    };
    canvas.onpointerdown = e => { this.painting = true; canvas.setPointerCapture(e.pointerId); paint(e); };
    canvas.onpointermove = e => { if (this.painting) paint(e); };
    canvas.onpointerup = canvas.onpointercancel = () => { this.painting = false; };
    el.querySelectorAll<HTMLButtonElement>('[data-tile]').forEach(button => button.onclick = () => { this.selected = button.dataset.tile!; el.querySelectorAll('[data-tile]').forEach(b => b.classList.toggle('selected', b === button)); el.querySelector('#selected-tile')!.textContent = button.title; });
    el.querySelector<HTMLSelectElement>('#editor-world')!.onchange = event => { this.level.world = Number((event.target as HTMLSelectElement).value); draw(); };
    const collect = (): Level | null => {
      const result = el.querySelector('#editor-result')!;
      try {
        this.level.name = el.querySelector<HTMLInputElement>('#editor-name')!.value.trim() || 'Meu templo';
        this.level.quota = Number(el.querySelector<HTMLInputElement>('#editor-quota')!.value);
        this.level.targetSeconds = Number(el.querySelector<HTMLInputElement>('#editor-target')!.value);
        const links = JSON.parse(el.querySelector<HTMLTextAreaElement>('#editor-links')!.value || '{}');
        this.level.circuits = links.circuits ?? []; this.level.teleports = links.teleports ?? [];
        if (!this.level.circuits.length) {
          const find = (chars: string) => this.level.map.flatMap((row, y) => [...row].flatMap((t, x) => chars.includes(t) ? [{ x, y }] : []));
          const triggers = find('lp'), gates = find('G');
          if (triggers.length && gates.length) this.level.circuits = [{ gates, triggers }];
        }
        if (!this.level.teleports.length) {
          const points = this.level.map.flatMap((row, y) => [...row].flatMap((t, x) => t === 't' ? [{ x, y }] : []));
          if (points.length % 2) throw new Error('Teleportes precisam formar pares.');
          for (let i = 0; i < points.length; i += 2) this.level.teleports.push([points[i], points[i + 1]]);
        }
        const errors = validateLevel(this.level); if (errors.length) throw new Error(errors.join(' '));
        try { localStorage.setItem('amethyst-editor', JSON.stringify(this.level)); } catch { /* Export remains available if storage is full. */ }
        result.textContent = ''; return structuredClone(this.level);
      } catch (e) { result.textContent = e instanceof Error ? e.message : 'Dados inválidos.'; return null; }
    };
    el.querySelector('#editor-test')!.addEventListener('click', () => { const l = collect(); if (l) this.play(l); });
    el.querySelector<HTMLButtonElement>('#editor-validate')!.onclick = () => {
      const l = collect(); if (!l) return; const button = el.querySelector<HTMLButtonElement>('#editor-validate')!; button.disabled = true;
      el.querySelector('#editor-result')!.textContent = 'Explorando os estados do templo…';
      const worker = new Worker(new URL('./solver-worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = e => { button.disabled = false; el.querySelector('#editor-result')!.textContent = e.data.solved ? `Solução encontrada: ${e.data.actions.length} ações, ${e.data.visited} estados. Todas as gemas obrigatórias alcançadas.` : `Sem solução confirmada: ${e.data.reason}`; worker.terminate(); };
      worker.onerror = () => { button.disabled = false; el.querySelector('#editor-result')!.textContent = 'Não foi possível concluir a validação.'; worker.terminate(); };
      worker.postMessage(l);
    };
    el.querySelector('#editor-export')!.addEventListener('click', () => {
      const l = collect(); if (!l) return; const url = URL.createObjectURL(new Blob([JSON.stringify(l, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'meu-templo.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Fase exportada.');
    });
    el.querySelector('#editor-import')!.addEventListener('click', () => el.querySelector<HTMLInputElement>('#editor-file')!.click());
    el.querySelector<HTMLInputElement>('#editor-file')!.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      if (file.size > 500000) { toast('Arquivo grande demais. Limite de 500 KB.'); return; }
      try { const l = JSON.parse(await file.text()); const errors = validateLevel(l); if (errors.length) throw new Error(errors.join(' ')); this.level = { ...l, id: 'custom', coopVariant: undefined }; this.open(); } catch (error) { toast(error instanceof Error ? error.message : 'JSON inválido.'); }
    };
    el.querySelector('#editor-new')!.addEventListener('click', () => { this.level = this.blank(); this.open(); }); draw();
  }
}
