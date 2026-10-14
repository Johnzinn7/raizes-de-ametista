import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Exercise the actual Canvas renderer in Chromium, including transient effects.
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch().catch(async error => { await server.close(); throw error; });
try {
  const address = server.httpServer!.address();
  if (!address || typeof address === 'string') throw new Error('Servidor visual indisponível.');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  // tsx preserves nested function names with this helper when serializing evaluate().
  await page.addInitScript('globalThis.__name = (fn) => fn');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.getByRole('button', { name: 'Iniciar expedição' }).click();
  await page.waitForTimeout(1000);
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/visual-upgrade.png', fullPage: true });
  const result = await page.evaluate(async () => {
    const base = '/src', { Atlas } = await import(`${base}/client/art.ts`);
    const { Renderer } = await import(`${base}/client/renderer.ts`);
    const { createGame, step, at } = await import(`${base}/shared/engine.ts`);
    const atlas = new Atlas(), directions = ['right', 'left', 'up', 'down'];
    const uniqueFrames = (direction: string, animation: string, count: number) => new Set(Array.from({ length: count }, (_, i) => atlas.player(direction, i, '#7da58b', animation).toDataURL())).size;
    const walkFrames = directions.map(direction => uniqueFrames(direction, 'walk', 8));
    const idleFrames = uniqueFrames('right', 'idle', 12);
    const sheet = document.createElement('canvas'); sheet.width = 768; sheet.height = 512;
    const sheetContext = sheet.getContext('2d')!;
    const rows = [['right', 'idle'], ['right', 'walk'], ['left', 'walk'], ['up', 'walk'], ['down', 'walk'], ['right', 'push'], ['left', 'use'], ['right', 'celebrate']];
    rows.forEach(([direction, animation], row) => {
      for (let f = 0; f < (animation === 'idle' ? 12 : 8); f++) sheetContext.drawImage(atlas.player(direction, f, '#7da58b', animation), f * 64, row * 64);
    });
    const study = document.createElement('canvas'); study.width = 1280; study.height = 1200;
    const s = study.getContext('2d')!; s.imageSmoothingEnabled = false; s.fillStyle = '#17251f'; s.fillRect(0, 0, study.width, study.height);
    s.fillStyle = '#ecd8ac'; s.font = '24px monospace'; s.fillText('RAÍZES DE AMETISTA · Estudo de movimento', 24, 38);
    const labels = ['Perfil / respirar', 'Passada lateral', 'Olhar à esquerda', 'Subir / escalar', 'Descer / escalar', 'Empurrar', 'Usar item', 'Comemorar'];
    rows.forEach(([direction, animation], row) => {
      const y = 55 + row * 128;
      s.fillStyle = '#94b09a'; s.font = '15px monospace'; s.fillText(labels[row], 24, y + 22);
      for (let f = 0; f < 8; f++) s.drawImage(atlas.player(direction, animation === 'idle' ? Math.floor(f * 1.5) : f, '#7da58b', animation), 220 + f * 128, y, 128, 128);
    });
    for (let world = 0; world < 4; world++) for (const [i, tile] of ['#', '.', ',', 'd'].entries()) s.drawImage(atlas.tile(tile, world, 0, 3), 24 + world * 312 + i * 68, 1110, 64, 64);

    const level = { id: 'art', name: 'Estudo', world: 0, index: 1, quota: 1, targetSeconds: 60, hint: '', circuits: [], teleports: [], map: ['#########', '#.......#', '#....d..#', '#..@,...#', '#.......#', '#.....E.#', '#########'] };
    const before = createGame(level), after = step(before, { solo: { direction: 'right' } });
    const snapshot = JSON.stringify(after);
    const canvases = Array.from({ length: 3 }, () => {
      const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:480px;height:360px;position:fixed;left:-2000px;top:0'; document.body.append(canvas); return canvas;
    });
    const renderers = canvases.map(canvas => new Renderer(canvas));
    for (let f = 0; f < 60; f++) renderers.forEach(renderer => renderer.render(before, f * 1000 / 60));
    renderers[0].consume(after.events);
    renderers[2].consume(after.events); renderers[2].consume(after.events);
    const clearing = document.createElement('canvas'); clearing.width = 1440; clearing.height = 396;
    const cc = clearing.getContext('2d')!; cc.fillStyle = '#17251f'; cc.fillRect(0, 0, 1440, 396); cc.font = '18px monospace'; cc.fillStyle = '#ecd8ac';
    let transitionVisible = false, duplicateSafe = true;
    for (let f = 60; f <= 132; f++) {
      renderers.forEach(renderer => renderer.render(after, f * 1000 / 60));
      if (f === 64) transitionVisible = canvases[0].toDataURL() !== canvases[1].toDataURL();
      if ([64, 72, 132].includes(f)) {
        const column = [64, 72, 132].indexOf(f);
        cc.drawImage(canvases[0], column * 480, 36);
        cc.fillText(['Folhas se abrem · 80 ms', 'Folhas se dispersam · 220 ms', 'Caminho livre · 1,2 s'][column], column * 480 + 16, 25);
        duplicateSafe &&= canvases[0].toDataURL() === canvases[2].toDataURL();
      }
    }
    const clearingFinished = canvases[0].toDataURL() === canvases[1].toDataURL();
    renderers.forEach(renderer => { renderer.reset(); renderer.effects = false; });
    renderers[0].consume(after.events);
    renderers.forEach(renderer => renderer.render(after, 2300));
    const effectsOff = canvases[0].toDataURL() === canvases[1].toDataURL();
    canvases.forEach(canvas => canvas.remove());
    return {
      walkFrames, idleFrames, transitionVisible, clearingFinished, duplicateSafe, effectsOff,
      removedFoliage: at(after, 4, 3) === '.', pureRender: JSON.stringify(after) === snapshot,
      cacheWraps: atlas.player('right', 0, '#7da58b', 'walk') === atlas.player('right', 8, '#7da58b', 'walk'),
      recolorWorks: atlas.player('right', 0, '#7da58b', 'idle').toDataURL() !== atlas.player('right', 0, '#ba7e82', 'idle').toDataURL(),
      sheet: sheet.toDataURL(), study: study.toDataURL(), clearing: clearing.toDataURL(), labels,
    };
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(result.walkFrames, [8, 8, 8, 8], 'Caminhada deve ter oito poses distintas por direção.');
  assert.ok(result.idleFrames >= 4, 'Respiração e piscar devem variar a imagem.');
  for (const key of ['transitionVisible', 'clearingFinished', 'duplicateSafe', 'effectsOff', 'removedFoliage', 'pureRender', 'cacheWraps', 'recolorWorks'] as const) assert.equal(result[key], true, key);
  const png = (value: string) => Buffer.from(value.split(',')[1], 'base64');
  await writeFile('docs/screenshots/explorer-study.png', png(result.study));
  await writeFile('docs/screenshots/foliage-clearing.png', png(result.clearing));
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estudo de animação · Raízes de Ametista</title>
<style>body{margin:0;background:#14251e;color:#ead5a4;font:16px system-ui;padding:32px}h1{font:30px Georgia}button{padding:12px 22px;background:#d8c48b;color:#152820;border:0;border-radius:6px;cursor:pointer}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin:24px 0}article{border:1px solid #3b5140;border-radius:12px;padding:16px;background:#1d3026}canvas{width:192px;height:192px;image-rendering:pixelated;display:block;margin:auto}img{max-width:100%;image-rendering:pixelated}p{color:#a5bea8;line-height:1.6}</style>
<h1>Raízes de Ametista · Estudo de animação</h1><p>Arte original desenhada em Canvas. Perfil, respiração, passos alternados e escalada em duas direções. A prévia usa os mesmos quadros do jogo.</p><button id="pause">Pausar</button><main>${result.labels.map((label, i) => `<article><strong>${label}</strong><canvas width="64" height="64" data-row="${i}"></canvas></article>`).join('')}</main><h2>A folhagem abre caminho</h2><img src="screenshots/foliage-clearing.png" alt="Sequência de abertura e desaparecimento das folhas"><h2>Dentro do templo</h2><img src="screenshots/visual-upgrade.png" alt="Jogo com materiais detalhados">
<script>const sheet=new Image();sheet.src=${JSON.stringify(result.sheet)};let paused=false,elapsed=0,last=0;document.getElementById('pause').onclick=()=>{paused=!paused;document.getElementById('pause').textContent=paused?'Continuar':'Pausar'};function draw(t){if(last&&!paused)elapsed+=Math.min(50,t-last);last=t;document.querySelectorAll('canvas').forEach(canvas=>{const row=Number(canvas.dataset.row),idle=row===0,frame=Math.floor(elapsed/(idle?180:row<6?50:90))%(idle?12:8),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,64,64);if(sheet.complete)c.drawImage(sheet,frame*64,row*64,64,64,0,0,64,64)});requestAnimationFrame(draw)}requestAnimationFrame(draw);</script></html>`;
  await writeFile('docs/art-preview.html', html);
  const { sheet, study, clearing, labels, ...checks } = result;
  await writeFile('docs/art-review.json', JSON.stringify(checks, null, 2) + '\n');
  console.log(JSON.stringify(checks, null, 2));
  console.log('Prévia animada: docs/art-preview.html');
} finally { await browser.close(); await server.close(); }
