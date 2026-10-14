import { WORLDS } from '../shared/config';

type Context = CanvasRenderingContext2D;
const OUTLINE = '#12201c';
export const hash = (x: number, y: number) => ((x * 374761393 + y * 668265263) ^ (x * y * 1274126177)) >>> 0;
const rect = (c: Context, color: string, x: number, y: number, w: number, h: number) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
const poly = (c: Context, color: string, points: number[]) => {
  c.fillStyle = color; c.beginPath(); c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]); c.closePath(); c.fill();
};
export function diamond(c: Context, color = '#b376ed', red = false, frame = 0) {
  const y = Math.round(Math.sin(frame * Math.PI / 2));
  c.save(); c.translate(0, y);
  poly(c, OUTLINE, [8, 2, 23, 2, 29, 10, 29, 21, 18, 30, 13, 30, 3, 21, 3, 10]);
  poly(c, red ? '#9a355d' : '#67449a', [9, 4, 22, 4, 27, 11, 27, 20, 17, 28, 14, 28, 5, 20, 5, 11]);
  poly(c, color, [11, 6, 21, 6, 25, 12, 21, 20, 11, 20, 7, 12]);
  poly(c, red ? '#ffc2ac' : '#eed9ff', [11, 6, 16, 5, 13, 14, 7, 12]);
  poly(c, red ? '#e65b73' : '#9553d6', [21, 6, 25, 12, 21, 20, 17, 28, 18, 14]);
  poly(c, red ? '#ff9c99' : '#dcb5ff', [11, 20, 13, 14, 18, 14, 17, 28]);
  rect(c, '#fff5dd', 10, 7, 3, 3); if (frame % 3 === 0) { rect(c, '#fff5dd', 24, 3, 1, 5); rect(c, '#fff5dd', 22, 5, 5, 1); }
  c.restore();
}
export function explorer(c: Context, direction: string, frame: number, color: string, animation = 'idle') {
  c.save();
  const moving = animation === 'walk' || animation === 'push';
  const walk = moving ? [0, -2, 0, 2][frame % 4] : 0;
  const bob = moving ? frame % 2 : frame % 4 === 0 ? 1 : 0;
  if (animation === 'die') { c.translate(16, 20); c.rotate(Math.PI / 2); c.translate(-16, -20); c.globalAlpha = .7; }
  if (animation === 'celebrate') c.translate(0, -Math.abs(Math.sin(frame)) * 3);
  rect(c, '#101b1ab0', 8, 28, 18, 3);
  rect(c, OUTLINE, 9, 22 + walk / 2, 6, 8); rect(c, OUTLINE, 19, 22 - walk / 2, 6, 8);
  rect(c, '#6b503e', 10, 22 + walk / 2, 4, 5); rect(c, '#9c7351', 20, 22 - walk / 2, 4, 5);
  rect(c, '#382d2b', 9, 28 + walk / 2, 7, 3); rect(c, '#382d2b', 19, 28 - walk / 2, 7, 3);
  c.translate(0, bob);
  rect(c, OUTLINE, 7, 14, 19, 11); rect(c, color, 9, 14, 15, 10);
  rect(c, '#fff0bd', 15, 16, 3, 6); rect(c, '#ae7950', 8, 23, 18, 2);
  rect(c, OUTLINE, 10, 6, 15, 12); rect(c, '#d99e68', 11, 7, 13, 9); rect(c, '#f9cc92', 11, 8, 10, 6);
  if (direction !== 'up') {
    const eye = direction === 'left' ? 11 : direction === 'right' ? 19 : 13;
    rect(c, '#20332c', eye, 11, 2, 3); if (direction === 'down') rect(c, '#20332c', 20, 11, 2, 3);
    rect(c, '#fff0bb', eye, 11, 1, 1); rect(c, '#9c6646', 16, 15, 4, 1);
  } else rect(c, '#725639', 11, 10, 13, 6);
  rect(c, OUTLINE, 5, 5, 24, 4); rect(c, OUTLINE, 10, 0, 15, 7);
  rect(c, '#d3af6e', 11, 1, 12, 5); rect(c, '#f7d79a', 12, 1, 8, 1); rect(c, '#79563d', 11, 5, 13, 2);
  rect(c, '#dfbd7a', 6, 7, 22, 2); rect(c, '#f9dea1', 8, 7, 18, 1);
  const armY = animation === 'push' || animation === 'use' ? 12 : animation === 'celebrate' ? 7 : 18 + walk / 2;
  rect(c, OUTLINE, 5, armY, 5, 8); rect(c, color, 6, armY, 3, 4); rect(c, '#efbc80', 6, armY + 4, 3, 3);
  rect(c, OUTLINE, 24, armY - walk, 5, 8); rect(c, color, 25, armY - walk, 3, 4); rect(c, '#efbc80', 25, armY + 4 - walk, 3, 3);
  if (direction === 'up') { rect(c, OUTLINE, 11, 16, 12, 9); rect(c, '#a98053', 12, 17, 10, 7); rect(c, '#d7b26e', 13, 18, 8, 2); rect(c, '#514333', 16, 20, 2, 3); }
  c.restore();
}
export function rock(c: Context, frame = 0) {
  c.save(); if (frame) { c.translate(16, 16); c.rotate(frame); c.translate(-16, -16); }
  poly(c, OUTLINE, [9, 1, 23, 2, 30, 10, 30, 23, 23, 30, 8, 30, 2, 23, 2, 10]);
  poly(c, '#8a8b63', [10, 3, 22, 4, 28, 11, 28, 22, 21, 28, 9, 28, 4, 22, 4, 11]);
  poly(c, '#b9b68a', [10, 3, 22, 4, 26, 10, 14, 8, 6, 16, 4, 11]);
  poly(c, '#666d4e', [28, 12, 28, 22, 21, 28, 9, 28, 14, 23, 22, 22]);
  rect(c, '#535e43', 9, 13, 5, 3); rect(c, '#535e43', 20, 13, 4, 3); rect(c, '#babb88', 10, 13, 3, 1);
  rect(c, '#babb88', 21, 13, 2, 1); rect(c, '#535e43', 12, 21, 9, 2); rect(c, '#c5c18c', 14, 19, 5, 2); c.restore();
}
export class Atlas {
  private tiles = new Map<string, HTMLCanvasElement>();
  tile(tile: string, world: number, frame = 0, variant = 0): HTMLCanvasElement {
    const key = `${tile}/${world}/${frame}/${variant}`;
    let canvas = this.tiles.get(key); if (canvas) return canvas;
    canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const c = canvas.getContext('2d')!; c.imageSmoothingEnabled = false;
    const w = WORLDS[world];
    rect(c, w.floor, 0, 0, 32, 32);
    for (let i = 0; i < 9; i++) { const n = hash(i + variant * 11, world + 4); rect(c, i % 2 ? '#ffffff07' : '#00000015', n % 31, n % 29, 2 + n % 3, 1); }
    if (variant % 4 === 2 && tile !== '#') {
      for (let i = 0; i < 4; i++) { rect(c, '#71865b22', 1 + i * 7, 29 - i * 5, 6, 1); rect(c, '#93a96518', 3 + i * 7, 25 - i * 5, 1, 5); }
      rect(c, '#71865b22', 4, 3, 6, 1); rect(c, '#71865b22', 9, 3, 1, 5);
    }
    if (tile === '#') {
      rect(c, w.dark, 0, 0, 32, 32);
      for (let row = 0; row < 2; row++) for (let col = -1; col < 3; col++) {
        const x = col * 24 + (row ? 12 : 0), y = row * 16;
        rect(c, '#121e1a', x, y, 23, 16); rect(c, w.stone, x + 1, y + 1, 21, 13);
        rect(c, w.light, x + 2, y + 1, 19, 2); rect(c, w.dark, x + 2, y + 12, 20, 2);
        rect(c, '#ffffff16', x + 2, y + 4, 1, 6);
      }
      if (variant % 3 !== 1) {
        rect(c, w.leaf, 0, 0, 9, 2); rect(c, '#577d43', 1, 2, 5, 4); rect(c, '#7d9a54', 2, 2, 2, 5);
        rect(c, w.leaf, 26, 15, 6, 2); rect(c, w.dark, 28, 17, 3, 5);
      }
      if (variant === 3) {
        poly(c, '#3b3527', [17, 0, 23, 0, 20, 9, 14, 18, 13, 32, 7, 32, 10, 16]);
        poly(c, '#80704a', [18, 0, 21, 0, 18, 10, 12, 18, 11, 32, 9, 32, 11, 17]);
        rect(c, '#a08b59', 17, 1, 1, 8);
      }
      if (variant === 6) {
        rect(c, '#19291f', 7, 2, 19, 29); rect(c, w.dark, 9, 3, 15, 27);
        poly(c, w.stone, [11, 28, 11, 17, 10, 11, 13, 5, 21, 5, 24, 11, 22, 17, 23, 28]);
        rect(c, w.light, 13, 7, 7, 2); rect(c, w.dark, 13, 12, 3, 2); rect(c, w.dark, 20, 12, 2, 2);
        rect(c, '#9dceb2', 16, 20, 3, 3); rect(c, w.light, 9, 28, 16, 2);
      }
      if (variant === 9 || variant === 10) {
        for (let i = 0; i < 4; i++) { rect(c, '#355c34', 4 + i * 6, 0, 1, 5 + i * 4); rect(c, w.leaf, 2 + i * 6, 3 + i * 3, 3, 2); rect(c, '#93a965', 5 + i * 6, 5 + i * 3, 2, 2); }
      }
    } else if (tile === ',' || tile === 'X') {
      for (let i = 0; i < (tile === 'X' ? 6 : 4); i++) {
        const n = hash(i + variant, 13), x = 4 + n % 19, y = 12 + (n >>> 4) % 12, sway = frame % 2;
        poly(c, '#122b1c', [x - 5, y, x - 2, y - 10, x + 3, y - 13, x + 9, y - 7, x + 11, y + 2, x + 3, y + 7]);
        rect(c, '#7b9a4b', x + 2 + sway, y - 8, 2, 14);
        for (let j = 0; j < 4; j++) {
          poly(c, j % 2 ? w.leaf : '#3e7945', [x + 2 + sway, y + 3 - j * 3, x - 4, y - 2 - j * 3, x - 3, y - 5 - j * 3, x + 3 + sway, y - j * 3]);
          poly(c, j % 2 ? '#5c9c4f' : w.leaf, [x + 3 + sway, y + 4 - j * 3, x + 10, y - 1 - j * 3, x + 9, y - 4 - j * 3, x + 3 + sway, y - j * 3]);
          rect(c, '#aecb6b', x - 2, y - 4 - j * 3, 2, 1);
        }
      }
    } else if (tile === 'd' || tile === 'r' || tile === 's') diamond(c, tile === 'd' ? '#bb8df5' : '#fa899c', tile !== 'd', frame);
    else if (tile === '~' || tile === '=') {
      rect(c, tile === '~' ? '#24586b' : '#78b9c8', 0, 0, 32, 32); rect(c, '#112d3e', 0, 0, 32, 3);
      for (let i = 0; i < 4; i++) rect(c, tile === '~' ? '#65a4b0' : '#c3e4da', (i * 9 + frame * 2) % 24, 6 + i * 7, 8, 1);
      if (tile === '=') { poly(c, '#addde3', [3, 26, 14, 7, 22, 14, 30, 3, 17, 22]); rect(c, '#edf4df', frame * 6 + 3, 9, 2, 2); }
    } else if (tile === 'h') {
      rect(c, '#10191b', 1, 1, 30, 30); rect(c, '#081012', 4, 5, 25, 26); rect(c, '#000000', 8, 13, 17, 19); rect(c, w.stone, 0, 0, 32, 2);
    } else if (tile === '^' || tile === '!') {
      rect(c, '#3f4941', 2, 4, 28, 26); rect(c, '#101e1a', 3, 6, 26, 22);
      const active = tile === '^' || frame === 3;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
        const x = 5 + i * 8, y = 14 + j * 12;
        poly(c, active ? '#d8d6b1' : frame === 2 ? '#c89453' : '#697563', [x, y, x + 3, y - (active ? 9 : 2), x + 6, y]);
        if (active) poly(c, '#8f9b8c', [x + 3, y - 9, x + 6, y, x + 3, y]);
      }
    } else if (tile === 'E' || tile === 't') {
      const gold = tile === 'E' && frame >= 4, color = gold ? '#ebca80' : tile === 't' ? '#78d8d2' : '#a79ae0';
      rect(c, OUTLINE, 3, 0, 27, 32); rect(c, w.stone, 4, 2, 5, 30); rect(c, w.stone, 24, 2, 5, 30);
      rect(c, w.light, 5, 2, 3, 26); rect(c, w.dark, 25, 2, 3, 28); rect(c, w.stone, 6, 0, 20, 5);
      rect(c, '#112322', 10, 6, 13, 26); rect(c, `${color}66`, 11, 8, 11, 23);
      rect(c, color, 13 + frame % 2, 9, 2, 18); rect(c, `${color}aa`, 18, 13, 2, 18);
      rect(c, color, 8, 29, 18, 3); rect(c, '#fff0c6', 12, 1, 8, 2);
    } else if ('abcABC'.includes(tile)) {
      const color = ['#e2ad64', '#e08084', '#71c1d3']['abcABC'.indexOf(tile) % 3];
      if ('ABC'.includes(tile)) {
        rect(c, OUTLINE, 2, 0, 28, 32); rect(c, '#695a3e', 4, 2, 24, 29);
        for (let i = 0; i < 4; i++) rect(c, color, 5 + i * 6, 2, 3, 27);
        rect(c, '#d8bd81', 3, 6, 26, 3); rect(c, '#d8bd81', 3, 23, 26, 3); rect(c, '#382e2b', 14, 14, 5, 6);
      } else { rect(c, OUTLINE, 8, 7, 13, 13); rect(c, color, 10, 9, 9, 9); rect(c, w.floor, 12, 11, 5, 5); rect(c, color, 16, 17, 4, 12); rect(c, color, 19, 22, 6, 3); }
    } else if (tile === 'f' || tile === 'i' || tile === '$') {
      rect(c, OUTLINE, 4, 9, 25, 21); rect(c, '#9b6742', 5, 10, 23, 18); rect(c, '#c69a5d', 6, 10, 21, 7);
      rect(c, '#4c3a2c', 5, 18, 23, 2); rect(c, '#dec18a', 8, 10, 3, 18); rect(c, '#dec18a', 22, 10, 3, 18);
      rect(c, OUTLINE, 13, 16, 8, 7); rect(c, tile === 'f' ? '#ed9a66' : tile === 'i' ? '#8bd5df' : '#cba0ee', 15, 17, 4, 5);
    } else if (tile === 'P' || '><uv'.includes(tile)) {
      rect(c, OUTLINE, 3, 27, 27, 5); rect(c, w.stone, 5, 25, 23, 5);
      poly(c, w.stone, [9, 26, 9, 15, 7, 12, 9, 5, 13, 1, 22, 1, 26, 7, 26, 13, 23, 16, 25, 26]);
      rect(c, w.light, 12, 5, 9, 3); rect(c, w.dark, 11, 11, 4, 3); rect(c, w.dark, 20, 11, 4, 3);
      rect(c, tile === 'P' ? '#8dd6bc' : '#393f31', 14, 18, 7, 5); rect(c, w.light, 9, 26, 16, 2);
      if (tile === 'P') rect(c, '#d3f9d1', 16, 19, 3, 2);
    } else if (tile === 'l') {
      rect(c, OUTLINE, 4, 21, 24, 8); rect(c, '#7b8062', 6, 22, 20, 5); poly(c, '#bdac7a', [12, 22, 17, 23, 25, 7, 21, 5]); rect(c, '#d3a377', 19, 4, 8, 5);
    } else if (tile === 'p') {
      rect(c, OUTLINE, 2, 20, 28, 10); rect(c, '#929c6e', 4, 21, 24, 6); rect(c, '#c7c393', 6, 21, 20, 2); rect(c, '#4d6253', 10, 23, 12, 2);
    } else if (tile === 'G') {
      for (let i = 0; i < 4; i++) { rect(c, OUTLINE, 2 + i * 8, 0, 5, 32); rect(c, '#a6a57b', 3 + i * 8, 0, 2, 30); }
      rect(c, '#727d63', 0, 6, 32, 4); rect(c, '#727d63', 0, 24, 32, 4);
    } else if (tile === 'W') {
      for (let i = 0; i < 3; i++) { rect(c, OUTLINE, 2 + i * 10, 2, 8, 29); rect(c, '#a78150', 3 + i * 10, 3, 6, 26); rect(c, '#d1a167', 4 + i * 10, 4, 1, 23); }
      poly(c, '#715438', [0, 6, 3, 2, 32, 23, 29, 28]);
    } else if (tile === '*') {
      rect(c, '#695439', 13, 14, 6, 16); rect(c, '#9b8151', 13, 14, 6, 3);
      poly(c, '#e9894f', [9, 16, 10, 8, 15, 3 - frame % 2, 16, 8, 21, 5, 23, 15, 18, 20, 13, 20]);
      poly(c, '#ffe0a0', [13, 16, 15, 9, 20, 14, 18, 18]);
    }
    this.tiles.set(key, canvas); return canvas;
  }
  player(direction: string, frame: number, color: string, animation: string): HTMLCanvasElement {
    const key = `player/${direction}/${frame}/${color}/${animation}`;
    let canvas = this.tiles.get(key); if (canvas) return canvas;
    canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    explorer(canvas.getContext('2d')!, direction, frame, color, animation); this.tiles.set(key, canvas); return canvas;
  }
}
