import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createGame } from '../../src/shared/engine';
import { advanceAction, solveLevel } from '../../src/shared/solver';
import type { ServerMessage } from '../../src/shared/protocol';
const level = JSON.parse(readFileSync('levels/01.json', 'utf8')), solution = solveLevel(level);

type Snapshot = Extract<ServerMessage, { type: 'snapshot' }>;

for (const count of [2, 4]) for (const mode of ['coop', 'race'] as const) test(`complete ${mode} through keyboard input in ${count} browsers`, async ({ browser }) => {
  test.setTimeout(120000);
  const contexts = await Promise.all(Array.from({ length: count }, (_, index) => browser.newContext(index === 3
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {})));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const latest: (Snapshot | undefined)[] = [], snapshots = pages.map(() => new Map<number, string>());
  const errors: string[] = [], names = ['Lia', 'Nilo', 'Iara', 'Caio'];
  pages.forEach((page, index) => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('websocket', ws => ws.on('framereceived', frame => {
      try {
        const message = JSON.parse(String(frame.payload));
        if (message.type === 'snapshot') {
          latest[index] = message; snapshots[index].set(message.sequence, JSON.stringify(message.states));
        }
      } catch { /* Protocol control frames carry no world state. */ }
    }));
  });
  const a = pages[0];
  try {
    await Promise.all(pages.map(p => p.goto('http://127.0.0.1:4173/')));
    await a.getByRole('button', { name: 'Multiplayer', exact: true }).click();
    await a.locator('#room-mode').selectOption(mode); await a.locator('#room-capacity').selectOption(String(count));
    await a.locator('#player-name').fill(names[0]); await a.locator('#create-room').click();
    const code = await a.getByTestId('room-code').innerText();
    for (let i = 1; i < count; i++) {
      const page = pages[i]; await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
      await page.locator('#player-name').fill(names[i]); await page.locator('#join-code').fill(code); await page.locator('#join-room').click();
      await expect(page.locator('.player-card')).toHaveCount(i + 1);
      if (i === 3) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await expect(a.getByRole('dialog')).toContainText(`${count}/${count} jogadores`);
    const colors = await a.locator('.avatar-dot').evaluateAll(elements => elements.map(element => (element as HTMLElement).style.getPropertyValue('--player-color')));
    expect(new Set(colors).size).toBe(count);
    for (const page of pages) await page.getByRole('button', { name: 'Estou pronto', exact: true }).click();
    for (const page of pages) await expect(page.locator('#mode-label')).toContainText(code);
    if (count === 4) {
      const last = pages[3], id = latest[3]!.room.players[3].id;
      await last.reload(); await expect(last.locator('#mode-label')).toContainText(code);
      expect(latest[3]!.room.players[3].id).toBe(id);
      expect(latest[3]!.room.players).toHaveLength(4);
    }
    if (mode === 'race') for (let i = 0; i < count; i++) {
      await expect(pages[i].locator('.game-canvas')).toHaveAttribute('data-ghosts', String(count - 1));
      for (let j = 0; j < count; j++) if (i !== j) await expect(pages[i].locator('.peer-status')).toContainText(names[j]);
    }
    const moveTo = async (page: Page, index: number, key: string, x: number, y: number) => {
      await page.keyboard.down(key);
      try {
        await expect.poll(() => {
          const snapshot = latest[index]; if (!snapshot) return '';
          const id = snapshot.room.players[index].id, player = snapshot.states.flatMap(s => s.players).find(p => p.id === id);
          return player ? `${player.x},${player.y}` : '';
        }, { intervals: [15], timeout: 5000 }).toBe(`${x},${y}`);
      } finally { await page.keyboard.up(key); }
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
      await expect(a.locator('.peer-status')).toContainText(count === 2 ? 'Esperando o parceiro' : 'Esperando a equipe');
      for (let i = 1; i < count; i++) {
        const player = latest[i]!.states[0].players[i];
        const key = player.x < 3 ? 'ArrowRight' : player.y < 3 ? 'ArrowDown' : 'ArrowUp';
        await moveTo(pages[i], i, key, 3, 3); await play(pages[i], i);
        if (i < count - 1) expect(latest[0]!.room.phase).toBe('playing');
      }
      for (const page of pages) await expect(page.getByRole('heading', { name: 'O templo se abriu!' })).toBeVisible();
      expect(latest[0]!.states[0].players.every(p => p.exited)).toBe(true);
    } else {
      await expect(a.getByRole('heading', { name: 'O templo se abriu!' })).toBeVisible();
      for (const page of pages.slice(1)) await expect(page.getByRole('heading', { name: 'A próxima corrida pode ser sua' })).toBeVisible();
      await a.getByRole('button', { name: 'Ranking', exact: true }).click(); await expect(a.locator('.ranking-table')).toContainText('Lia');
    }
    const common = [...snapshots[0].keys()].filter(sequence => snapshots.every(map => map.has(sequence)));
    expect(common.length).toBeGreaterThan(4);
    for (const sequence of common) for (const map of snapshots) expect(map.get(sequence)).toBe(snapshots[0].get(sequence));
    expect(errors).toEqual([]);
  } finally { for (const context of contexts) await context.close(); }
});
