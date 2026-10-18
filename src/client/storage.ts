import { DEFAULT_BINDINGS } from './input';
import { PROGRESS_STORAGE_KEY } from '../shared/config';
export interface Settings { music: number; effectsVolume: number; screenEffects: boolean; theme: 'dark' | 'light'; bindings: Record<string, string> }
export interface Progress { stars: boolean[]; bestMs: number; completed: boolean }
const read = <T>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
export const settings: Settings = { music: .22, effectsVolume: .55, screenEffects: !matchMedia('(prefers-reduced-motion: reduce)').matches, theme: 'dark', bindings: { ...DEFAULT_BINDINGS } };
const saved = read<Partial<Settings>>('amethyst-settings', {});
if (typeof saved.music === 'number') settings.music = Math.max(0, Math.min(1, saved.music));
if (typeof saved.effectsVolume === 'number') settings.effectsVolume = Math.max(0, Math.min(1, saved.effectsVolume));
if (typeof saved.screenEffects === 'boolean') settings.screenEffects = saved.screenEffects;
if (saved.theme === 'light') settings.theme = 'light';
if (saved.bindings && typeof saved.bindings === 'object') for (const key of Object.keys(settings.bindings)) if (typeof saved.bindings[key] === 'string') settings.bindings[key] = saved.bindings[key];
export const progress: Record<string, Progress> = read(PROGRESS_STORAGE_KEY, {});
export const saveSettings = () => { try { localStorage.setItem('amethyst-settings', JSON.stringify(settings)); } catch { /* Gameplay is available without persistent storage. */ } };
export function saveResult(id: string, earned: boolean[], milliseconds: number) {
  const old = progress[id];
  progress[id] = { stars: earned.map((star, i) => star || !!old?.stars?.[i]), bestMs: Math.min(old?.bestMs ?? Infinity, milliseconds), completed: true };
  try { localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch { /* A session can still keep its progress in memory. */ }
}
