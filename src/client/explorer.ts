type Context = CanvasRenderingContext2D;
export type Facing = 'left' | 'right';
export const EXPLORER_SIZE = 64;
export const EXPLORER_FRAMES = { idle: 12, walk: 8, push: 8, use: 8, die: 8, celebrate: 8 } as const;
const ink = '#172026';
const rect = (c: Context, color: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h);
};
const shape = (c: Context, color: string, points: number[]) => {
  c.fillStyle = color; c.beginPath(); c.moveTo(Math.round(points[0]), Math.round(points[1]));
  for (let i = 2; i < points.length; i += 2) c.lineTo(Math.round(points[i]), Math.round(points[i + 1]));
  c.closePath(); c.fill();
};
function tint(color: string, amount: number) {
  const value = parseInt(color.slice(1), 16);
  return `rgb(${[16, 8, 0].map(shift => Math.max(0, Math.min(255, ((value >> shift) & 255) + amount))).join(',')})`;
}
function limb(c: Context, points: number[], width: number, base: string, light: string) {
  c.lineJoin = 'bevel'; c.lineCap = 'square';
  c.beginPath(); c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.strokeStyle = ink; c.lineWidth = width + 3; c.stroke();
  c.strokeStyle = base; c.lineWidth = width; c.stroke();
  rect(c, light, points[2] - 2, points[3] - 2, 3, 3);
}

