import type { ClientMessage, ServerMessage, RoomInfo } from '../shared/protocol';
import type { GameState, Intent } from '../shared/types';
export class Network {
  private socket?: WebSocket; private reconnectTimer?: ReturnType<typeof setTimeout>; private retries = 0; private seq = 0;
  private pending?: ClientMessage; private leaving = false;
  room?: RoomInfo; id = ''; token = ''; states: GameState[] = [];
  onMessage: (message: ServerMessage) => void = () => {};
  onStatus: (message: string) => void = () => {};
  connect(message?: ClientMessage) {
    this.leaving = false; this.pending = message;
    if (this.socket?.readyState === WebSocket.OPEN) { if (message) this.send(message); return; }
    if (this.socket?.readyState === WebSocket.CONNECTING) return;
    const url = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;
    this.socket = new WebSocket(url);
    this.socket.onopen = () => {
      this.retries = 0;
      if (this.room && this.token) this.send({ type: 'reconnect', code: this.room.code, token: this.token });
      else if (this.pending) this.send(this.pending);
      this.pending = undefined;
    };
    this.socket.onmessage = event => {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.type === 'session') { this.id = message.id; this.token = message.token; this.seq = Math.max(this.seq, message.inputSeq + 1); this.room = message.room; this.persist(); }
      if (message.type === 'room' || message.type === 'snapshot') this.room = message.room;
      if (message.type === 'snapshot') this.states = message.states;
      if (message.type === 'closed') { this.room = undefined; this.token = ''; this.persist(); }
      if (message.type === 'error' && message.message.includes('expirou')) { this.room = undefined; this.token = ''; this.persist(); }
      this.onMessage(message);
    };
    this.socket.onclose = () => {
      if (this.leaving) return;
      this.onStatus('Conexão interrompida. Tentando reconectar…');
      if (this.room && ++this.retries <= 15) this.reconnectTimer = setTimeout(() => this.connect(), 1500);
      else this.onStatus('Não foi possível conectar ao servidor. Confira se npm run dev ou npm start está ativo.');
    };
    this.socket.onerror = () => this.onStatus('O servidor de salas está indisponível.');
  }
  restore() {
    try { const value = JSON.parse(sessionStorage.getItem('amethyst-session') || 'null'); if (value?.code && value?.token) { this.token = value.token; this.room = { code: value.code } as RoomInfo; this.connect(); } } catch { /* Storage can be unavailable. */ }
  }
  private persist() { try { if (this.room && this.token) sessionStorage.setItem('amethyst-session', JSON.stringify({ code: this.room.code, token: this.token })); else sessionStorage.removeItem('amethyst-session'); } catch { /* Private mode can disable storage. */ } }
  send(message: ClientMessage) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
  intent(intent: Intent) { this.send({ type: 'input', seq: this.seq++, intent }); }
  leave() { this.leaving = true; clearTimeout(this.reconnectTimer); this.send({ type: 'leave' }); this.socket?.close(); this.socket = undefined; this.room = undefined; this.states = []; this.token = ''; this.persist(); }
}
