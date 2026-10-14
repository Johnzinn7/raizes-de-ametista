import { spawn } from 'node:child_process';
import { createServer } from 'vite';
const server = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { stdio: 'inherit', env: { ...process.env, PORT: '3001' } });
const vite = await createServer(); await vite.listen(); vite.printUrls();
const stop = async () => { server.kill(); await vite.close(); process.exit(); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
