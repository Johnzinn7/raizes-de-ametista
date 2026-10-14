import { WORLDS } from '../shared/config';
type Context = CanvasRenderingContext2D;
const seed = (a: number, b: number) => ((a * 374761393 + b * 668265263) ^ (a * b * 1274126177)) >>> 0;
const rect = (c: Context, color: string, x: number, y: number, w: number, h: number) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
const poly = (c: Context, color: string, p: number[]) => {
  c.fillStyle = color; c.beginPath(); c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill();
};
const foliagePalettes = [
  ['#102f26', '#215534', '#378144', '#59a84a', '#88c65a', '#b3d87a'],
  ['#1b354a', '#31576b', '#427e8b', '#66a9b0', '#92d4cf', '#ccf0df'],
  ['#372e27', '#5a4830', '#886333', '#b28b42', '#cbb766', '#ecce8a'],
  ['#27243d', '#45394f', '#675471', '#8c7093', '#b397bd', '#d5bbdc'],
];

export function drawFloor(c: Context, world: number, variant: number) {
  const w = WORLDS[world]; rect(c, w.floor, 0, 0, 32, 32);
  // Broken paving, soil grains and winding roots share a subdued palette.
  for (let i = 0; i < 22; i++) {
    const n = seed(i + variant * 7, world + 19), x = n % 32, y = (n >>> 8) % 32;
    rect(c, i % 3 ? '#07191235' : '#bdd2a414', x, y, 1 + n % 3, 1);
  }
  const vine = world === 0 ? '#2c4d31' : world === 1 ? '#304c60' : world === 2 ? '#513b2f' : '#42354b';
  const edge = world === 0 ? '#41623a' : world === 1 ? '#456a77' : world === 2 ? '#694a35' : '#5a4862';
  c.save(); c.translate(16, 16); c.rotate(variant % 4 * Math.PI / 2); c.translate(-16, -16);
  for (let i = 0; i < 1 + variant % 2; i++) {
    const y = 5 + i * 17 + variant % 4;
    poly(c, '#070f1d55', [0, y + 1, 8, y + 2, 12, y - 2, 22, y - 2, 26, y + 3, 32, y + 2, 32, y + 6, 25, y + 7, 20, y + 2, 14, y + 2, 9, y + 6, 0, y + 5]);
    poly(c, vine, [0, y, 7, y + 1, 12, y - 3, 22, y - 3, 26, y + 2, 32, y + 1, 32, y + 3, 25, y + 4, 21, y - 1, 13, y - 1, 8, y + 3, 0, y + 2]);
    rect(c, edge, 13, y - 3, 7, 1); rect(c, edge, 1, y, 5, 1);
    if (world === 0 || world === 3) {
      poly(c, vine, [8, y + 2, 5, y - 3, 6, y - 6, 10, y - 3, 10, y]);
      rect(c, edge, 7, y - 3, 1, 3);
      poly(c, vine, [23, y + 2, 25, y + 7, 29, y + 9, 29, y + 6, 26, y + 3]);
    }
  }
  c.restore();
  if (variant % 3 === 0) {
    poly(c, '#080f1733', [4, 11, 12, 9, 22, 12, 20, 19, 7, 20, 2, 17]);
    rect(c, '#ccd6b51b', 6, 11, 6, 1); rect(c, '#00000030', 8, 19, 11, 1);
    rect(c, '#c2cead12', 7, 13, 3, 2);
  }
}

