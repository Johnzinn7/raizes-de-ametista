import './style.css';
import { CONFIG, GAME_NAME, WORLDS } from '../shared/config';
import { createGame, step, stars } from '../shared/engine';
import type { GameState, Level } from '../shared/types';
import type { RoomInfo } from '../shared/protocol';
import { Renderer } from './renderer';
import { Input } from './input';
import { escapeHTML, icon, modal, toast } from './ui';
import { mountShell } from './shell';
import { Network } from './network';
import { Lobby } from './lobby';
import { Editor } from './editor';
import { AudioSystem } from './audio';
import { settings, progress, saveSettings, saveResult } from './storage';
import { levelMenu, optionsMenu, creditsMenu, rankingMenu, formatTime } from './menus';

const files = import.meta.glob<Level>('../../levels/*.json', { eager: true, import: 'default' });
const levels = Object.values(files).sort((a, b) => a.id.localeCompare(b.id));
let currentLevel = levels[0], state: GameState = createGame(currentLevel);
let playing = false, paused = false, resultShown = false, lastTick = performance.now();
const app = mountShell(); document.title = GAME_NAME;
const renderer = new Renderer(app.querySelector('canvas')!), input = new Input(), audio = new AudioSystem();
const network = new Network(), lobby = new Lobby(network, levels), editor = new Editor(level => start(level));
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
const text = (selector: string, value: string) => { const el = $(selector); if (el.textContent !== value) el.textContent = value; };
input.bindTouch(app); input.onActivity = () => audio.unlock();
app.addEventListener('pointerdown', () => audio.unlock(), { once: true });

