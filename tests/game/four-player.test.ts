import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { RoomManager, type Peer } from '../../src/server/rooms';
import { CONFIG, type Direction } from '../../src/shared/config';
import { createGame, step, validateLevel } from '../../src/shared/engine';
import { cooperativeLevel } from '../../src/shared/coop';
import type { RankingEntry, ServerMessage } from '../../src/shared/protocol';
import type { Level } from '../../src/shared/types';

const level: Level = { id: 'four', name: 'Quatro caminhos', world: 0, index: 1, quota: 1, targetSeconds: 60, hint: '',
  map: ['#########', '#@d...E.#', '#234....#', '#.......#', '#########'], circuits: [], teleports: [] };
class Client implements Peer {
  readyState = 1;
  messages: ServerMessage[] = [];
  seq = 0;
  send(raw: string) { this.messages.push(JSON.parse(raw)); }
  close() { this.readyState = 3; }
  latest<T extends ServerMessage['type']>(type: T) {
    return [...this.messages].reverse().find(message => message.type === type) as Extract<ServerMessage, { type: T }>;
  }
}
function setup(mode: 'coop' | 'race' = 'coop', capacity = 4) {
  const records: RankingEntry[] = [], manager = new RoomManager([level], entry => records.push(entry));
  const clients = Array.from({ length: capacity }, () => new Client());
  const send = (client: Client, message: object) => manager.handle(client, JSON.stringify(message));
  send(clients[0], { type: 'create', mode, capacity, levelId: level.id, name: 'P1', color: '#7da58b' });
  const code = clients[0].latest('session').room.code;
  for (const [i, client] of clients.entries()) if (i) send(client, { type: 'join', code, name: `P${i + 1}`, color: '#7DA58B' });
  const ready = () => clients.forEach(client => send(client, { type: 'ready', ready: true }));
  const move = (client: Client, direction: Direction) => {
    send(client, { type: 'input', seq: client.seq++, intent: { direction }, press: true });
    send(client, { type: 'input', seq: client.seq++, intent: {} });
    for (let i = 0; i < CONFIG.moveMs / CONFIG.tickMs; i++) manager.advance(manager.now + CONFIG.tickMs);
  };
  return { manager, clients, code, records, send, ready, move };
}

describe('four-player spawning', () => {
  it('respects explicit starts and rejects duplicate starts or player identifiers', () => {
    const game = createGame(level, ['a', 'b', 'c', 'd'], 'coop');
    expect(game.players.map(p => [p.x, p.y])).toEqual([[1, 1], [1, 2], [2, 2], [3, 2]]);
    expect(game.tiles.join('')).not.toMatch(/[@234]/);
    expect(() => createGame(level, ['a', 'a'])).toThrow('únicos');
    expect(() => createGame(level, ['a', 'b', 'c', 'd', 'e'])).toThrow('1 a 4');
    expect(validateLevel({ ...level, map: level.map.map(row => row.replace('4', '3')) })).toContain('Cada início de jogador deve ser único.');
  });
  it('finds deterministic, distinct safe starts in all twenty maps and their co-op variants', () => {
    for (const file of readdirSync('levels').filter(file => file.endsWith('.json'))) {
      const campaignLevel: Level = JSON.parse(readFileSync(`levels/${file}`, 'utf8'));
      for (const map of [campaignLevel, cooperativeLevel(campaignLevel)]) {
        const ids = ['a', 'b', 'c', 'd'], game = createGame(map, ids, 'coop');
        expect(new Set(game.players.map(p => `${p.x},${p.y}`)).size, file).toBe(4);
        for (const p of game.players) expect(game.tiles[p.y * game.width + p.x], file).toBe('.');
        expect(createGame(map, ids, 'coop')).toEqual(game);
      }
    }
  });
  it('never falls back to overlapping starts or crosses a hazard to find space', () => {
    const cramped = { ...level, quota: 0, map: ['#######', '#@h..E#', '#######', '#.....#', '#######'] };
    expect(() => createGame(cramped, ['a', 'b'], 'coop')).toThrow('espaço seguro');
  });
  it('shares checkpoint progress and respawns four dead players without overlap', () => {
    let game = createGame({ ...level, map: ['#########', '#@P...E.#', '#234....#', '#.......#', '#########'], quota: 0 }, ['a', 'b', 'c', 'd'], 'coop');
    game = step(game, { a: { direction: 'right' } });
    expect(game.players.every(p => p.checkpoint.x === 2 && p.checkpoint.y === 1)).toBe(true);
    game.players.forEach(p => { p.deadUntil = game.tick + 1; p.deaths = 1; });
    game = step(game);
    expect(game.players.every(p => !p.deadUntil)).toBe(true);
    expect(new Set(game.players.map(p => `${p.x},${p.y}`)).size).toBe(4);
    expect(game.players.every(p => p.deaths === 1)).toBe(true);
  });
});

