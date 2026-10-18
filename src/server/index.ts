import { createServer } from 'node:http';
import { readFile, readdir, mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { CAMPAIGN_VERSION, CONFIG } from '../shared/config';
import { RoomManager } from './rooms';
import type { Level } from '../shared/types';
import type { RankingEntry } from '../shared/protocol';
const root = fileURLToPath(new URL('../..', import.meta.url));
export async function startServer(port = Number(process.env.PORT || 3001), host = '0.0.0.0') {
  const levels: Level[] = await Promise.all((await readdir(resolve(root, 'levels'))).filter(f => f.endsWith('.json')).sort().map(async f => JSON.parse(await readFile(resolve(root, 'levels', f), 'utf8'))));
  let rankings: RankingEntry[] = []; const dataDir = process.env.DATA_DIR || resolve(root, 'data');
  const rankingPath = resolve(dataDir, `rankings-campaign-${CAMPAIGN_VERSION}.json`);
  const rankingTempPath = rankingPath + '.tmp';
  try { rankings = JSON.parse(await readFile(rankingPath, 'utf8')); } catch { /* First start has no rankings. */ }
  let save = Promise.resolve();
  const rooms = new RoomManager(levels, entry => {
    rankings.push(entry); rankings.sort((a, b) => a.milliseconds - b.milliseconds);
    rankings = rankings.filter((e, i, a) => a.findIndex(o => o.levelId === e.levelId && o.name === e.name) === i).slice(0, 400);
    const serialized = JSON.stringify(rankings);
    save = save.then(async () => { await mkdir(dataDir, { recursive: true }); await writeFile(rankingTempPath, serialized); await rename(rankingTempPath, rankingPath); }).catch(e => console.error('Falha ao salvar ranking:', e.message));
  });
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname === '/health') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, rooms: rooms.rooms.size })); return; }
      if (url.pathname === '/api/rankings') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(rankings.filter(e => e.levelId === url.searchParams.get('level')).slice(0, 20))); return; }
      if (url.pathname === '/api/levels') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(levels)); return; }
      const publicDir = resolve(root, 'web-dist'), path = resolve(publicDir, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!path.startsWith(publicDir + sep)) { res.writeHead(403).end(); return; }
      const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
      const content = await readFile(path); res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
      res.setHeader('Cache-Control', path.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache'); res.end(content);
    } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Arquivo não encontrado. Execute npm run build para gerar o jogo.'); }
  });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: CONFIG.maxMessageBytes });
  wss.on('connection', peer => {
    peer.on('message', (data, binary) => { if (!binary) rooms.handle(peer, data.toString()); });
    peer.on('close', () => rooms.disconnect(peer)); peer.on('error', () => rooms.disconnect(peer));
  });
  let simulationTime = 0;
  const timer = setInterval(() => { simulationTime += CONFIG.tickMs; rooms.advance(simulationTime); }, CONFIG.tickMs);
  await new Promise<void>(done => server.listen(port, host, done));
  const address = server.address(); const actualPort = typeof address === 'object' && address ? address.port : port;
  console.log(`Servidor de expedições: http://localhost:${actualPort}`);
  return { server, rooms, port: actualPort, close: async () => { clearInterval(timer); for (const peer of wss.clients) peer.terminate(); await new Promise<void>(done => wss.close(() => server.close(() => done()))); await save; } };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const running = await startServer();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void running.close().then(() => process.exit()));
}