// Original 64 px artwork: the far arm is painted before the torso; the near arm after it.
// Animation never mutates simulation state. Every atlas frame has a fixed, finite key.
export function drawExplorer(c: Context, direction: string, frame: number, color: string, animation = 'idle', facing: Facing = 'right') {
  c.save(); c.imageSmoothingEnabled = false;
  const moving = animation === 'walk' || animation === 'push';
  const climbing = moving && (direction === 'up' || direction === 'down');
  const back = climbing && direction === 'up';
  const side = direction === 'left' ? 'left' : direction === 'right' ? 'right' : facing;
  const phase = frame % 8 * Math.PI / 4 * (climbing && direction === 'down' ? -1 : 1);
  const stride = Math.round(Math.sin(phase) * (animation === 'push' ? 3 : 6));
  const breath = animation === 'idle' ? [0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0][frame % 12] : 0;
  const lift = moving ? Math.round(Math.abs(Math.sin(phase))) : 0;
  const upperY = -breath - lift;
  const shirtDark = tint(color, -42), shirtLight = tint(color, 35);
  const skin = '#e0a678', skinLight = '#ffd4a0', skinShade = '#9c6047';
  rect(c, '#080f1840', 16, 60, 33, 3); rect(c, '#080f1830', 11, 61, 42, 2);
  if (side === 'left') { c.translate(64, 0); c.scale(-1, 1); }
  if (animation === 'die') { c.translate(32, 32); c.rotate(Math.min(1, frame / 5) * 1.5); c.translate(-32, -32); c.globalAlpha = 1 - frame / 12; }
  if (animation === 'celebrate') c.translate(0, -Math.round(Math.abs(Math.sin(phase)) * 5));

  const farHand = climbing ? [40 + Math.round(Math.cos(phase) * 2), 18 + stride] : animation === 'push' || animation === 'use' ? [49, 33] : animation === 'celebrate' ? [40, 14] : [28 + (moving ? stride : 0), 45 + upperY];
  limb(c, [33, 31 + upperY, 38, climbing ? 26 + stride : 38 + upperY, ...farHand], 5, shirtDark, tint(color, -8));
  rect(c, ink, farHand[0] - 2, farHand[1] - 2, 7, 7); rect(c, skinShade, farHand[0] - 1, farHand[1] - 1, 5, 5);

  const farX = 30 - (moving ? stride : 2), nearX = 32 + (moving ? stride : 4);
  const farKnee = climbing ? Math.max(0, stride) : moving ? Math.round(Math.max(0, Math.cos(phase)) * 3) : 0;
  const nearKnee = climbing ? Math.max(0, -stride) : moving ? Math.round(Math.max(0, -Math.cos(phase)) * 3) : 0;
  limb(c, [28, 44, farX - 3, 51 - farKnee, farX, 58 - farKnee], 6, '#5b5147', '#8b8264');
  shape(c, ink, [farX - 4, 55 - farKnee, farX + 4, 55 - farKnee, farX + 7, 58 - farKnee, farX + 7, 61 - farKnee, farX - 4, 61 - farKnee]);
  rect(c, '#584339', farX - 2, 56 - farKnee, 6, 3); rect(c, '#958268', farX, 56 - farKnee, 3, 1);
  limb(c, [33, 44, nearX + 1, 51 - nearKnee, nearX, 58 - nearKnee], 7, '#9a8862', '#cbbb8c');
  rect(c, '#625940', nearX - 2, 50 - nearKnee, 6, 2);
  shape(c, ink, [nearX - 4, 55 - nearKnee, nearX + 4, 55 - nearKnee, nearX + 8, 58 - nearKnee, nearX + 8, 61 - nearKnee, nearX - 4, 61 - nearKnee]);
  rect(c, '#6d4d38', nearX - 2, 56 - nearKnee, 7, 3); rect(c, '#ba9470', nearX + 1, 56 - nearKnee, 3, 1);
  rect(c, '#312e2b', nearX - 3, 60 - nearKnee, 10, 1);

  c.save(); c.translate(animation === 'push' ? 2 : 0, upperY);
  shape(c, ink, [18, 28, 25, 25, 30, 31, 28, 45, 19, 46, 14, 40, 14, 32]);
  shape(c, '#70543c', [18, 29, 24, 28, 27, 32, 25, 43, 19, 43, 16, 39, 16, 32]);
  rect(c, '#b89057', 17, 31, 8, 4); rect(c, '#cfad6e', 17, 31, 6, 1);
  rect(c, '#473e33', 17, 37, 6, 5); rect(c, '#977a4b', 17, 37, 6, 2); rect(c, '#d7bf84', 20, 35, 2, 3);
  shape(c, ink, [25, 27, 35, 27, 40, 31, 40, 43 + breath, 35, 47, 23, 46, 22, 34]);
  shape(c, color, [26, 29, 34, 29, 38, 32, 37, 43 + breath, 25, 44, 24, 34]);
  shape(c, shirtDark, [34, 30, 38, 32, 37, 43, 32, 44, 33, 38]);
  rect(c, shirtLight, 26, 31, 5, 2); rect(c, shirtLight, 25, 34, 2, 6);
  shape(c, '#dec595', [26, 29, 29, 29, 34, 43, 31, 44]);
  rect(c, '#79573b', 24, 43 + breath, 14, 3); rect(c, '#efd092', 33, 43 + breath, 4, 3); rect(c, '#6b5134', 34, 44 + breath, 2, 1);
  rect(c, skinShade, 30, 24, 7, 5); rect(c, skin, 32, 24, 5, 4);

  // One visible eye, a projecting nose and a rear hairline establish the profile.
  shape(c, ink, [24, 13, 37, 12, 43, 17, 43, 20, 47, 23, 47, 26, 42, 27, 40, 31, 31, 30, 24, 23]);
  shape(c, skin, [27, 15, 36, 14, 41, 18, 41, 22, 45, 24, 41, 25, 39, 29, 32, 28, 27, 22]);
  shape(c, skinLight, [31, 16, 37, 16, 40, 19, 39, 23, 34, 24, 31, 21]);
  shape(c, '#684a35', [25, 14, 31, 14, 31, 18, 28, 21, 29, 25, 25, 23, 23, 18]);
  rect(c, skinShade, 29, 21, 4, 5); rect(c, skinLight, 29, 21, 3, 3);
  if (!back) {
    rect(c, '#4a332d', 36, 21, 5, 1); rect(c, '#fff3d1', 37, 22, 4, 3); rect(c, '#1c3033', 39, 22, 2, 3);
    if (animation === 'idle' && frame === 10) rect(c, skinShade, 37, 22, 4, 3);
    rect(c, '#7d493c', 39, 27, 3, 1); rect(c, '#f8c895', 42, 23, 3, 1);
  } else {
    shape(c, '#76543a', [27, 15, 37, 16, 40, 20, 36, 25, 29, 24, 25, 20]);
    rect(c, '#bb8559', 36, 21, 4, 4);
  }
  shape(c, ink, [17, 14, 21, 12, 23, 5, 28, 2, 37, 3, 42, 7, 43, 13, 49, 15, 50, 18, 42, 21, 23, 19, 17, 17]);
  shape(c, '#b18a50', [20, 14, 23, 12, 25, 6, 29, 4, 36, 5, 40, 8, 41, 14, 47, 16, 41, 18, 24, 17, 20, 16]);
  shape(c, '#e4c887', [25, 7, 29, 4, 35, 5, 38, 8, 38, 12, 24, 12]);
  rect(c, '#f9e5b4', 28, 5, 6, 2); rect(c, '#c5a167', 25, 8, 3, 4);
  shape(c, '#71503c', [23, 12, 40, 12, 41, 15, 24, 15]);
  rect(c, '#c29d60', 27, 12, 3, 2);
  shape(c, '#f0d395', [20, 15, 26, 15, 40, 16, 47, 16, 41, 18, 24, 17]);
  rect(c, '#fff0c1', 24, 15, 11, 1);

  if (back) {
    shape(c, ink, [25, 29, 34, 28, 38, 32, 36, 43, 26, 43, 23, 39]);
    shape(c, '#9b7847', [26, 30, 33, 30, 36, 33, 34, 41, 27, 41, 25, 38]);
    rect(c, '#d1ad6a', 26, 31, 8, 3); rect(c, '#594631', 28, 36, 5, 4); rect(c, '#ecd092', 30, 34, 2, 3);
  }
  const nearHand = climbing ? [24 - Math.round(Math.cos(phase) * 2), 17 - stride] : animation === 'push' ? [49, 36] : animation === 'use' ? [49, 25 - Math.round(Math.sin(phase) * 2)] : animation === 'celebrate' ? [26, 10] : [35 + (moving ? -stride : breath), 46];
  const elbow = climbing ? [20, 28 - stride / 2] : animation === 'push' || animation === 'use' ? [41, 37] : animation === 'celebrate' ? [20, 23] : [29 - (moving ? stride / 2 : 0), 39];
  limb(c, [28, 32, ...elbow, ...nearHand], 5, skin, skinLight);
  limb(c, [28, 31, elbow[0] + (28 - elbow[0]) * .45, elbow[1] + (31 - elbow[1]) * .45], 7, color, shirtLight);
  rect(c, ink, nearHand[0] - 3, nearHand[1] - 2, 7, 7); rect(c, skin, nearHand[0] - 2, nearHand[1] - 1, 5, 5);
  rect(c, skinLight, nearHand[0] - 2, nearHand[1] - 1, 3, 2); rect(c, skinShade, nearHand[0] + 2, nearHand[1] + 1, 1, 3);
  if (animation === 'use') {
    shape(c, '#233b47', [48, 18, 52, 16, 56, 20, 53, 25, 48, 23]);
    shape(c, '#9ae7dc', [49, 19, 52, 18, 54, 20, 52, 23, 49, 22]); rect(c, '#f0ffe1', 50, 19, 2, 2);
  }
  c.restore(); c.restore();
}
