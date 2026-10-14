/// <reference lib="webworker" />
import { solveLevel } from '../shared/solver';
import { validateLevel } from '../shared/engine';
import type { Level } from '../shared/types';
self.onmessage = (e: MessageEvent<Level>) => {
  try {
    const errors = validateLevel(e.data);
    self.postMessage(errors.length ? { solved: false, reason: errors.join(' ') } : solveLevel(e.data));
  } catch { self.postMessage({ solved: false, reason: 'Não foi possível ler esta fase.' }); }
};