function applySettings() {
  renderer.effects = settings.screenEffects; audio.update(); input.bindings = { ...settings.bindings };
  document.documentElement.classList.toggle('light', settings.theme === 'light');
}
function updateLevel() {
  const w = WORLDS[currentLevel.world]; renderer.world = currentLevel.world; audio.setWorld(currentLevel.world);
  text('#world-crumb', w.name.toLocaleUpperCase('pt-BR')); text('#world-tag', w.name);
  text('#level-name', currentLevel.name); text('#level-hint', currentLevel.hint);
  text('#chapter-number', `MUNDO ${String(currentLevel.world + 1).padStart(2, '0')} · FASE ${String(currentLevel.index).padStart(2, '0')}`);
  text('#level-stars', [0, 1, 2].map(i => progress[currentLevel.id]?.stars?.[i] ? '★' : '☆').join(' '));
}
function showPlaying() {
  $('#menu').style.display = 'none'; $('.touch-controls').classList.add('visible'); $('.game-frame').classList.add('playing');
}
function start(level = currentLevel) {
  if (network.room) network.leave();
  currentLevel = level; state = createGame(level); playing = true; paused = false; resultShown = false;
  input.enabled = true; input.clear(); renderer.focusId = 'solo'; renderer.colors = ['#7da58b', '#ba7e82'];
  renderer.reset(); audio.reset(); audio.unlock(); updateLevel(); showPlaying(); text('#mode-label', 'AVENTURA SOLO');
  document.querySelector('.modal-backdrop')?.remove(); document.querySelector('.peer-status')?.remove(); document.querySelector('.death-banner')?.remove();
  lastTick = performance.now(); $('canvas').focus({ preventScroll: true });
}
function home() {
  network.leave(); playing = false; paused = false; input.enabled = false; input.clear(); resultShown = false;
  currentLevel = levels[0]; state = createGame(currentLevel); renderer.focusId = 'solo'; renderer.reset(); updateLevel();
  $('#menu').style.display = 'flex'; $('.touch-controls').classList.remove('visible'); $('.game-frame').classList.remove('playing');
  text('#mode-label', 'AVENTURA SOLO'); text('#status-caption', 'Um segredo espera por você em cada fase.');
  document.querySelector('.modal-backdrop')?.remove(); document.querySelector('.peer-status')?.remove();
}
const isHost = () => network.room?.players[0]?.id === network.id;
function reset() {
  if (network.room) { if (isHost()) network.send({ type: 'restart' }); else toast('O anfitrião pode reiniciar a fase para os dois.'); }
  else start();
}
function pause() {
  if (!playing) return; input.clear();
  const online = !!network.room, host = isHost();
  if (!online || host) paused = true;
  if (online && host) network.send({ type: 'pause', paused: true });
  const el = modal('Uma pausa na expedição', `<p>${online && !host ? 'O anfitrião controla a pausa compartilhada. O templo continua enquanto você está aqui.' : 'O templo pode esperar. Respire e escolha o próximo passo.'}</p><div class="modal-actions"><button class="primary" id="resume">Continuar ${icon('arrow')}</button><button class="secondary" id="retry" ${online && !host ? 'disabled' : ''}>Reiniciar fase</button><button class="secondary" id="return-home">Menu principal</button></div>`);
  el.querySelector('#resume')!.addEventListener('click', () => el.remove());
  el.querySelector('#retry')!.addEventListener('click', () => { el.remove(); reset(); });
  el.querySelector('#return-home')!.addEventListener('click', home);
  const obs = new MutationObserver(() => {
    if (el.isConnected) return; input.clear();
    if (network.room && host) network.send({ type: 'pause', paused: false });
    paused = !!network.room?.paused; obs.disconnect();
  }); obs.observe(document.body, { childList: true });
}
function consumeEvents() {
  renderer.consume(state.events); audio.consume(state.events);
  const me = state.players.find(p => p.id === (network.room ? network.id : 'solo')) ?? state.players[0];
  if (state.events.some(e => e.kind === 'death' && e.x === me.x && e.y === me.y)) {
    document.querySelector('.death-banner')?.remove();
    const banner = document.createElement('div'); banner.className = 'death-banner'; banner.role = 'status';
    banner.textContent = network.room?.mode === 'coop' ? 'O templo levou a melhor. Retorno ao checkpoint em 3 s…' : 'O templo levou a melhor. De volta ao checkpoint!';
    $('.canvas-wrap').append(banner); setTimeout(() => banner.remove(), network.room?.mode === 'coop' ? 3000 : 1300);
  }
  if (state.events.some(e => e.kind === 'secret')) toast('Segredo descoberto! Uma gema fora dos caminhos comuns.');
  if (state.events.some(e => e.kind === 'checkpoint')) text('#status-caption', 'Checkpoint ativado. Suas descobertas estão seguras.');
}
function peerStatus(room: RoomInfo) {
  let message = '';
  if (room.phase === 'waiting') message = `Reconectando o parceiro… ${room.waitRemaining ?? 30} s`;
  else if (room.paused) message = 'O anfitrião pausou a expedição.';
  else if (room.mode === 'race' && network.states.length) {
    const rival = network.states.find(s => !s.players.some(p => p.id === network.id));
    const member = room.players.find(p => p.id !== network.id);
    if (rival) message = `${member?.name ?? 'Rival'} · ◆ ${rival.diamonds}/${rival.quota} · ${formatTime(rival.tick * CONFIG.tickMs)}`;
  } else if (state.players.find(p => p.id === network.id)?.exited && state.status !== 'won') message = 'Você chegou! Esperando o parceiro no portal…';
  let el = document.querySelector<HTMLElement>('.peer-status');
  if (!message) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'peer-status'; el.role = 'status'; $('.canvas-wrap').append(el); }
  el.textContent = message;
}
network.onStatus = message => { toast(message); input.clear(); };
network.onMessage = message => {
  if (message.type === 'error') { toast(message.message); if (message.message.includes('expirou')) { home(); lobby.open(); } }
  if (message.type === 'session' || message.type === 'room') {
    lobby.update(message.room); paused = message.room.paused || message.room.phase === 'waiting'; peerStatus(message.room);
    if (message.room.phase === 'lobby') { playing = false; input.enabled = false; }
  }
  if (message.type === 'emoji') lobby.emoji(message.id, message.emoji);
  if (message.type === 'closed') { home(); toast(message.message); lobby.open(); }
  if (message.type === 'snapshot') {
    const myState = message.states.find(s => s.players.some(p => p.id === network.id)); if (!myState) return;
    const changed = !playing || currentLevel.id !== message.room.levelId || myState.tick < state.tick;
    if (changed) { renderer.reset(); audio.reset(); resultShown = false; document.querySelector('.modal-backdrop')?.remove(); }
    state = myState; currentLevel = levels.find(l => l.id === message.room.levelId)!; renderer.focusId = network.id;
    renderer.colors = message.room.mode === 'coop' ? message.room.players.map(p => p.color) : [message.room.players.find(p => p.id === network.id)!.color];
    playing = true; input.enabled = true; paused = message.room.paused || message.room.phase === 'waiting';
    showPlaying(); document.querySelector('.lobby')?.remove(); if (changed) updateLevel(); consumeEvents(); peerStatus(message.room);
    text('#mode-label', `${message.room.mode === 'coop' ? 'CO-OP' : 'CORRIDA'} · ${message.room.code}`);
  }
};

