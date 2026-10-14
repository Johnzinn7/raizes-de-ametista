import type { Level } from '../shared/types';
import type { RoomInfo } from '../shared/protocol';
import { EMOJIS } from '../shared/protocol';
import { Network } from './network';
import { escapeHTML, icon, modal, toast } from './ui';
export class Lobby {
  constructor(readonly network: Network, readonly levels: Level[]) {}
  open() {
    if (this.network.room?.players) { this.update(this.network.room); return; }
    const el = modal('A aventura é melhor a dois', `<p>Compartilhe o caminho no cooperativo ou dispute cada segundo na corrida. As duas pessoas precisam acessar o mesmo servidor.</p><div class="form-grid"><div class="form-row"><label>Seu nome<input id="player-name" maxlength="20" value="Explorador" autocomplete="nickname"></label><label>Cor do explorador<input id="player-color" type="color" value="#7da58b"></label></div><div class="form-row"><label>Modo<select id="room-mode"><option value="coop">Cooperativo · juntos no templo</option><option value="race">Corrida · quem chega primeiro?</option></select></label><label>Fase<select id="room-level">${this.levels.map(l => `<option value="${l.id}">${l.id} · ${escapeHTML(l.name)}</option>`).join('')}</select></label></div><button class="primary" id="create-room">Criar sala ${icon('arrow')}</button><div class="footer-rule"></div><label>Já tem um código?<div class="form-row"><input id="join-code" maxlength="4" placeholder="ABCD" aria-label="Código da sala" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:5px"><button class="secondary" id="join-room">Entrar na sala</button></div></label></div>`);
    el.classList.add('lobby');
    const profile = () => ({ name: el.querySelector<HTMLInputElement>('#player-name')!.value, color: el.querySelector<HTMLInputElement>('#player-color')!.value });
    el.querySelector('#create-room')!.addEventListener('click', () => this.network.connect({ type: 'create', ...profile(), mode: el.querySelector<HTMLSelectElement>('#room-mode')!.value as 'coop' | 'race', levelId: el.querySelector<HTMLSelectElement>('#room-level')!.value }));
    el.querySelector('#join-room')!.addEventListener('click', () => {
      const code = el.querySelector<HTMLInputElement>('#join-code')!.value.trim().toUpperCase();
      if (!/^[A-Z]{4}$/.test(code)) { toast('Digite as quatro letras do código.'); return; }
      this.network.connect({ type: 'join', code, ...profile() });
    });
  }
  update(room: RoomInfo) {
    if (room.phase !== 'lobby') { document.querySelector('.lobby')?.remove(); return; }
    const me = room.players.find(p => p.id === this.network.id);
    const el = modal('Seu ponto de encontro', `<div class="eyebrow" style="text-align:center">COMPARTILHE ESTE CÓDIGO</div><div class="room-code" data-testid="room-code">${room.code}</div><p style="text-align:center">${room.mode === 'coop' ? 'Cooperativo' : 'Corrida'} · ${escapeHTML(this.levels.find(l => l.id === room.levelId)?.name)}</p>${room.players.map(p => `<div class="player-card"><i class="avatar-dot" style="--player-color:${p.color}"></i><b>${escapeHTML(p.name)}</b><span>${p.connected ? p.ready ? '✓ Pronto' : 'Escolhendo a mochila…' : 'Reconectando…'}</span></div>`).join('')}${room.players.length < 2 ? '<p class="empty-state">Esperando o segundo explorador… Abra outra aba e entre com o código acima.</p>' : ''}<div class="modal-actions"><button class="primary" id="ready">${me?.ready ? 'Ainda não estou pronto' : 'Estou pronto'}</button><button class="secondary" id="copy-code">Copiar código</button><button class="secondary" id="leave-room">Sair da sala</button></div><div class="emojis">${EMOJIS.map(e => `<button data-emoji="${e}" aria-label="Enviar ${e}">${e}</button>`).join('')}</div><div class="chat-log" aria-live="polite" id="chat-log"></div>`);
    el.classList.add('lobby');
    el.querySelector('#ready')!.addEventListener('click', () => this.network.send({ type: 'ready', ready: !me?.ready }));
    el.querySelector('#copy-code')!.addEventListener('click', () => {
      if (!navigator.clipboard) { toast(`Código da sala: ${room.code}`); return; }
      void navigator.clipboard.writeText(room.code).then(() => toast('Código copiado.')).catch(() => toast(`Código da sala: ${room.code}`));
    });
    el.querySelector('#leave-room')!.addEventListener('click', () => { this.network.leave(); el.remove(); });
    el.querySelectorAll<HTMLElement>('[data-emoji]').forEach(button => button.onclick = () => this.network.send({ type: 'emoji', emoji: button.dataset.emoji! }));
  }
  emoji(id: string, emoji: string) {
    const name = this.network.room?.players.find(p => p.id === id)?.name ?? 'Explorador';
    const log = document.querySelector('#chat-log'); if (log) { const line = document.createElement('div'); line.textContent = `${name}: ${emoji}`; log.append(line); while (log.children.length > 4) log.firstElementChild?.remove(); } else toast(`${name} ${emoji}`);
  }
}
