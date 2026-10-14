import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from '../src/server/index';
const server = await startServer(0, '127.0.0.1'), browser = await chromium.launch();
const results: { name: string; fps: number; p95FrameMs: number; maxFrameMs: number; frames: number }[] = [];
await mkdir('docs/screenshots', { recursive: true });
try {
  for (const profile of [{ name: 'desktop', width: 1440, height: 1000, mobile: false }, { name: 'mobile-viewport', width: 390, height: 844, mobile: true }]) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.mobile, hasTouch: profile.mobile });
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.port}`); await page.waitForTimeout(1500);
    if (!profile.mobile) await page.screenshot({ path: 'docs/screenshots/menu.png', fullPage: true });
    await page.getByRole('button', { name: 'Iniciar expedição' }).click(); await page.waitForTimeout(1000);
    await page.keyboard.down('ArrowRight');
    const samples = await page.evaluate<number[]>(`new Promise(done => {
      const intervals = []; let last = performance.now();
      const frame = now => { intervals.push(now - last); last = now; if (intervals.length >= 300) done(intervals.slice(1)); else requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    })`);
    await page.keyboard.up('ArrowRight');
    const sorted = [...samples].sort((a, b) => a - b), mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    results.push({ name: profile.name, fps: Math.round(10000 / mean) / 10, p95FrameMs: Math.round(sorted[Math.floor(sorted.length * .95)] * 100) / 100, maxFrameMs: Math.round(sorted.at(-1)! * 100) / 100, frames: samples.length });
    await page.screenshot({ path: `docs/screenshots/${profile.name}.png`, fullPage: true });
    if (errors.length) throw new Error(errors.join('; ')); await context.close();
  }
  await writeFile('docs/benchmark.json', JSON.stringify({ environment: 'Chromium headless on the development Windows desktop; mobile is viewport emulation, not physical device hardware.', date: '2026-10-14', samples: results }, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
  if (results[0].fps < 55) throw new Error('Desktop ficou abaixo de 55 FPS médios.');
} finally { await browser.close(); await server.close(); }