describe('rooms with two to four participants', () => {
  it.each([2, 3, 4])('starts a %i-player room only when every seat is filled and ready', capacity => {
    const { manager, clients, send, code } = setup('coop', capacity);
    clients.slice(0, -1).forEach(client => send(client, { type: 'ready', ready: true }));
    send(clients[0], { type: 'restart' });
    expect(manager.rooms.get(code)!.phase).toBe('lobby');
    send(clients.at(-1)!, { type: 'ready', ready: true });
    expect(clients[0].latest('snapshot').states[0].players).toHaveLength(capacity);
    expect(clients[0].latest('snapshot').room.capacity).toBe(capacity);
  });
  it('keeps the four-player lobby open when only the first two players are ready', () => {
    const manager = new RoomManager([level]), a = new Client(), b = new Client();
    manager.handle(a, JSON.stringify({ type: 'create', mode: 'coop', capacity: 4, levelId: level.id }));
    const code = a.latest('session').room.code;
    manager.handle(b, JSON.stringify({ type: 'join', code }));
    for (const client of [a, b]) manager.handle(client, JSON.stringify({ type: 'ready', ready: true }));
    expect(manager.rooms.get(code)!.phase).toBe('lobby');
    expect(a.latest('snapshot')).toBeUndefined();
  });
  it('assigns distinct colors and rejects a fifth player even before the match starts', () => {
    const { clients, code, send } = setup();
    expect(new Set(clients[0].latest('room').room.players.map(p => p.color.toLowerCase())).size).toBe(4);
    const fifth = new Client(); send(fifth, { type: 'join', code });
    expect(fifth.latest('error').message).toContain('ocupada');
  });
  it.each([1, 5, 2.5, '4', null])('rejects invalid capacity %s', capacity => {
    const manager = new RoomManager([level]), client = new Client();
    manager.handle(client, JSON.stringify({ type: 'create', mode: 'coop', capacity, levelId: level.id }));
    expect(client.latest('error').message).toContain('2 a 4'); expect(manager.rooms.size).toBe(0);
  });
  it('shares collectibles and requires all four players at the portal, broadcasting identical states', () => {
    const { clients, ready, move, send } = setup(); ready();
    const [a, b, c, d] = clients;
    for (let i = 0; i < 5; i++) move(a, 'right');
    expect(a.latest('snapshot').states[0].diamonds).toBe(1);
    for (const [client, steps] of [[b, 5], [c, 4], [d, 3]] as const) {
      expect(a.latest('snapshot').room.phase).toBe('playing');
      move(client, 'up'); for (let i = 0; i < steps; i++) move(client, 'right');
      for (const peer of clients) expect(peer.latest('snapshot')).toEqual(a.latest('snapshot'));
    }
    expect(a.latest('snapshot').room.phase).toBe('finished');
    expect(a.latest('snapshot').states[0].players.every(p => p.exited)).toBe(true);
    send(d, { type: 'next' }); expect(a.latest('snapshot').room.phase).toBe('finished');
    send(a, { type: 'next' }); expect(a.latest('snapshot').room.phase).toBe('playing');
    expect(a.latest('snapshot').states[0].players).toHaveLength(4);
  });
  it('runs four independent race worlds and records the fourth player as winner exactly once', () => {
    const { clients, manager, records, ready, move, send } = setup('race'); ready();
    for (let i = 0; i < 5; i++) move(clients[3], 'right');
    const snapshot = clients[3].latest('snapshot');
    expect(snapshot.states.map(s => s.diamonds)).toEqual([0, 0, 0, 1]);
    expect(snapshot.room.winner).toBe(clients[3].latest('session').id);
    expect(snapshot.room.phase).toBe('finished');
    manager.advance(2000); expect(records).toHaveLength(1); expect(records[0]).toMatchObject({ name: 'P4', milliseconds: 840 });
    clients.forEach(client => expect(client.latest('snapshot')).toEqual(snapshot));
    manager.disconnect(clients[3]); send(clients[0], { type: 'next' });
    expect(manager.rooms.get(snapshot.room.code)!.phase).toBe('finished');
  });
  it('waits for both disconnected players and preserves all four sessions and simulation state', () => {
    const { clients, manager, code, send, ready, move } = setup(); ready(); move(clients[0], 'right');
    const before = clients[0].latest('snapshot').states;
    manager.disconnect(clients[2]); manager.disconnect(clients[3]); manager.advance(10000);
    const c = new Client(), d = new Client();
    send(c, { type: 'reconnect', code, token: clients[2].latest('session').token });
    expect(c.latest('session').room.phase).toBe('waiting'); manager.advance(11000);
    expect(c.latest('snapshot').states).toEqual(before);
    send(d, { type: 'reconnect', code, token: clients[3].latest('session').token });
    expect(d.latest('session').room.phase).toBe('playing'); expect(d.latest('snapshot').states).toEqual(before);
    expect(d.latest('snapshot').states[0].players.map(p => p.id)).toEqual(clients.map(p => p.latest('session').id));
    manager.disconnect(d); manager.advance(41000);
    expect(manager.rooms.size).toBe(0);
    for (const client of [clients[0], clients[1], c]) expect(client.latest('closed').message).toContain('30');
  });
  it('restricts pause and restart to the host and resets every player together', () => {
    const { clients, manager, send, ready, move } = setup(); ready(); move(clients[0], 'right');
    send(clients[3], { type: 'pause', paused: true }); send(clients[3], { type: 'restart' });
    expect(clients[0].latest('snapshot').states[0].diamonds).toBe(1);
    send(clients[0], { type: 'pause', paused: true }); const tick = clients[0].latest('snapshot').states[0].tick;
    manager.advance(1000); expect(clients[0].latest('snapshot').states[0].tick).toBe(tick);
    send(clients[0], { type: 'restart' });
    expect(clients[0].latest('snapshot').states[0].tick).toBe(0);
    expect(clients[0].latest('snapshot').states[0].diamonds).toBe(0);
    expect(clients[0].latest('snapshot').states[0].players).toHaveLength(4);
  });
});
