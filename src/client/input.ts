import type { Intent } from '../shared/types';
import type { Direction } from '../shared/config';
export const DEFAULT_BINDINGS: Record<string, string> = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'KeyF', ice: 'KeyI', reset: 'KeyR', pause: 'Escape' };
export class Input {
  bindings = { ...DEFAULT_BINDINGS }; private pressed = new Set<string>(); private touch?: Direction; private power?: 'fire' | 'ice';
  onReset = () => {}; onPause = () => {}; onActivity = () => {}; enabled = false;
  constructor() {
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement)?.matches('input,textarea,select') || document.querySelector('.modal-backdrop') || !this.enabled) return;
      if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', ...Object.values(this.bindings), 'Space'].includes(e.code)) e.preventDefault();
      this.onActivity(); this.pressed.add(e.code); if (e.repeat) return;
      if (e.code === this.bindings.reset) this.onReset(); if (e.code === this.bindings.pause) this.onPause();
    });
    window.addEventListener('keyup', e => this.pressed.delete(e.code)); window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
  }
  clear() { this.pressed.clear(); this.touch = undefined; this.power = undefined; }
  read(): Intent {
    if (!this.enabled) return {};
    const aliases: Record<string, Direction> = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
    let direction = this.touch;
    for (const key of this.pressed) { if (aliases[key]) direction = aliases[key]; for (const d of ['up', 'right', 'down', 'left'] as Direction[]) if (this.bindings[d] === key) direction = d; }
    const action = this.power ?? (this.pressed.has(this.bindings.fire) ? 'fire' : this.pressed.has(this.bindings.ice) ? 'ice' : undefined);
    this.power = undefined; return { direction, action };
  }
  bindTouch(root: HTMLElement) {
    root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(button => {
      button.onpointerdown = e => { e.preventDefault(); button.setPointerCapture(e.pointerId); this.touch = button.dataset.dir as Direction; this.onActivity(); };
      button.onpointerup = button.onpointercancel = () => { this.touch = undefined; };
    });
    root.querySelectorAll<HTMLButtonElement>('[data-power]').forEach(button => { button.onpointerdown = e => { e.preventDefault(); this.power = button.dataset.power as 'fire' | 'ice'; this.onActivity(); }; });
  }
}
