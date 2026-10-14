import type { GameState, Intent } from './types';
export interface Member { id: string; name: string; color: string; ready: boolean; connected: boolean }
export interface RoomInfo { code: string; mode: 'coop' | 'race'; levelId: string; phase: 'lobby' | 'playing' | 'waiting' | 'finished'; players: Member[]; paused: boolean; winner?: string; waitRemaining?: number }
export type ClientMessage =
  | { type: 'create'; name: string; color: string; mode: 'coop' | 'race'; levelId: string }
  | { type: 'join'; code: string; name: string; color: string }
  | { type: 'reconnect'; code: string; token: string }
  | { type: 'ready'; ready: boolean }
  | { type: 'input'; seq: number; intent: Intent }
  | { type: 'emoji'; emoji: string }
  | { type: 'pause'; paused: boolean }
  | { type: 'restart' | 'next' | 'leave' };
export type ServerMessage =
  | { type: 'session'; id: string; token: string; inputSeq: number; room: RoomInfo }
  | { type: 'room'; room: RoomInfo }
  | { type: 'snapshot'; room: RoomInfo; states: GameState[]; sequence: number }
  | { type: 'emoji'; id: string; emoji: string }
  | { type: 'error'; message: string }
  | { type: 'closed'; message: string };
export interface RankingEntry { name: string; levelId: string; milliseconds: number; date: string }
export const EMOJIS = ['👋', '💎', '👍', '🔥', '❄️', '🏁'] as const;
