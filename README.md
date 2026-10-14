# Raízes de Ametista

Jogo original de puzzle e aventura em Canvas 2D, TypeScript e Vite, com servidor autoritativo Node.js + ws. Interface em português brasileiro. O projeto C++ existente está preservado; sua documentação está em [README.WallX.md](README.WallX.md).

## Arquitetura e plano

- `src/shared`: tipos, constantes e simulação pura. `step(state, intents)` produz um novo estado a cada 40 ms; nenhum DOM, relógio externo ou aleatoriedade entra nas regras. Movimento: 200 ms. Gravidade: 240 ms.
- `src/client`: renderizador Canvas com sprites procedurais originais, interpolação, câmera, áudio sintetizado e interface responsiva.
- `src/server`: HTTP e WebSocket no mesmo processo. Salas de duas pessoas, inventário compartilhado no co-op e duas simulações independentes na corrida. O cliente transmite apenas intenções.
- `levels`: 20 arquivos JSON originais, quatro mundos com cinco fases. Circuitos e teleportes são declarativos.
- `scripts`: desenvolvimento, BFS com a mesma simulação e geração de conteúdo.
- `tests/game`: Vitest para regras e integração de rede; testes de navegador separados.

Marcos: M1 núcleo e testes; M2 renderização; M3 mecânicas; M4 multiplayer; M5 conteúdo, editor e solver; M6 interface e áudio; M7 documentação e empacotamento. Cada marco exige build, testes e validação reais antes do commit.

## Executar

Node.js 22.12+ (recomendado 24 LTS).

```sh
npm install
npm run dev
```

Abra o endereço impresso pelo Vite. `npm run dev` inicia também o servidor de salas em 3001 e encaminha `/ws` e `/api` pelo Vite. Para produção: `npm run build && npm start`, porta padrão 3001 (`PORT` configurável). O build web fica em `web-dist`, separado do `dist` da engine C++.

## Fidelidade ao Diamond Rush

Mantidos: exploração em grade, ritmo deliberado, folhagem, pedras com gravidade e empurrões, diamantes, portas, armadilhas, checkpoints, poderes elementais e descoberta de segredos. A referência orienta a atmosfera de aventura em templo e a legibilidade dos tiles.

Alterados de propósito: nome, exploradores, paletas, desenho procedural, música sintetizada e todos os layouts. Co-op, corrida, editor e ranking são extensões originais. Nenhum asset ou layout do jogo de referência é distribuído.

Consulte `DECISIONS.md` para as escolhas de comportamento e `docs/PROGRESS.md` para a evidência de cada marco.
