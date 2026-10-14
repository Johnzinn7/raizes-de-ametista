import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createGame } from '../../src/shared/engine';
import { advanceAction, solveLevel } from '../../src/shared/solver';
import type { ServerMessage } from '../../src/shared/protocol';
const level = JSON.parse(readFileSync('levels/01.json', 'utf8')), solution = solveLevel(level);
type Snapshot = Extract<ServerMessage, { type: 'snapshot' }>;

for (const mode of ['coop', 'race'] as const) test(`complete ${mode} through keyboard input in both browsers`, async ({ browser }) => {
  const contexts = [await browser.newContext(), await browser.newContext()]; const pages = await Promise.all(contexts.map(c => c.newPage()));
  const latest: (Snapshot | undefined)[] = [];
  pages.forEach((page, index) => page.on('websocket', ws => ws.on('framereceived', frame => {
    try { const message = JSON.parse(String(frame.payload)); if (message.type === 'snapshot') latest[index] = message; } catch { /* Protocol control frames carry no world state. */ }
  })));
  const [a, b] = pages;
  try {
    await Promise.all(pages.map(p => p.goto('http://127.0.0.1:4173/')));
    await a.getByRole('button', { name: 'Multiplayer', exact: true }).click(); await a.locator('#room-mode').selectOption(mode); await a.locator('#player-name').fill('Lia'); await a.locator('#create-room').click();
    const code = await a.getByTestId('room-code').innerText();
    await b.getByRole('button', { name: 'Multiplayer', exact: true }).click(); await b.locator('#player-name').fill('Nilo'); await b.locator('#join-code').fill(code); await b.locator('#join-room').click();
    await a.getByRole('button', { name: 'Estou pronto', exact: true }).click(); await b.getByRole('button', { name: 'Estou pronto', exact: true }).click();
    await expect(a.locator('#mode-label')).toContainText(code);
    const moveTo = async (page: Page, index: number, key: string, x: number, y: number) => {
      await page.keyboard.down(key);
      await expect.poll(() => {
        const snapshot = latest[index]; if (!snapshot) return '';
        const id = snapshot.room.players[index].id, player = snapshot.states.flatMap(s => s.players).find(p => p.id === id);
        return player ? `${player.x},${player.y}` : '';
      }, { intervals: [15], timeout: 5000 }).toBe(`${x},${y}`);
      await page.keyboard.up(key);
    };
    const play = async (page: Page, index: number) => {
      let expected = createGame(level);
      const keys = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' };
      for (const intent of solution.actions) {
        expected = advanceAction(expected, intent);
        if (intent.direction) await moveTo(page, index, keys[intent.direction], expected.players[0].x, expected.players[0].y);
      }
    };
    await play(a, 0);
    if (mode === 'coop') {
      await expect(a.locator('.peer-status')).toContainText('Esperando o parceiro');
      await moveTo(b, 1, 'ArrowUp', 3, 3); await play(b, 1);
      await expect(a.getByRole('heading', { name: 'O templo se abriu!' })).toBeVisible();
      await expect(b.getByRole('heading', { name: 'O templo se abriu!' })).toBeVisible();
      expect(latest[0]!.states[0].players.every(p => p.exited)).toBe(true);
    } else {
      await expect(a.getByRole('heading', { name: 'O templo se abriu!' })).toBeVisible();
      await expect(b.getByRole('heading', { name: 'A próxima corrida pode ser sua' })).toBeVisible();
      await a.getByRole('button', { name: 'Ranking', exact: true }).click(); await expect(a.locator('.ranking-table')).toContainText('Lia');
    }
  } finally { for (const context of contexts) await context.close(); }
});
