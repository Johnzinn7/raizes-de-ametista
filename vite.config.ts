import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: '0.0.0.0', proxy: { '/ws': { target: 'ws://127.0.0.1:3001', ws: true }, '/api': 'http://127.0.0.1:3001' } },
  build: { outDir: 'web-dist', emptyOutDir: true },
  test: { include: ['tests/game/**/*.test.ts'], testTimeout: 10000 }
} as Parameters<typeof defineConfig>[0]);
