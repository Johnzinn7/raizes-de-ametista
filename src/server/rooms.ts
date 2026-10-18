import { randomInt, randomUUID } from 'node:crypto';
import { CONFIG, DIRECTIONS } from '../shared/config';
import { createGame, step } from '../shared/engine';
import { cooperativeLevel } from '../shared/coop';
import { EMOJIS, type Member, type RoomInfo, type ServerMessage, type RankingEntry } from '../shared/protocol';
import type { GameState, Intent, Level } from '../shared/types';

export interface Peer { send(data: string): void; readyState: number; close(): void }
interface Slot extends Member { token: string; peer?: Peer; disconnectedAt?: number; intent: Intent; tap?: Intent; inputAt: number; seq: number }
interface Room { code: string; mode: 'coop' | 'race'; levelId: string; phase: RoomInfo['phase']; players: Slot[]; states: GameState[]; paused: boolean; winner?: string; sequence: number; started: boolean }
export class RoomManager {
  readonly rooms = new Map<string, Room>(); private sessions = new Map<Peer, { room: Room; slot: Slot }>();
  private limits = new Map<Peer, { time: number; count: number }>();
  now = 0;
  constructor(readonly levels: Level[], private record: (entry: RankingEntry) => void = () => {}) {}
  private send(peer: Peer, message: ServerMessage) { if (peer.readyState === 1) peer.send(JSON.stringify(message)); }
  private error(peer: Peer, message: string) { this.send(peer, { type: 'error', message }); }
  info(room: Room): RoomInfo {
    const disconnected = room.players.filter(p => !p.connected);
    return { code: room.code, mode: room.mode, levelId: room.levelId, phase: room.phase, paused: room.paused, winner: room.winner,
      waitRemaining: disconnected.length ? Math.max(0, Math.ceil((CONFIG.reconnectMs - (this.now - Math.min(...disconnected.map(p => p.disconnectedAt ?? this.now)))) / 1000)) : undefined,
      players: room.players.map(({ id, name, color, ready, connected }) => ({ id, name, color, ready, connected })) };
  }
  private broadcast(room: Room, message: ServerMessage) { for (const slot of room.players) if (slot.peer) this.send(slot.peer, message); }
  private roomUpdate(room: Room) { this.broadcast(room, { type: 'room', room: this.info(room) }); }
  private profile(value: Record<string, unknown>): { name: string; color: string } {
    return { name: typeof value.name === 'string' ? value.name.replace(/[<>\x00-\x1f]/g, '').trim().slice(0, 20) || 'Explorador' : 'Explorador', color: typeof value.color === 'string' && /^#[a-f\d]{6}$/i.test(value.color) ? value.color : '#7da58b' };
  }
  private attach(peer: Peer, room: Room, slot: Slot) {
    if (slot.peer && slot.peer !== peer) { this.sessions.delete(slot.peer); slot.peer.close(); }
    slot.peer = peer; slot.connected = true; slot.disconnectedAt = undefined; slot.intent = {}; slot.tap = undefined; slot.inputAt = this.now;
    this.sessions.set(peer, { room, slot });
    if (room.phase === 'waiting' && room.players.every(p => p.connected)) room.phase = room.started ? 'playing' : 'lobby';
    this.send(peer, { type: 'session', id: slot.id, token: slot.token, inputSeq: slot.seq, room: this.info(room) }); this.roomUpdate(room);
    if (room.states.length) this.snapshot(room);
  }
  handle(peer: Peer, raw: string) {
    if (raw.length > CONFIG.maxMessageBytes) { this.error(peer, 'Mensagem grande demais.'); return; }
    let limit = this.limits.get(peer);
    if (!limit || this.now - limit.time >= 1000) { limit = { time: this.now, count: 0 }; this.limits.set(peer, limit); }
    if (++limit.count > 90) { this.error(peer, 'Muitas mensagens. Aguarde um instante.'); return; }
    let v: Record<string, unknown>;
    try { v = JSON.parse(raw); if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(); } catch { this.error(peer, 'Mensagem inválida.'); return; }
    const session = this.sessions.get(peer);
    if (v.type === 'create' || v.type === 'join') {
      if (session) { this.error(peer, 'Saia da sala atual primeiro.'); return; }
      let room: Room;
      if (v.type === 'create') {
        if (this.rooms.size >= CONFIG.maxRoomCount) { this.error(peer, 'Todas as salas estão ocupadas.'); return; }
        if (v.mode !== 'coop' && v.mode !== 'race') { this.error(peer, 'Modo inválido.'); return; }
        if (!this.levels.some(l => l.id === v.levelId)) { this.error(peer, 'Fase não encontrada.'); return; }
        let code: string; do { code = Array.from({ length: 4 }, () => String.fromCharCode(65 + randomInt(26))).join(''); } while (this.rooms.has(code));
        room = { code, mode: v.mode, levelId: v.levelId as string, phase: 'lobby', players: [], states: [], paused: false, sequence: 0, started: false }; this.rooms.set(code, room);
      } else {
        const found = this.rooms.get(String(v.code).toUpperCase());
        if (!found) { this.error(peer, 'Sala não encontrada. Confira as quatro letras.'); return; }
        if (found.players.length >= 2 || found.phase !== 'lobby') { this.error(peer, 'Esta sala já está ocupada ou em jogo.'); return; }
        room = found;
      }
      const slot: Slot = { ...this.profile(v), id: randomUUID(), token: randomUUID(), ready: false, connected: true, intent: {}, seq: -1, inputAt: this.now };
      room.players.push(slot); this.attach(peer, room, slot); return;
    }
    if (v.type === 'reconnect') {
      const room = this.rooms.get(String(v.code)); const slot = room?.players.find(p => p.token === v.token);
      if (!room || !slot || (slot.disconnectedAt !== undefined && this.now - slot.disconnectedAt >= CONFIG.reconnectMs)) this.error(peer, 'A sessão expirou. Crie uma nova sala.');
      else this.attach(peer, room, slot); return;
    }
    if (!session) { this.error(peer, 'Entre em uma sala primeiro.'); return; }
    const { room, slot } = session;
    if (v.type === 'input') {
      if (!Number.isSafeInteger(v.seq) || (v.seq as number) <= slot.seq || !v.intent || typeof v.intent !== 'object') return;
      const intent = v.intent as Record<string, unknown>;
      slot.seq = v.seq as number;
      slot.intent = { direction: typeof intent.direction === 'string' && Object.hasOwn(DIRECTIONS, intent.direction) ? intent.direction as Intent['direction'] : undefined,
        action: intent.action === 'fire' || intent.action === 'ice' ? intent.action : undefined }; slot.inputAt = this.now;
      if (v.press === true && (slot.intent.direction || slot.intent.action)) slot.tap = { ...slot.intent };
    } else if (v.type === 'ready' && room.phase === 'lobby') {
      slot.ready = v.ready === true;
      if (room.players.length === 2 && room.players.every(p => p.ready && p.connected)) this.start(room);
      this.roomUpdate(room);
    } else if (v.type === 'emoji' && EMOJIS.includes(v.emoji as typeof EMOJIS[number])) this.broadcast(room, { type: 'emoji', id: slot.id, emoji: v.emoji as string });
    else if (v.type === 'leave') { this.remove(room, slot); }
    else if (room.players[0] === slot) {
      if (v.type === 'pause') { room.paused = v.paused === true; room.players.forEach(p => { p.intent = {}; p.tap = undefined; }); this.roomUpdate(room); }
      if (v.type === 'restart' && room.players.length === 2 && room.players.every(p => p.connected)) this.start(room);
      if (v.type === 'next' && room.phase === 'finished') {
        const i = this.levels.findIndex(l => l.id === room.levelId); room.levelId = this.levels[(i + 1) % this.levels.length].id; this.start(room);
      }
    }
  }
  private start(room: Room) {
    const level = this.levels.find(l => l.id === room.levelId)!;
    room.states = room.mode === 'coop' ? [createGame(cooperativeLevel(level), room.players.map(p => p.id), 'coop')] : room.players.map(p => createGame(level, [p.id], 'race'));
    room.phase = 'playing'; room.started = true; room.paused = false; room.winner = undefined; room.players.forEach(p => { p.intent = {}; p.tap = undefined; }); this.snapshot(room);
  }
  private remove(room: Room, slot: Slot) {
    if (slot.peer) this.sessions.delete(slot.peer);
    room.players = room.players.filter(p => p !== slot);
    if (!room.players.length) this.rooms.delete(room.code);
    else if (room.started) { this.broadcast(room, { type: 'closed', message: 'A outra pessoa saiu da expedição.' }); for (const p of room.players) if (p.peer) this.sessions.delete(p.peer); this.rooms.delete(room.code); }
    else this.roomUpdate(room);
  }
  disconnect(peer: Peer) {
    this.limits.delete(peer); const session = this.sessions.get(peer); if (!session) return;
    this.sessions.delete(peer); const { room, slot } = session;
    if (slot.peer !== peer) return;
    slot.connected = false; slot.peer = undefined; slot.disconnectedAt = this.now; slot.intent = {}; slot.tap = undefined;
    if (room.phase === 'playing') { room.phase = 'waiting'; room.players.forEach(p => { p.intent = {}; p.tap = undefined; }); } this.roomUpdate(room);
  }
  private snapshot(room: Room) { this.broadcast(room, { type: 'snapshot', room: this.info(room), states: room.states, sequence: ++room.sequence }); }
  advance(now: number) {
    this.now = now;
    for (const room of this.rooms.values()) {
      const expired = room.players.find(p => !p.connected && now - (p.disconnectedAt ?? now) >= CONFIG.reconnectMs);
      if (expired) { this.broadcast(room, { type: 'closed', message: 'A espera de 30 segundos terminou. Volte ao lobby para jogar.' }); for (const p of room.players) if (p.peer) this.sessions.delete(p.peer); this.rooms.delete(room.code); continue; }
      if (room.phase !== 'playing' || room.paused) { if (room.phase === 'waiting' && now % 1000 < CONFIG.tickMs) this.roomUpdate(room); continue; }
      const intents = Object.fromEntries(room.players.map(slot => {
        const state = room.states.find(state => state.players.some(player => player.id === slot.id))!;
        const player = state.players.find(player => player.id === slot.id)!;
        if (now - slot.inputAt > 1000 || player.deadUntil || player.exited) { slot.tap = undefined; return [slot.id, {}]; }
        if (slot.tap && state.tick + 1 >= player.nextMove) { const tap = slot.tap; slot.tap = undefined; return [slot.id, tap]; }
        return [slot.id, slot.intent];
      }));
      room.states = room.states.map(s => step(s, intents));
      const won = room.states.findIndex(s => s.status === 'won');
      if (won >= 0) {
        room.phase = 'finished'; room.winner = room.mode === 'race' ? room.players[won].id : undefined;
        if (room.mode === 'race') this.record({ name: room.players[won].name, levelId: room.levelId, milliseconds: room.states[won].tick * CONFIG.tickMs, date: new Date().toISOString() });
      }
      this.snapshot(room);
    }
  }
}
