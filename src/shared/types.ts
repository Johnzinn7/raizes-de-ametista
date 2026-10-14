import type { Direction } from './config';
export const TILE_CHARS = '#.,drh~^!abcABClpGtf i$XWPEs*>v<u'.replaceAll(' ', '');
export interface Point { x: number; y: number }
export interface Circuit { gates: Point[]; triggers: Point[]; traps?: Point[]; requireAll?: boolean }
export interface Level {
  id: string; name: string; world: number; index: number; quota: number; targetSeconds: number;
  hint: string; map: string[]; circuits: Circuit[]; teleports: [Point, Point][];
  solution?: string; coopSolution?: string; coopOnly?: boolean;
}
export interface Intent { direction?: Direction; action?: 'fire' | 'ice'; }
export interface Player extends Point {
  id: string; direction: Direction; nextMove: number; deadUntil: number;
  deaths: number; checkpoint: Point; exited: boolean; teleportLock: boolean;
  animation: 'idle' | 'walk' | 'push' | 'die' | 'celebrate' | 'use'; animationUntil: number;
}
export interface Rock extends Point { falling: boolean; id: number }
export interface Enemy extends Point { kind: 'snake' | 'bat'; direction: Direction; alive: boolean; diedAt?: number }
export interface Dart extends Point { direction: Direction }
export interface GameEvent extends Point { kind: 'step' | 'collect' | 'foliage' | 'push' | 'land' | 'death' | 'door' | 'power' | 'win' | 'secret' | 'checkpoint' | 'enemy'; tick: number }
export interface GameState {
  levelId: string; width: number; height: number; tiles: string[]; players: Player[];
  rocks: Rock[]; enemies: Enemy[]; darts: Dart[]; circuits: Circuit[]; teleports: [Point, Point][];
  tick: number; diamonds: number; bonus: number; totalDiamonds: number; totalBonus: number;
  quota: number; targetSeconds: number; keys: number[]; fire: number; ice: number;
  levers: Record<string, boolean>; gates: Record<string, boolean>; secrets: number;
  mode: 'solo' | 'coop' | 'race'; status: 'playing' | 'won'; events: GameEvent[];
}
