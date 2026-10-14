# Registro dos marcos

Verificações reais no ambiente Windows em 14/10/2026. Cada marco teve build, testes e validate-levels aprovados antes do commit. Nos marcos M1–M4 o validador utilizava a fase inicial; a campanha completa entrou no M5.

## M1 — núcleo determinístico

Build Vite 8.3.4 aprovado; cinco testes Vitest 5.0.4 aprovados. Fixture inicial solucionada por BFS: 85 estados e 12 ações. npm audit: zero vulnerabilidades.

## M2 — render, câmera e animações

Build aprovado (34 kB JS e 14 kB CSS sem gzip); cinco testes e BFS inicial aprovados. Canvas com atlas procedural, câmera interpolada, sprites direcionais, partículas, água, portais e tochas animadas.

## M3 — mecânicas e inimigos

Build, 45 testes e BFS inicial aprovados. Cobertura de empurrões nas quatro direções, gravidade, esmagamento, pilhas, buracos, pontes, fogo, gelo, chaves, checkpoints, estrelas, teleportes, circuitos, espinhos, dardos, cobras, morcegos e co-op.

## M4 — servidor multiplayer

Build, 52 testes e BFS inicial aprovados. Integração com HTTP e dois WebSockets reais; snapshots iguais, corrida com mundos separados, autoridade de movimentos, prontidão, reconexão, expiração e controle do anfitrião.

## M5 — campanha, editor e validador

Build e 55 testes aprovados. Todas as 20 fases de 25×25 solucionadas pelo BFS, coletando todas as gemas comuns sem morrer; de 5.919 a 44.211 estados por fase. Editor com pintura, teste imediato, JSON e validação em worker. Doze cofres cooperativos. Menu e tabuleiro abertos no Chromium sem erro de JavaScript.

## M6 — áudio, interface e polimento

Build, 56 testes Vitest e 20/20 fases aprovados. Seis testes Playwright aprovados em 19,3 s contra o servidor de produção: campanha solo resolvida por teclado, pausa, vitória e progresso; co-op e corrida em duas abas com snapshots comparados por sequência e reconexão por recarga; opções e remapeamento; editor; toque e layout de celular. Uma execução anterior foi invalidada por recarga do Vite durante edição; a suíte final usa um servidor de produção isolado.

## M7 — documentação e empacotamento

57 testes Vitest aprovados, incluindo 240 ticks de replay após serialização JSON. Oito cenários Playwright aprovados em 1,3 minuto: os dois testes adicionais concluem uma fase inteira no co-op e na corrida por entradas reais de teclado, verificando que ambos chegam à saída, que há vitória/derrota e que o ranking registra o vencedor. Snapshots de duas abas continuam idênticos e recargas retomam a sessão.

Todas as 20 fases passam no BFS e na reprodução independente da sequência encontrada: vitória, todas as gemas comuns e nenhuma morte. Build final: aproximadamente 83,5 kB JavaScript principal e 15,1 kB CSS, antes de gzip, mais um worker de 10,5 kB.

Benchmark Chromium headless no desktop: 60,0 FPS, p95 e máximo de 16,8 ms em 299 intervalos. Viewport móvel emulado: os mesmos resultados. Artefatos em `benchmark.json` e `screenshots/`. Isso não constitui medição em hardware físico de celular.

ZIP criado com Node/zlib e SHA-256; integridade CRC conferida por uma implementação independente (Python zipfile). O pacote foi extraído em diretório novo, recebeu apenas `npm ci --omit=dev` (quatro pacotes de produção, zero vulnerabilidades) e executou `npm start`. HTTP 200, health check e coleta de diamante por teclado no Chromium aprovados, sem erros de JavaScript. Evidência em `package-smoke.json`.

README, decisões, legenda/editor, hospedagem LAN/Render/Docker, licença com escopo do jogo e workflow CI incluídos. Docker não está instalado neste ambiente, portanto a imagem não foi executada. A configuração Render e o workflow foram preparados; não houve publicação externa nem execução no GitHub Actions.
