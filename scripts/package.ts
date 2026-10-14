import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
// Package only the web game. Native engine source, assets, tools and sessions stay outside.
const entries = ['package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', '.gitignore', '.dockerignore', 'Dockerfile', 'render.yaml', 'Jogar.ps1', 'README.md', 'README.WallX.md', 'DECISIONS.md', 'LICENSE', 'src/shared', 'src/client', 'src/server', 'levels', 'scripts', 'tests/game', 'tests/browser', 'docs', '.github', 'web-dist'];
const files: string[] = [];
async function walk(path: string) {
  if ((await stat(path)).isDirectory()) for (const child of (await readdir(path)).sort()) await walk(`${path}/${child}`);
  else files.push(path.replaceAll('\\', '/'));
}
for (const entry of entries) await walk(entry);
const crcTable = Array.from({ length: 256 }, (_, i) => { let n = i; for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(data: Buffer) { let crc = 0xffffffff; for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255]; return (crc ^ 0xffffffff) >>> 0; }
const local: Buffer[] = [], central: Buffer[] = []; let offset = 0;
// Stable DOS timestamp makes archives repeatable when their inputs are unchanged.
const dosDate = ((2026 - 1980) << 9) | (10 << 5) | 14;
for (const file of files) {
  const name = Buffer.from(file, 'utf8'), data = await readFile(file), compressed = deflateRawSync(data), crc = crc32(data);
  const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(8, 8); header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
  local.push(header, name, compressed);
  const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(0x800, 8); directory.writeUInt16LE(8, 10); directory.writeUInt16LE(dosDate, 14);
  directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(compressed.length, 20); directory.writeUInt32LE(data.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
  central.push(directory, name); offset += header.length + name.length + compressed.length;
}
const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
const archive = Buffer.concat([...local, directory, end]); await mkdir('release', { recursive: true });
await writeFile('release/raizes-de-ametista.zip', archive);
const sha = createHash('sha256').update(archive).digest('hex'); await writeFile('release/SHA256SUMS.txt', `${sha}  raizes-de-ametista.zip\n`);
console.log(`Pacote criado: ${resolve('release/raizes-de-ametista.zip')} (${files.length} arquivos, ${archive.length} bytes). SHA-256: ${sha}`);
