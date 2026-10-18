import { GAME_NAME, WORLDS } from '../shared/config';
import type { Level } from '../shared/types';
import type { RankingEntry } from '../shared/protocol';
import { Input, DEFAULT_BINDINGS } from './input';
import { settings, progress, saveSettings } from './storage';
import { escapeHTML, icon, modal, toast } from './ui';
export const formatTime = (ms: number) => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.floor(ms % 60000 / 1000).toString().padStart(2, '0')}`;
function levelCard(level: Level) {
  const earned = [0, 1, 2].map(i => progress[level.id]?.stars?.[i] ? '★' : '☆').join('');
  return `<button class="level-button" data-level="${level.id}" title="${escapeHTML(level.name)}"><span class="level-card-head"><b>${level.id}</b><small>${earned}</small></span><strong>${escapeHTML(level.name)}</strong><span class="level-layout">${escapeHTML(level.layout ?? WORLDS[level.world].name)}</span><span class="level-size">${level.map[0].length} × ${level.map.length} · ${level.quota} gemas</span></button>`;
}
export function levelMenu(levels: Level[], start: (level: Level) => void) {
  const completed = levels.filter(l => progress[l.id]?.completed).length;
  const el = modal('Um mundo de caminhos', `<p>${completed} de 20 fases concluídas. Caminhos próprios, três estrelas e um segredo em cada templo.</p>${WORLDS.map((w, i) => `<div class="world-heading"><h3>${w.name}</h3><span>0${i + 1} / ${escapeHTML(w.subtitle)}</span></div><div class="level-grid">${levels.filter(l => l.world === i).map(levelCard).join('')}</div>`).join('')}<div class="modal-actions"><button class="secondary" id="show-ranking">${icon('trophy')} Ranking de corrida</button></div>`);
  el.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b => b.onclick = () => start(levels.find(l => l.id === b.dataset.level)!));
  el.querySelector('#show-ranking')!.addEventListener('click', () => rankingMenu(levels));
}
export function rankingMenu(levels: Level[]) {
  const el = modal('Os caminhos mais rápidos', `<p>Tempos de corridas concluídas, medidos pelo servidor. Seu recorde solo fica salvo neste navegador.</p><label>Fase<select id="ranking-level">${levels.map(l => `<option value="${l.id}">${l.id} · ${escapeHTML(l.name)}</option>`).join('')}</select></label><div id="ranking-content" aria-live="polite"></div>`);
  let request = 0;
  const refresh = async () => {
    const id = el.querySelector<HTMLSelectElement>('#ranking-level')!.value, current = ++request; const content = el.querySelector('#ranking-content')!;
    content.innerHTML = '<p>Consultando os registros…</p>';
    try {
      const response = await fetch(`/api/rankings?level=${encodeURIComponent(id)}`); if (!response.ok) throw new Error();
      const rows: RankingEntry[] = await response.json(); if (current !== request) return;
      content.innerHTML = `${progress[id]?.bestMs ? `<p>Seu melhor tempo: <b>${formatTime(progress[id].bestMs)}</b></p>` : ''}${rows.length ? `<table class="ranking-table"><thead><tr><th>Posição</th><th>Explorador</th><th>Tempo</th></tr></thead><tbody>${rows.map((row, i) => `<tr><td>${i + 1}</td><td>${escapeHTML(row.name)}</td><td>${formatTime(row.milliseconds)}.${String(row.milliseconds % 1000).padStart(3, '0')}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">A primeira marca ainda está por vir. Convide alguém para uma corrida.</p>'}`;
    } catch { content.innerHTML = '<p>Ranking indisponível. Inicie o servidor de salas para consultar.</p>'; }
  };
  el.querySelector<HTMLSelectElement>('#ranking-level')!.onchange = () => void refresh(); void refresh();
}
export function optionsMenu(input: Input, update: () => void) {
  const names: Record<string, string> = { up: 'Cima', left: 'Esquerda', down: 'Baixo', right: 'Direita', fire: 'Usar fogo', ice: 'Usar gelo', reset: 'Reiniciar', pause: 'Pausar' };
  const keyName = (value: string) => value.replace('Key', '').replace('Digit', '').replace('Arrow', 'Seta ');
  const el = modal('Prepare sua mochila', `<div class="eyebrow">SOM E AMBIENTE</div><label class="setting">Música<input id="music-volume" type="range" min="0" max="100" value="${Math.round(settings.music * 100)}" aria-label="Volume da música"></label><label class="setting">Efeitos sonoros<input id="effects-volume" type="range" min="0" max="100" value="${Math.round(settings.effectsVolume * 100)}" aria-label="Volume dos efeitos"></label><label class="setting">Partículas, luz e tremor<input type="checkbox" id="screen-effects" ${settings.screenEffects ? 'checked' : ''}></label><label class="setting">Tema claro<input type="checkbox" id="light-theme" ${settings.theme === 'light' ? 'checked' : ''}></label><div class="eyebrow" style="margin-top:25px">SEUS CONTROLES</div><p>Clique em uma tecla e pressione a nova. As setas também movimentam o explorador.</p>${Object.entries(names).map(([key, name]) => `<div class="setting"><label>${name}</label><button class="secondary" data-binding="${key}">${escapeHTML(keyName(settings.bindings[key]))}</button></div>`).join('')}<div class="modal-actions"><button class="secondary" id="reset-bindings">Restaurar controles</button></div>`);
  const apply = () => { input.bindings = { ...settings.bindings }; saveSettings(); update(); };
  el.querySelector<HTMLInputElement>('#music-volume')!.oninput = e => { settings.music = Number((e.target as HTMLInputElement).value) / 100; apply(); };
  el.querySelector<HTMLInputElement>('#effects-volume')!.oninput = e => { settings.effectsVolume = Number((e.target as HTMLInputElement).value) / 100; apply(); };
  el.querySelector<HTMLInputElement>('#screen-effects')!.onchange = e => { settings.screenEffects = (e.target as HTMLInputElement).checked; apply(); };
  el.querySelector<HTMLInputElement>('#light-theme')!.onchange = e => { settings.theme = (e.target as HTMLInputElement).checked ? 'light' : 'dark'; apply(); };
  let capture: ((e: KeyboardEvent) => void) | undefined;
  el.querySelectorAll<HTMLButtonElement>('[data-binding]').forEach(button => button.onclick = () => {
    if (capture) window.removeEventListener('keydown', capture, true);
    const action = button.dataset.binding!; button.textContent = 'Pressione uma tecla…';
    capture = e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code !== 'Escape') {
        if (Object.entries(settings.bindings).some(([key, value]) => key !== action && value === e.code)) toast('Essa tecla já está em uso. Escolha outra.');
        else { settings.bindings[action] = e.code; apply(); }
      }
      button.textContent = keyName(settings.bindings[action]); window.removeEventListener('keydown', capture!, true); capture = undefined;
    }; window.addEventListener('keydown', capture, true);
  });
  const observer = new MutationObserver(() => { if (!el.isConnected) { if (capture) window.removeEventListener('keydown', capture, true); observer.disconnect(); } }); observer.observe(document.body, { childList: true });
  el.querySelector('#reset-bindings')!.addEventListener('click', () => { settings.bindings = { ...DEFAULT_BINDINGS }; apply(); optionsMenu(input, update); });
}
export function creditsMenu() {
  modal('Feito para explorar', `<div class="eyebrow">${GAME_NAME.toLocaleUpperCase('pt-BR')}</div><h3>Um templo imaginário.<br>Muitos caminhos possíveis.</h3><p>Lia e Nilo seguem as raízes de uma árvore ancestral até quatro templos esquecidos. Cada gema devolve um pouco de luz aos portais.</p><p>Design, fases, exploradores, ilustrações procedurais e composições sintetizadas são originais deste projeto. Canvas 2D, TypeScript, Vite, Node.js e ws.</p><p>Inspirado no espírito dos puzzles e aventuras em grade do clássico mobile Diamond Rush. Todos os personagens, layouts, sons e elementos gráficos foram criados do zero.</p><p>Controles: WASD ou setas; F para fogo; I para gelo; R para reiniciar; Esc para pausar. No celular, use o direcional e os poderes na tela.</p><p>A cota abre a saída. Gemas vermelhas e segredos ajudam a conquistar as três estrelas. Morrer conserva o progresso até reiniciar a fase.</p>`);
}
