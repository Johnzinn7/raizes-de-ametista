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
