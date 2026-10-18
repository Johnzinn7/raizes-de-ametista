import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { solveLevel } from '../../src/shared/solver';
import { PROGRESS_STORAGE_KEY } from '../../src/shared/config';
const first = JSON.parse(readFileSync('levels/01.json', 'utf8'));
const last = JSON.parse(readFileSync('levels/20.json', 'utf8'));
const solution = solveLevel(first);

test('solo campaign, pause, victory and saved progress work through real keyboard input', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-10-14T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-14T12:00:01Z'));
  await page.goto('/'); await page.clock.runFor(500);
  await expect(page).toHaveTitle('Raízes de Ametista');
  await page.getByRole('button', { name: 'Iniciar expedição' }).click();
  const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' };
  for (const intent of solution.actions) {
    const key = intent.direction ? keys[intent.direction] : intent.action === 'fire' ? 'f' : intent.action === 'ice' ? 'i' : undefined;
    if (key) await page.keyboard.down(key); await page.clock.runFor(200); if (key) await page.keyboard.up(key);
  }
  await page.clock.runFor(100);
  await expect(page.getByRole('heading', { name: 'O templo se abriu!' })).toBeVisible();
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
  expect(stored['01'].completed).toBe(true); expect(stored['01'].stars).toEqual([false, true, true]);
  await page.getByRole('button', { name: 'Próxima fase' }).click(); await page.clock.runFor(200);
  await expect(page.locator('#level-name')).toHaveText('A memória das pedras');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toContainText('Uma pausa');
  const tick = await page.locator('.game-canvas').getAttribute('data-tick'); await page.clock.runFor(2000); expect(await page.locator('.game-canvas').getAttribute('data-tick')).toBe(tick);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.clock.runFor(240);
  expect(Number(await page.locator('.game-canvas').getAttribute('data-tick'))).toBeGreaterThan(Number(tick)); expect(errors).toEqual([]);
});

for (const mode of ['coop', 'race'] as const) test(`two browser tabs synchronize ${mode} and reconnect after reload`, async ({ browser }) => {
  const contextA = await browser.newContext(), contextB = await browser.newContext();
  const a = await contextA.newPage(), b = await contextB.newPage();
  const snapshotsA = new Map<number, string>(), snapshotsB = new Map<number, string>();
  const observe = (page: Page, snapshots: Map<number, string>) => page.on('websocket', ws => ws.on('framereceived', frame => {
    try { const message = JSON.parse(String(frame.payload)); if (message.type === 'snapshot') snapshots.set(message.sequence, JSON.stringify(message.states)); } catch { /* Ignore protocol control frames. */ }
  })); observe(a, snapshotsA); observe(b, snapshotsB);
  try {
    await Promise.all([a.goto('http://127.0.0.1:4173/'), b.goto('http://127.0.0.1:4173/')]);
    await a.getByRole('button', { name: 'Multiplayer', exact: true }).click(); await a.locator('#room-mode').selectOption(mode); await a.locator('#player-name').fill('Lia'); await a.locator('#create-room').click();
    const code = await a.getByTestId('room-code').innerText(); expect(code).toMatch(/^[A-Z]{4}$/);
    await b.getByRole('button', { name: 'Multiplayer', exact: true }).click(); await b.locator('#player-name').fill('Nilo'); await b.locator('#join-code').fill(code); await b.locator('#join-room').click();
    await expect(a.getByRole('dialog')).toContainText('Nilo');
    await a.getByRole('button', { name: 'Enviar 💎' }).click(); await expect(b.locator('#chat-log')).toContainText('💎');
    await a.getByRole('button', { name: 'Estou pronto', exact: true }).click(); await b.getByRole('button', { name: 'Estou pronto', exact: true }).click();
    await expect(a.locator('#mode-label')).toContainText(mode === 'coop' ? 'CO-OP' : 'CORRIDA');
    await expect(b.locator('#mode-label')).toContainText(code);
    await a.keyboard.down('ArrowRight'); await expect(a.locator('#gems')).toHaveText('1 / 4', { timeout: 5000 }); await a.keyboard.up('ArrowRight');
    if (mode === 'coop') await expect(b.locator('#gems')).toHaveText('1 / 4'); else { await expect(b.locator('#gems')).toHaveText('0 / 4'); await expect(b.locator('.peer-status')).toContainText('Lia'); }
    const common = [...snapshotsA.keys()].filter(n => snapshotsB.has(n)); expect(common.length).toBeGreaterThan(4);
    for (const sequence of common) expect(snapshotsA.get(sequence)).toBe(snapshotsB.get(sequence));
    await b.reload(); await expect(b.locator('#mode-label')).toContainText(code); await expect(b.locator('.game-canvas')).toHaveAttribute('data-player', mode === 'coop' ? '3,4' : '3,3');
    await b.keyboard.press('ArrowRight', { delay: 5 }); await expect(b.locator('.game-canvas')).not.toHaveAttribute('data-player', mode === 'coop' ? '3,4' : '3,3');
  } finally { await contextA.close(); await contextB.close(); }
});

