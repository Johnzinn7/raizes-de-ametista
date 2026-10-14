import type { GameEvent } from '../shared/types';
import { settings } from './storage';
const melodies = [
  [64, 67, 71, 67, 62, 66, 69, 66, 64, 71, 74, 71, 62, 69, 66, 59],
  [76, 71, 69, 71, 74, 69, 67, 69, 72, 67, 64, 67, 71, 66, 64, 62],
  [57, 64, 60, 67, 57, 65, 62, 69, 60, 67, 64, 71, 62, 69, 65, 64],
  [64, 59, 67, 62, 64, 57, 66, 59, 62, 55, 64, 57, 59, 54, 62, 57],
];
export class AudioSystem {
  private context?: AudioContext; private music?: GainNode; private effects?: GainNode;
  private interval?: ReturnType<typeof setInterval>; private note = 0; private world = 0; private paused = false; private lastTick = -1;
  unlock() {
    if (!this.context) {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      this.context = new AudioCtor(); this.music = this.context.createGain(); this.effects = this.context.createGain();
      this.music.connect(this.context.destination); this.effects.connect(this.context.destination); this.update(); this.schedule();
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }
  update() { if (this.music) this.music.gain.value = settings.music * .16; if (this.effects) this.effects.gain.value = settings.effectsVolume * .25; }
  setWorld(world: number) { if (world !== this.world) { this.world = world; this.note = 0; this.schedule(); } }
  pause(paused: boolean) { this.paused = paused; }
  private tone(frequency: number, duration: number, type: OscillatorType, gain: number, output: GainNode, delay = 0, endFrequency?: number) {
    const ctx = this.context!; const osc = ctx.createOscillator(), env = ctx.createGain(); const start = ctx.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(frequency, start); if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    env.gain.setValueAtTime(0, start); env.gain.linearRampToValueAtTime(gain, start + .008); env.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(env); env.connect(output); osc.start(start); osc.stop(start + duration + .01); osc.onended = () => { osc.disconnect(); env.disconnect(); };
  }
  private schedule() {
    clearInterval(this.interval); if (!this.context) return;
    this.interval = setInterval(() => {
      if (this.paused || document.hidden || !settings.music) return;
      const note = melodies[this.world][this.note++ % 16], frequency = 440 * 2 ** ((note - 69) / 12);
      this.tone(frequency, .2, 'triangle', .55, this.music!);
      if (this.note % 4 === 1) this.tone(frequency / 4, .42, 'sine', .7, this.music!);
      if (this.note % 8 === 0) this.tone(frequency * 2, .12, 'square', .12, this.music!, .07);
    }, [180, 230, 150, 210][this.world]);
  }
  play(kind: GameEvent['kind'] | 'lose') {
    if (!this.context || !this.effects || !settings.effectsVolume) return;
    const fx = this.effects;
    if (kind === 'step') this.tone(100, .035, 'triangle', .1, fx, 0, 55);
    else if (kind === 'collect' || kind === 'secret' || kind === 'checkpoint') [523, 659, 784].forEach((f, i) => this.tone(f, .12, 'triangle', .5, fx, i * .045));
    else if (kind === 'push') this.tone(95, .13, 'sawtooth', .16, fx, 0, 55);
    else if (kind === 'land') this.tone(85, .2, 'triangle', .8, fx, 0, 25);
    else if (kind === 'death' || kind === 'lose') [330, 247, 165].forEach((f, i) => this.tone(f, .17, 'square', .2, fx, i * .08, f * .65));
    else if (kind === 'door') this.tone(180, .22, 'triangle', .5, fx, 0, 500);
    else if (kind === 'power') [220, 440, 880].forEach((f, i) => this.tone(f, .23, 'sine', .4, fx, i * .04, f * 2));
    else if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .35, 'triangle', .6, fx, i * .1));
    else if (kind === 'foliage') this.tone(400, .065, 'sawtooth', .07, fx, 0, 70);
  }
  consume(events: GameEvent[]) { if (!events.length || events[0].tick === this.lastTick) return; this.lastTick = events[0].tick; events.forEach(e => this.play(e.kind)); }
  reset() { this.lastTick = -1; }
}