export function drawWall(c: Context, world: number, variant: number) {
  const w = WORLDS[world]; rect(c, '#17221e', 0, 0, 32, 32);
  for (let row = 0; row < 2; row++) for (let col = -1; col < 3; col++) {
    const x = col * 22 + (row ? 11 : 0), y = row * 16;
    const n = seed(col + variant * 3 + 4, row + 7);
    poly(c, w.dark, [x, y + 2, x + 3, y, x + 20, y, x + 22, y + 3, x + 21, y + 15, x + 2, y + 16, x, y + 13]);
    poly(c, w.stone, [x + 2, y + 2, x + 5, y + 1, x + 19, y + 2, x + 20, y + 5, x + 19, y + 12, x + 3, y + 13]);
    poly(c, w.light, [x + 2, y + 2, x + 6, y + 1, x + 19, y + 2, x + 18, y + 4, x + 4, y + 3, x + 3, y + 9, x + 2, y + 11]);
    poly(c, '#ffffff18', [x + 5, y + 4, x + 11, y + 3, x + 14, y + 6, x + 11, y + 8, x + 4, y + 9]);
    poly(c, '#101c2528', [x + 18, y + 5, x + 19, y + 11, x + 16, y + 13, x + 5, y + 13, x + 8, y + 10, x + 14, y + 10]);
    for (let i = 0; i < 12; i++) {
      const grit = seed(i + n % 97, variant + row + 13);
      rect(c, i % 3 ? '#e6e7ae24' : '#15231f30', x + 3 + grit % 15, y + 4 + (grit >>> 8) % 8, 1 + grit % 2, 1);
    }
    if (n % 3 !== 0) {
      const crack = x + 7 + n % 7;
      poly(c, w.dark, [crack, y + 2, crack + 2, y + 6, crack, y + 9, crack + 4, y + 12, crack + 2, y + 9, crack + 3, y + 6, crack + 1, y + 2]);
      rect(c, w.light, crack + 3, y + 6, 1, 2);
    }
    if ((n + variant) % 3 !== 1) {
      const moss = foliagePalettes[world];
      poly(c, moss[1], [x + 2, y + 1, x + 12, y + 1, x + 10, y + 4, x + 6, y + 3, x + 4, y + 7, x + 2, y + 7]);
      rect(c, moss[3], x + 3, y + 1, 6, 1); rect(c, moss[2], x + 3, y + 3, 2, 3);
    }
  }
  if (variant === 3 || variant === 8) {
    poly(c, '#262b21', [14, 0, 22, 0, 20, 11, 14, 19, 13, 32, 4, 32, 9, 16]);
    poly(c, '#665a3c', [16, 0, 21, 0, 18, 11, 12, 19, 10, 32, 6, 32, 11, 17]);
    poly(c, '#a08d5c', [17, 0, 19, 0, 16, 11, 11, 18, 8, 32, 7, 32, 10, 17]);
    poly(c, '#493f2e', [14, 13, 22, 17, 31, 19, 32, 22, 22, 20, 12, 17]);
    rect(c, '#b1a06e', 22, 18, 8, 1); rect(c, '#c4b57d', 17, 2, 1, 5);
  }
  if (variant === 6) {
    poly(c, '#171e22', [6, 31, 6, 10, 9, 4, 16, 1, 23, 4, 26, 10, 26, 31]);
    rect(c, w.dark, 8, 10, 16, 20);
    poly(c, w.stone, [9, 28, 11, 20, 13, 17, 11, 11, 13, 6, 20, 6, 23, 11, 21, 17, 23, 22, 24, 28]);
    rect(c, w.light, 13, 7, 7, 2); rect(c, w.dark, 13, 11, 3, 2); rect(c, w.dark, 19, 11, 3, 2);
    rect(c, w.light, 16, 12, 2, 4); rect(c, w.dark, 14, 17, 6, 1);
    poly(c, '#a98d54', [13, 19, 16, 21, 21, 19, 22, 25, 14, 25]);
    rect(c, '#b1dab8', 16, 21, 2, 2); rect(c, w.light, 8, 28, 17, 2);
  }
  if (variant === 9 || variant === 10) {
    const moss = foliagePalettes[world];
    for (let i = 0; i < 3; i++) {
      const x = 3 + i * 10, h = 9 + (i + variant) % 3 * 5;
      rect(c, moss[1], x, 0, 2, h); rect(c, moss[3], x, 0, 1, h - 2);
      for (let y = 4; y < h; y += 5) { poly(c, moss[2], [x, y, x - 3, y - 2, x - 3, y - 5, x + 1, y - 2]); poly(c, moss[3], [x + 1, y + 2, x + 5, y - 1, x + 5, y - 3, x + 2, y - 1]); }
    }
  }
}

// Transparent fronds are reused for both intact plants and the clearing transition.
export function drawFoliage(c: Context, world: number, frame: number, variant: number, thick = false) {
  const p = foliagePalettes[world], sway = [0, 1, 0, -1][frame % 4];
  poly(c, '#081e2099', [2, 18, 7, 11, 24, 10, 31, 19, 28, 28, 18, 32, 5, 28]);
  poly(c, p[1], [2, 21, 4, 12, 10, 5, 16, 3, 23, 6, 29, 14, 31, 25, 26, 29, 19, 27, 13, 31, 5, 28]);
  const leaves = [
    [16, 8, 1, 18], [16, 8, 4, 24], [17, 9, 29, 20], [18, 9, 32, 27],
    [15, 13, 0, 20], [15, 12, 5, 29], [17, 13, 14, 31], [18, 13, 24, 30], [18, 12, 32, 23],
    [16, 6, 10, 23], [17, 6, 20, 25],
  ];
  for (const [i, leaf] of leaves.entries()) {
    const [x, y, tx, ty] = leaf, dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len, tipX = tx + sway * (i % 2 ? 1 : -1), tipY = ty;
    const mx = x + dx * .55, my = y + dy * .35;
    poly(c, p[0], [x - 2, y, mx + nx * 5, my + ny * 5, tipX, tipY, mx - nx * 5, my - ny * 5, x + 2, y]);
    poly(c, p[2 + i % 2], [x, y, mx + nx * 4, my + ny * 4, tipX, tipY, mx - nx * 3, my - ny * 3]);
    poly(c, p[4], [x, y, mx + nx * 2, my + ny * 2, tipX, tipY, mx, my]);
    for (let j = 1; j <= 3; j++) {
      const a = j / 5, cx = x + dx * a, cy = y + dy * a;
      rect(c, p[1], cx - nx * 3, cy - ny * 3, 1, 1);
      rect(c, p[5], cx + nx * 2, cy + ny * 2, 1, 1);
    }
  }
  rect(c, p[5], 15, 10, 3, 2); rect(c, p[3], 17, 9, 2, 3);
  if (thick) {
    poly(c, '#302a23', [3, 32, 11, 21, 9, 10, 13, 8, 15, 21, 7, 32]);
    rect(c, '#978354', 11, 12, 1, 9); rect(c, '#a2b07a', 19 + variant % 3, 4, 2, 2);
  }
}