test('options, remapping, theme and all twenty level cards are usable', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Opções', exact: true }).click();
  await page.locator('#music-volume').fill('17'); await page.locator('#light-theme').check();
  await page.locator('[data-binding="fire"]').click(); await page.keyboard.press('q'); await expect(page.locator('[data-binding="fire"]')).toHaveText('Q');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click(); await page.reload();
  await expect(page.locator('html')).toHaveClass('light');
  await page.getByRole('button', { name: 'Fases', exact: true }).click(); await expect(page.locator('.level-button')).toHaveCount(20);
  await expect(page.locator('[data-level="02"]')).toContainText('28 × 24');
  await expect(page.locator('[data-level="20"]')).toContainText('Santuário dos quatro caminhos');
  await page.locator('[data-level="20"]').click(); await expect(page.locator('#world-tag')).toHaveText('Cripta Sombria');
});

test('the new campaign starts fresh while preserving the previous campaign records', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('amethyst-progress', JSON.stringify({ '01': { stars: [true, true, true], completed: true, bestMs: 1000 } }));
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Fases', exact: true }).click();
  await expect(page.locator('[data-level="01"] small')).toHaveText('☆☆☆');
  const old = await page.evaluate(() => JSON.parse(localStorage.getItem('amethyst-progress') || '{}'));
  expect(old['01'].bestMs).toBe(1000); expect(old['01'].completed).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), PROGRESS_STORAGE_KEY)).toBeNull();
});

test('solo reacts immediately and keeps quick turns and powers through cooldown', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-18T12:00:01Z'));
  await page.goto('/'); await page.clock.runFor(500); await page.getByRole('button', { name: 'Iniciar expedição' }).click();
  await page.keyboard.down('ArrowRight');
  // No clock advancement: the input handler must already have accepted this step.
  await expect(page.locator('.game-canvas')).toHaveAttribute('data-player', '4,3');
  await page.keyboard.up('ArrowRight'); await page.clock.runFor(80);
  await page.keyboard.press('ArrowDown', { delay: 5 });
  await expect(page.locator('.game-canvas')).toHaveAttribute('data-player', '4,3');
  await page.clock.runFor(200); await expect(page.locator('.game-canvas')).toHaveAttribute('data-player', '4,4');
  await page.clock.runFor(500); await expect(page.locator('.game-canvas')).toHaveAttribute('data-player', '4,4');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const powerLevel = { ...first, id: 'custom', name: 'Toque de poder', quota: 1, map: ['########', '#@fW.dE#', '#......#', '#......#', '########'] };
  await page.locator('#editor-file').setInputFiles({ name: 'poder.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(powerLevel)) });
  await expect(page.locator('#editor-name')).toHaveValue('Toque de poder'); await page.locator('#editor-test').click();
  await page.keyboard.press('ArrowRight', { delay: 5 }); await expect(page.locator('#fire')).toHaveText('3');
  await page.keyboard.press('f', { delay: 5 }); await page.clock.runFor(280); await expect(page.locator('#fire')).toHaveText('2');
  await page.clock.runFor(500); await expect(page.locator('#fire')).toHaveText('2');
});

test('editor paints, validates, imports and exports an actual level', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.locator('#editor-name').fill('O templo de teste');
  await page.getByRole('button', { name: 'Diamante', exact: true }).click();
  const canvas = page.locator('.editor-canvas'), bounds = await canvas.boundingBox(); expect(bounds).not.toBeNull();
  await page.mouse.click(bounds!.x + bounds!.width * 6.5 / 25, bounds!.y + bounds!.height * 2.5 / 25);
  await page.locator('#editor-quota').fill('1'); await page.locator('#editor-validate').click(); await expect(page.locator('#editor-result')).toContainText('Solução encontrada', { timeout: 30000 });
  const downloadPromise = page.waitForEvent('download'); await page.locator('#editor-export').click(); const download = await downloadPromise; expect(download.suggestedFilename()).toBe('meu-templo.json');
  await page.locator('#editor-file').setInputFiles({ name: 'fase.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(last)) });
  await expect(page.locator('#editor-name')).toHaveValue(last.name);
  const rectangular = await page.locator('.editor-canvas').boundingBox();
  expect(rectangular!.width / rectangular!.height).toBeCloseTo(last.map[0].length / last.map.length, 2);
  await page.locator('#editor-test').click();
  await expect(page.locator('#level-name')).toHaveText(last.name); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('mobile layout fits and touch taps move the explorer', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/'); await page.getByRole('button', { name: 'Iniciar expedição' }).tap();
    await expect(page.locator('.touch-controls')).toBeVisible(); await page.getByRole('button', { name: 'Direita', exact: true }).tap();
    await expect(page.locator('.game-canvas')).toHaveAttribute('data-player', '4,3');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  } finally { await context.close(); }
});
