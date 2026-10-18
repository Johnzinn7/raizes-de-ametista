import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from '../src/server/index';
import { WebSocket } from 'ws';
const server = await startServer(0, '127.0.0.1'), browser = await chromium.launch();
const bots: WebSocket[] = [];
const results: { name: string; levelId: string; fps: number; p95FrameMs: number; maxFrameMs: number; frames: number }[] = [];
const profiles: { name: string; width: number; height: number; mobile: boolean; level: string; mode?: 'coop' | 'race' }[] = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false, level: '01' },
  { name: 'desktop-large', width: 1440, height: 1000, mobile: false, level: '20' },
  { name: 'mobile-viewport', width: 390, height: 844, mobile: true, level: '01' },
  { name: 'desktop-coop-four', width: 1440, height: 1000, mobile: false, level: '01', mode: 'coop' },
  { name: 'desktop-race-four', width: 1440, height: 1000, mobile: false, level: '01', mode: 'race' },
];
await mkdir('docs/screenshots', { recursive: true });
try {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.mobile, hasTouch: profile.mobile });
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.port}`); await page.waitForTimeout(1500);
    if (profile.name === 'desktop') await page.screenshot({ path: 'docs/screenshots/menu.png', fullPage: true });
    if (profile.mode) {
      await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
      await page.locator('#room-mode').selectOption(profile.mode); await page.locator('#room-capacity').selectOption('4');
      await page.locator('#player-name').fill('Lia'); await page.locator('#create-room').click();
      const code = await page.getByTestId('room-code').innerText();
      for (const name of ['Nilo', 'Iara', 'Caio']) {
        const bot = new WebSocket(`ws://127.0.0.1:${server.port}/ws`); bots.push(bot);
        await new Promise<void>((resolve, reject) => {
          bot.once('error', reject);
          const listener = (data: Buffer) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'session') { bot.off('message', listener); resolve(); }
            else if (message.type === 'error') reject(new Error(message.message));
          };
          bot.on('message', listener);
          bot.once('open', () => bot.send(JSON.stringify({ type: 'join', code, name })));
        });
        bot.send(JSON.stringify({ type: 'ready', ready: true }));
      }
      await page.getByRole('button', { name: 'Estou pronto', exact: true }).click();
      await page.locator('.lobby').waitFor({ state: 'detached' });
    } else if (profile.level === '01') await page.getByRole('button', { name: 'Iniciar expedição' }).click();
    else { await page.getByRole('button', { name: 'Fases', exact: true }).click(); await page.locator(`[data-level="${profile.level}"]`).click(); }
    await page.waitForTimeout(1000);
    await page.keyboard.down('ArrowRight');
    const samples = await page.evaluate<number[]>(`new Promise(done => {
      const intervals = []; let last = performance.now();
      const frame = now => { intervals.push(now - last); last = now; if (intervals.length >= 300) done(intervals.slice(1)); else requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    })`);
    await page.keyboard.up('ArrowRight');
    const sorted = [...samples].sort((a, b) => a - b), mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    results.push({ name: profile.name, levelId: profile.level, fps: Math.round(10000 / mean) / 10, p95FrameMs: Math.round(sorted[Math.floor(sorted.length * .95)] * 100) / 100, maxFrameMs: Math.round(sorted.at(-1)! * 100) / 100, frames: samples.length });
    await page.screenshot({ path: `docs/screenshots/${profile.name}.png`, fullPage: true });
    if (errors.length) throw new Error(errors.join('; '));
    bots.splice(0).forEach(bot => bot.terminate()); await context.close();
  }
  await writeFile('docs/benchmark.json', JSON.stringify({ environment: 'Chromium headless on the development Windows desktop; mobile is viewport emulation, not physical device hardware. Four-player profiles render one browser connected to three WebSocket peers on the same local server.', date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()), samples: results }, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.name.startsWith('desktop') && result.fps < 55)) throw new Error('Desktop ficou abaixo de 55 FPS médios.');
} finally { bots.forEach(bot => bot.terminate()); await browser.close(); await server.close(); }
