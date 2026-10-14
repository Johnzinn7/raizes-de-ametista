import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { RoomManager, type Peer } from '../../src/server/rooms';
import { startServer } from '../../src/server/index';
import type { ServerMessage, RankingEntry } from '../../src/shared/protocol';
import type { Level } from '../../src/shared/types';
const level: Level = { id: 'test', name: 'Rede', world: 0, index: 1, quota: 1, targetSeconds: 60, hint: '', map: ['#########','#@d...E.#','#2......#','#.......#','#########'], circuits: [], teleports: [] };
class MockPeer implements Peer {
  readyState = 1; messages: ServerMessage[] = [];
  send(raw: string) { this.messages.push(JSON.parse(raw)); } close() { this.readyState = 3; }
  latest<T extends ServerMessage['type']>(type: T) { return [...this.messages].reverse().find(m => m.type === type) as Extract<ServerMessage, { type: T }>; }
}
function setup(mode: 'coop' | 'race' = 'coop', record?: (e: RankingEntry) => void) {
  const manager = new RoomManager([level], record), a = new MockPeer(), b = new MockPeer();
  manager.handle(a, JSON.stringify({ type: 'create', mode, name: 'Lia', color: '#123456', levelId: 'test' }));
  const session = a.latest('session'), code = session.room.code;
  manager.handle(b, JSON.stringify({ type: 'join', code, name: 'Nilo', color: '#abcdef' }));
  const send = (p: Peer, m: object) => manager.handle(p, JSON.stringify(m));
  send(a, { type: 'ready', ready: true }); send(b, { type: 'ready', ready: true });
  return { manager, a, b, code, send };
}
describe('authoritative rooms', () => {
  it('creates a four-letter room, requires readiness and broadcasts the same co-op state', () => {
    const { manager, a, b, code, send } = setup(); expect(code).toMatch(/^[A-Z]{4}$/);
    const id = a.latest('session').id; send(a, { type: 'input', seq: 0, intent: { direction: 'right', x: 99, diamonds: 999 } }); manager.advance(40);
    const sa = a.latest('snapshot'), sb = b.latest('snapshot'); expect(sa).toEqual(sb); expect(sa.states).toHaveLength(1);
    expect(sa.states[0].diamonds).toBe(1); expect(sa.states[0].players.find(p => p.id === id)!.x).toBe(2);
  });
  it('race worlds stay independent, first finisher wins and records an authoritative time', () => {
    const records: RankingEntry[] = []; const { manager, a, b, send } = setup('race', e => records.push(e));
    send(a, { type: 'input', seq: 1, intent: { direction: 'right' } });
    for (let t = 40; t <= 1200; t += 40) { if (t === 800) send(a, { type: 'input', seq: 2, intent: { direction: 'right' } }); manager.advance(t); }
    const s = a.latest('snapshot'); expect(s.states).toHaveLength(2); expect(s.states[0].diamonds).toBe(1); expect(s.states[1].diamonds).toBe(0);
    expect(s.room.winner).toBe(a.latest('session').id); expect(s.room.phase).toBe('finished'); expect(records[0].milliseconds).toBe(840);
    expect(b.latest('snapshot')).toEqual(s);
  });
  it('ignores stale sequence numbers, malformed inputs and non-host restarts', () => {
    const { manager, a, b, send } = setup(); send(a, { type: 'input', seq: 4, intent: { direction: 'right' } }); send(a, { type: 'input', seq: 3, intent: { direction: 'left' } }); manager.advance(40);
    expect(a.latest('snapshot').states[0].players[0].x).toBe(2);
    send(b, { type: 'restart' }); expect(a.latest('snapshot').states[0].tick).toBe(1);
    manager.handle(a, 'not json'); expect(a.latest('error').message).toContain('inválida');
    send(a, { type: 'input', seq: 5, intent: { direction: '__proto__', action: 'explode' } }); manager.advance(80);
    expect(a.latest('snapshot').states[0].diamonds).toBe(1);
  });
  it('waits 30s on disconnect, restores the same state and expires abandoned rooms', () => {
    const { manager, a, b, code, send } = setup(); manager.advance(40); const before = a.latest('snapshot').states[0];
    manager.disconnect(b); manager.advance(10000); expect(a.latest('room').room.phase).toBe('waiting');
    expect(a.latest('snapshot').states[0]).toEqual(before);
    const replacement = new MockPeer(); send(replacement, { type: 'reconnect', code, token: b.latest('session').token });
    expect(replacement.latest('snapshot').states[0]).toEqual(before); expect(replacement.latest('session').room.phase).toBe('playing');
    manager.disconnect(replacement); manager.advance(40000); expect(manager.rooms.size).toBe(0); expect(a.latest('closed').message).toContain('30');
  });
  it('protects reconnection tokens, capacity and profile text', () => {
    const { manager, code, send } = setup(); const outsider = new MockPeer();
    send(outsider, { type: 'join', code, name: '<script>', color: 'red' }); expect(outsider.latest('error')).toBeDefined();
    send(outsider, { type: 'reconnect', code, token: 'wrong' }); expect(outsider.latest('error').message).toContain('expirou');
  });
  it('only the host pauses, simulation time freezes, and input expires', () => {
    const { manager, a, b, send } = setup(); send(b, { type: 'pause', paused: true }); manager.advance(40); expect(a.latest('snapshot').states[0].tick).toBe(1);
    send(a, { type: 'pause', paused: true }); manager.advance(80); expect(a.latest('snapshot').states[0].tick).toBe(1);
    send(a, { type: 'pause', paused: false }); manager.advance(120); expect(a.latest('snapshot').states[0].tick).toBe(2);
  });
});
describe('real HTTP and WebSocket transport', () => {
  it('serves health and synchronizes two actual WebSocket clients', async () => {
    const running = await startServer(0, '127.0.0.1'); const sockets: WebSocket[] = [];
    try {
      expect((await fetch(`http://127.0.0.1:${running.port}/health`).then(r => r.json())).ok).toBe(true);
      const a = new WebSocket(`ws://127.0.0.1:${running.port}/ws`), b = new WebSocket(`ws://127.0.0.1:${running.port}/ws`); sockets.push(a, b);
      const messages: ServerMessage[] = []; a.on('message', d => messages.push(JSON.parse(d.toString())));
      await Promise.all(sockets.map(ws => new Promise<void>(done => ws.once('open', done))));
      const next = (ws: WebSocket, type: string) => new Promise<ServerMessage>(done => { const f = (data: Buffer) => { const m = JSON.parse(data.toString()); if (m.type === type) { ws.off('message', f); done(m); } }; ws.on('message', f); });
      const sessionPromise = next(a, 'session'); a.send(JSON.stringify({ type: 'create', mode: 'coop', name: 'Lia', levelId: '01' }));
      const session = await sessionPromise as Extract<ServerMessage, { type: 'session' }>;
      const join = next(b, 'session'); b.send(JSON.stringify({ type: 'join', code: session.room.code, name: 'Nilo' })); await join;
      const snapshot = next(b, 'snapshot'); a.send(JSON.stringify({ type: 'ready', ready: true })); b.send(JSON.stringify({ type: 'ready', ready: true }));
      const result = await snapshot as Extract<ServerMessage, { type: 'snapshot' }>; expect(result.states[0].players).toHaveLength(2);
      expect(messages.some(m => m.type === 'snapshot')).toBe(true);
    } finally { sockets.forEach(s => s.terminate()); await running.close(); }
  });
});
