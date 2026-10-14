import { WORLDS } from '../shared/config';
import { drawExplorer, EXPLORER_SIZE, EXPLORER_FRAMES, type Facing } from './explorer';
import { drawFloor, drawWall, drawFoliage } from './textures';

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
  poly(c, red ? '#8b294a' : '#4d247b', [5, 11, 11, 15, 11, 20, 5, 20]);
  poly(c, red ? '#ff738b' : '#ca79fc', [5, 11, 9, 5, 11, 6, 8, 11]);
  poly(c, '#fff4ff', [11, 6, 16, 5, 15, 7, 10, 9]);
  poly(c, red ? '#ffacb7' : '#da9fff', [21, 20, 27, 15, 27, 20, 19, 26]);
  rect(c, red ? '#ffc9c1' : '#eac9ff', 8, 19, 3, 1);
  rect(c, '#fff5dd', 10, 7, 3, 3); if (frame % 3 === 0) { rect(c, '#fff5dd', 24, 3, 1, 5); rect(c, '#fff5dd', 22, 5, 5, 1); }
  c.restore();
}
export function rock(c: Context, frame = 0) {
  c.save(); if (frame) { c.translate(16, 16); c.rotate(frame); c.translate(-16, -16); }
  poly(c, OUTLINE, [9, 1, 23, 2, 30, 10, 30, 23, 23, 30, 8, 30, 2, 23, 2, 10]);
  poly(c, '#8a8b63', [10, 3, 22, 4, 28, 11, 28, 22, 21, 28, 9, 28, 4, 22, 4, 11]);
  poly(c, '#b9b68a', [10, 3, 22, 4, 26, 10, 14, 8, 6, 16, 4, 11]);
  poly(c, '#666d4e', [28, 12, 28, 22, 21, 28, 9, 28, 14, 23, 22, 22]);
  poly(c, '#d0c993', [10, 4, 19, 4, 23, 6, 13, 6, 8, 10, 6, 15, 5, 12]);
  for (let i = 0; i < 24; i++) {
    const n = hash(i + 8, 21), x = 6 + n % 19, y = 7 + (n >>> 7) % 18;
    rect(c, i % 2 ? '#e5dfae50' : '#3d493c40', x, y, 1, 1);
  }
  poly(c, '#4c5843', [21, 3, 18, 8, 21, 11, 19, 15, 22, 11, 20, 8, 23, 4]);
  rect(c, '#acb27b', 22, 6, 1, 3);
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
    drawFloor(c, world, variant);
    if (tile === '#') {
      drawWall(c, world, variant);
    } else if (tile === ',' || tile === 'X') {
      drawFoliage(c, world, frame, variant, tile === 'X');
    } else if (tile === 'd' || tile === 'r' || tile === 's') diamond(c, tile === 'd' ? '#bb8df5' : '#fa899c', tile !== 'd', frame);
    else if (tile === '~' || tile === '=') {
      rect(c, tile === '~' ? '#24586b' : '#78b9c8', 0, 0, 32, 32); rect(c, '#112d3e', 0, 0, 32, 3);
      for (let i = 0; i < 7; i++) {
        const x = (i * 11 + variant * 3 + frame) % 32, y = i * 5;
        poly(c, tile === '~' ? '#337789' : '#9cd5da', [x - 6, y + 2, x, y, x + 8, y + 2, x + 3, y + 3]);
        rect(c, tile === '~' ? '#1b425e' : '#65a3bc', x + 3, y + 4, 6, 1);
      }
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
      rect(c, '#f3d597', 7, 10, 17, 1); rect(c, '#d7a55c', 6, 12, 20, 1);
      rect(c, '#563820', 11, 24, 10, 1); rect(c, '#cf8d48', 12, 21, 7, 1);
      rect(c, '#4d392c', 6, 27, 21, 2); rect(c, '#fff0bf', 9, 11, 1, 5); rect(c, '#fff0bf', 23, 11, 1, 5);
      for (const x of [9, 23]) { rect(c, '#655c43', x, 25, 1, 1); rect(c, '#fff0bf', x, 22, 1, 1); }
      rect(c, '#ffe4ae', 15, 17, 3, 1); rect(c, '#342e2b', 16, 19, 1, 2);
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
      rect(c, OUTLINE, 12, 14, 9, 17); rect(c, '#695439', 13, 14, 6, 16); rect(c, '#b8965e', 14, 18, 2, 11);
      rect(c, '#9b8151', 11, 17, 11, 3); rect(c, '#d0b27a', 12, 17, 8, 1); rect(c, '#382b26', 13, 23, 7, 2);
      poly(c, '#a94b31', [8, 15, 9, 7, 12, 11, 16 + frame % 2, 0, 19, 10, 22, 5, 24, 14, 20, 19, 12, 19]);
      poly(c, '#ec8a40', [10, 15, 12, 9, 14, 12, 17 + frame % 2, 3, 19, 13, 22, 9, 22, 16, 18, 19, 13, 18]);
      poly(c, '#ffca72', [12, 15, 15, 10, 17, 14, 20, 11, 20, 17, 17, 19, 14, 18]);
      poly(c, '#fff0b5', [15, 17, 16, 13, 18, 16, 17, 19]);
      rect(c, '#f7b969', 12 + frame * 2, 3 - frame % 2, 1, 2);
    }
    this.tiles.set(key, canvas); return canvas;
  }
  player(direction: string, frame: number, color: string, animation: string, facing: Facing = 'right'): HTMLCanvasElement {
    frame = Math.floor(frame) % (EXPLORER_FRAMES[animation as keyof typeof EXPLORER_FRAMES] ?? 8);
    const key = `player/${direction}/${frame}/${color}/${animation}/${facing}`;
    let canvas = this.tiles.get(key); if (canvas) return canvas;
    canvas = document.createElement('canvas'); canvas.width = canvas.height = EXPLORER_SIZE;
    drawExplorer(canvas.getContext('2d')!, direction, frame, color, animation, facing); this.tiles.set(key, canvas); return canvas;
  }
  foliage(world: number, frame: number, variant: number): HTMLCanvasElement {
    const key = `foliage/${world}/${frame}/${variant}`;
    let canvas = this.tiles.get(key); if (canvas) return canvas;
    canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    drawFoliage(canvas.getContext('2d')!, world, frame, variant);
    this.tiles.set(key, canvas); return canvas;
  }
}
