import './style.css';
import { CONFIG, GAME_NAME, WORLDS } from '../shared/config';
import { createGame, step } from '../shared/engine';
import type { GameState, Level } from '../shared/types';
import { Renderer } from './renderer';
import { Input } from './input';
import { modal, toast } from './ui';
import { mountShell } from './shell';
import { Network } from './network';
import { Lobby } from './lobby';

const files = import.meta.glob<Level>('../../levels/*.json', { eager: true, import: 'default' });
const levels = Object.values(files).sort((a, b) => a.id.localeCompare(b.id));
let currentLevel = levels[0], state: GameState = createGame(currentLevel), playing = false, paused = false;
const app = mountShell(); document.title = GAME_NAME;
const renderer = new Renderer(app.querySelector('canvas')!);
const input = new Input(); input.bindTouch(app);
const network = new Network(), lobby = new Lobby(network, levels);
network.onStatus = message => toast(message);
network.onMessage = message => {
  if (message.type === 'error') toast(message.message);
  if (message.type === 'session' || message.type === 'room') lobby.update(message.room);
  if (message.type === 'emoji') lobby.emoji(message.id, message.emoji);
  if (message.type === 'closed') { playing = false; input.enabled = false; toast(message.message); lobby.open(); }
  if (message.type === 'snapshot') {
    const myState = message.states.find(s => s.players.some(p => p.id === network.id));
    if (!myState) return;
    if (!playing || currentLevel.id !== message.room.levelId || myState.tick < state.tick) renderer.reset();
    state = myState; currentLevel = levels.find(l => l.id === message.room.levelId)!;
    renderer.focusId = network.id; renderer.colors = message.room.mode === 'coop' ? message.room.players.map(p => p.color) : [message.room.players.find(p => p.id === network.id)!.color];
    playing = true; input.enabled = true; paused = message.room.paused || message.room.phase === 'waiting';
    document.querySelector<HTMLElement>('#menu')!.style.display = 'none'; document.querySelector('.touch-controls')!.classList.add('visible'); document.querySelector('.game-frame')!.classList.add('playing');
    document.querySelector('.lobby')?.remove(); updateLevel(); renderer.consume(state.events);
    document.querySelector('#mode-label')!.textContent = `${message.room.mode === 'coop' ? 'CO-OP' : 'CORRIDA'} · ${message.room.code}`;
  }
};
function updateLevel() {
  const w = WORLDS[currentLevel.world]; renderer.world = currentLevel.world;
  document.querySelector('#world-crumb')!.textContent = w.name.toLocaleUpperCase('pt-BR');
  document.querySelector('#world-tag')!.textContent = w.name;
  document.querySelector('#level-name')!.textContent = currentLevel.name;
  document.querySelector('#level-hint')!.textContent = currentLevel.hint;
  document.querySelector('#chapter-number')!.textContent = `MUNDO ${String(currentLevel.world + 1).padStart(2, '0')} · FASE ${String(currentLevel.index).padStart(2, '0')}`;
}
function start(level = currentLevel) {
  if (network.room) network.leave(); renderer.focusId = 'solo';
  currentLevel = level; state = createGame(level); playing = true; paused = false; input.enabled = true; input.clear(); renderer.reset(); updateLevel();
  document.querySelector<HTMLElement>('#menu')!.style.display = 'none';
  document.querySelector('.touch-controls')!.classList.add('visible'); document.querySelector('.game-frame')!.classList.add('playing'); document.querySelector('.modal-backdrop')?.remove();
}
function pause() {
  if (!playing) return; paused = true; input.clear();
  if (network.room) network.send({ type: 'pause', paused: true });
  const el = modal('Uma pausa na expedição', '<p>O templo pode esperar. Respire e escolha o próximo passo.</p><div class="modal-actions"><button class="primary" id="resume">Continuar</button><button class="secondary" id="retry">Reiniciar fase</button></div>');
  el.querySelector('#resume')!.addEventListener('click', () => el.remove()); el.querySelector('#retry')!.addEventListener('click', () => start());
  new MutationObserver((_, obs) => { if (!el.isConnected) { paused = false; if (network.room) network.send({ type: 'pause', paused: false }); obs.disconnect(); } }).observe(document.body, { childList: true });
}
const reset = () => network.room ? network.send({ type: 'restart' }) : start();
input.onReset = reset; input.onPause = pause;
app.querySelector('#start')!.addEventListener('click', () => start()); app.querySelector('#pause')!.addEventListener('click', pause); app.querySelector('#reset')!.addEventListener('click', reset);
app.querySelector('#fullscreen')!.addEventListener('click', () => { if (document.fullscreenElement) void document.exitFullscreen(); else void app.requestFullscreen().catch(() => toast('Tela cheia indisponível neste navegador.')); });
app.querySelector('#theme')!.addEventListener('click', () => document.documentElement.classList.toggle('light'));
app.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => {
  const view = (el as HTMLElement).dataset.view;
  if (view === 'play') start(); else if (view === 'multi') lobby.open(); else if (view === 'credits') modal('Feito para explorar', `<p>${GAME_NAME} é uma aventura original. Arte procedural em Canvas e sons sintetizados, sem assets externos.</p><p>Exploradores: Lia e Nilo. Um templo imaginário, muitos caminhos possíveis.</p>`); else toast('Esta parte da expedição está sendo preparada.');
}));
app.querySelector('#menu-multi')!.addEventListener('click', () => lobby.open());
let lastTick = performance.now(), winShown = false;
function frame(now: number) {
  let steps = 0;
  while (now - lastTick >= CONFIG.tickMs && steps++ < 5) {
    lastTick += CONFIG.tickMs;
    if (playing && !paused && !document.querySelector('.modal-backdrop')) {
      if (network.room) network.intent(input.read()); else { state = step(state, { solo: input.read() }); renderer.consume(state.events); }
    } else if (network.room) network.intent({});
  }
  if (steps >= 5) lastTick = now;
  renderer.render(state, now, network.room?.mode === 'race' ? network.states.find(s => s !== state) : undefined);
  document.querySelector('#gems')!.textContent = `${state.diamonds} / ${state.quota}`;
  document.querySelector('#bonus')!.textContent = String(state.bonus); document.querySelector('#keys')!.textContent = state.keys.join(' · ');
  document.querySelector('#fire')!.textContent = String(state.fire); document.querySelector('#ice')!.textContent = String(state.ice);
  document.querySelector('#deaths')!.textContent = `♡ ${state.players.reduce((n, p) => n + p.deaths, 0)}`;
  const secs = Math.floor(state.tick * CONFIG.tickMs / 1000); document.querySelector('#timer')!.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  if (state.status === 'won' && !winShown) { winShown = true; modal('O templo se abriu!', '<p>Mais um caminho descoberto.</p><button class="primary" id="again">Explorar novamente</button>').querySelector('#again')!.addEventListener('click', () => { winShown = false; start(); }); }
  requestAnimationFrame(frame);
}
updateLevel(); network.restore(); requestAnimationFrame(frame);