function showResult() {
  resultShown = true; input.clear();
  const online = !!network.room, lost = online && network.room?.mode === 'race' && network.room.winner !== network.id;
  const earned = stars(state), elapsed = state.tick * CONFIG.tickMs, deaths = state.players.reduce((n, p) => n + p.deaths, 0);
  if (!lost && currentLevel.id !== 'custom') { saveResult(currentLevel.id, earned, elapsed); updateLevel(); }
  if (lost) audio.play('lose');
  const lastLevel = levels.at(-1)?.id === currentLevel.id;
  const el = modal(lost ? 'A próxima corrida pode ser sua' : lastLevel ? 'O coração do templo despertou!' : 'O templo se abriu!', `<p style="text-align:center">${lost ? `${escapeHTML(network.room?.players.find(p => p.id === network.room?.winner)?.name ?? 'Seu rival')} encontrou o portal primeiro.` : lastLevel ? 'Você atravessou os quatro mundos. As raízes voltaram a brilhar.' : 'Mais um caminho descoberto. Mais uma história na mochila.'}</p><div class="victory-stars">${earned.map(v => !lost && v ? '★' : '☆').join('')}</div><div class="victory-stats"><span>◷ ${formatTime(elapsed)}</span><span>◆ ${state.diamonds} + ${state.bonus}</span><span>Mortes: ${deaths}</span></div><div class="star-details">${[['Todas as gemas e tesouros', earned[0]], ['Nenhuma morte', earned[1]], [`Tempo-alvo · ${formatTime(currentLevel.targetSeconds * 1000)}`, earned[2]]].map(([label, ok]) => `<div class="${ok && !lost ? 'earned' : ''}"><span>${label}</span><span>${ok && !lost ? '★ Conquistada' : '☆ Tente de novo'}</span></div>`).join('')}</div><div class="modal-actions"><button class="primary" id="next-level" ${online && !isHost() ? 'disabled' : ''}>${online && !isHost() ? 'Aguardando anfitrião' : lastLevel ? 'Explorar outra vez' : 'Próxima fase'} ${icon('arrow')}</button><button class="secondary" id="result-retry" ${online && !isHost() ? 'disabled' : ''}>Tentar novamente</button><button class="secondary" id="result-home">Menu principal</button><button class="secondary" id="result-rank">Ranking</button></div>`);
  el.querySelector('#next-level')!.addEventListener('click', () => {
    el.remove(); if (online) network.send({ type: 'next' }); else start(levels[(levels.findIndex(l => l.id === currentLevel.id) + 1) % levels.length]);
  });
  el.querySelector('#result-retry')!.addEventListener('click', () => { el.remove(); reset(); });
  el.querySelector('#result-home')!.addEventListener('click', home);
  el.querySelector('#result-rank')!.addEventListener('click', () => rankingMenu(levels));
}
input.onReset = reset; input.onPause = pause;
input.onChange = press => {
  if (!playing || paused || state.status !== 'playing' || document.querySelector('.modal-backdrop')) return;
  if (network.room) { network.intent(input.read(false), press); return; }
  const player = state.players[0], intent = input.read(false);
  if (!player.deadUntil && state.tick + 1 >= player.nextMove && (intent.direction || intent.action)) {
    state = step(state, { solo: input.read() });
    // Consume the upcoming tick early without adding extra ticks to the clock.
    lastTick += CONFIG.tickMs; consumeEvents(); updateHUD();
  }
};
$('#start').addEventListener('click', () => start(levels.find(l => !progress[l.id]?.completed) ?? levels[0]));
$('#pause').addEventListener('click', pause); $('#reset').addEventListener('click', reset);
$('#fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else if (app.requestFullscreen) void app.requestFullscreen().catch(() => toast('Tela cheia indisponível neste navegador.'));
});
$('#theme').addEventListener('click', () => { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applySettings(); });
$('.brand').addEventListener('click', e => { e.preventDefault(); home(); });
app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(el => el.onclick = () => {
  input.clear(); const view = el.dataset.view;
  app.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === el));
  if (view === 'play') start();
  if (view === 'multi') lobby.open();
  if (view === 'editor') editor.open();
  if (view === 'levels') levelMenu(levels, start);
  if (view === 'options') optionsMenu(input, applySettings);
  if (view === 'credits') creditsMenu();
});
$('#menu-multi').addEventListener('click', () => { input.clear(); lobby.open(); });
window.addEventListener('blur', () => { input.clear(); if (playing && !network.room && !document.querySelector('.modal-backdrop')) pause(); });

function updateHUD() {
  text('#gems', `${state.diamonds} / ${state.quota}`); text('#bonus', String(state.bonus)); text('#keys', state.keys.join(' · '));
  text('#fire', String(state.fire)); text('#ice', String(state.ice));
  text('#deaths', `♡ ${state.players.reduce((n, p) => n + p.deaths, 0)}`); text('#timer', formatTime(state.tick * CONFIG.tickMs));
  const canvas = $('canvas'); canvas.dataset.tick = String(state.tick);
  const me = state.players.find(p => p.id === (network.room ? network.id : 'solo')) ?? state.players[0];
  canvas.dataset.player = `${me.x},${me.y}`; canvas.dataset.status = state.status;
}
function frame(now: number) {
  let steps = 0; const hasModal = !!document.querySelector('.modal-backdrop');
  while (now - lastTick >= CONFIG.tickMs && steps++ < 5) {
    lastTick += CONFIG.tickMs;
    if (playing && !paused && !hasModal) {
      if (network.room) network.intent(input.read()); else { state = step(state, { solo: input.read(state.tick + 1 >= state.players[0].nextMove) }); consumeEvents(); }
    } else if (network.room) network.intent({});
  }
  if (steps >= 5) lastTick = now;
  audio.pause(paused || document.hidden);
  renderer.render(state, now, network.room?.mode === 'race' ? network.states.find(s => s !== state) : undefined); updateHUD();
  if (playing && !resultShown && (state.status === 'won' || network.room?.phase === 'finished')) showResult();
  requestAnimationFrame(frame);
}
applySettings(); updateLevel(); network.restore(); requestAnimationFrame(frame);
