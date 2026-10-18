import type { Intent } from '../shared/types';
import type { Direction } from '../shared/config';
export const DEFAULT_BINDINGS: Record<string, string> = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'KeyF', ice: 'KeyI', reset: 'KeyR', pause: 'Escape' };
export class Input {
  bindings = { ...DEFAULT_BINDINGS }; private pressed = new Set<string>(); private touch?: Direction; private touchPulse?: Direction; private keyPulse?: Direction; private power?: 'fire' | 'ice';
  onReset = () => {}; onPause = () => {}; onActivity = () => {}; onChange = (_press: boolean) => {}; enabled = false;
  constructor() {
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement)?.matches('input,textarea,select') || document.querySelector('.modal-backdrop') || !this.enabled) return;
      if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', ...Object.values(this.bindings), 'Space'].includes(e.code)) e.preventDefault();
      this.onActivity(); this.pressed.add(e.code); if (e.repeat) return;
      if (e.code === this.bindings.reset) { this.onReset(); return; } if (e.code === this.bindings.pause) { this.onPause(); return; }
      const aliases: Record<string, Direction> = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
      const direction = aliases[e.code] ?? (['up', 'right', 'down', 'left'] as Direction[]).find(d => this.bindings[d] === e.code);
      if (direction) this.keyPulse = direction;
      if (e.code === this.bindings.fire) this.power = 'fire'; if (e.code === this.bindings.ice) this.power = 'ice';
      if (direction || e.code === this.bindings.fire || e.code === this.bindings.ice) this.onChange(true);
    });
    window.addEventListener('keyup', e => { if (this.pressed.delete(e.code)) this.onChange(false); }); window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
  }
  clear() { this.pressed.clear(); this.touch = undefined; this.touchPulse = undefined; this.keyPulse = undefined; this.power = undefined; this.onChange(false); }
  read(consume = true): Intent {
    if (!this.enabled) return {};
    const aliases: Record<string, Direction> = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
    let direction = this.touch;
    for (const key of this.pressed) { if (aliases[key]) direction = aliases[key]; for (const d of ['up', 'right', 'down', 'left'] as Direction[]) if (this.bindings[d] === key) direction = d; }
    const action = this.power ?? (this.pressed.has(this.bindings.fire) ? 'fire' : this.pressed.has(this.bindings.ice) ? 'ice' : undefined);
    direction = this.keyPulse ?? this.touchPulse ?? direction;
    if (consume) { this.power = undefined; this.keyPulse = undefined; this.touchPulse = undefined; }
    return { direction, action };
  }
  bindTouch(root: HTMLElement) {
    root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(button => {
      button.onpointerdown = e => { e.preventDefault(); button.setPointerCapture(e.pointerId); this.touch = button.dataset.dir as Direction; this.touchPulse = this.touch; this.onActivity(); this.onChange(true); };
      button.onpointerup = button.onpointercancel = () => { this.touch = undefined; this.onChange(false); };
    });
    root.querySelectorAll<HTMLButtonElement>('[data-power]').forEach(button => { button.onpointerdown = e => { e.preventDefault(); this.power = button.dataset.power as 'fire' | 'ice'; this.onActivity(); this.onChange(true); }; });
  }
}
