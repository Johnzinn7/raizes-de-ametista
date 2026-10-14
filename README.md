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

![Menu da expedição](docs/screenshots/menu.png)

## Jogar

São 20 templos originais em quatro mundos, com mapas 25×25 e dificuldade crescente. Lia e Nilo exploram a selva, o gelo, as ruínas vulcânicas e a cripta. A seleção de fases mostra seu progresso e as estrelas salvas neste navegador.

| Ação | Tecla |
| --- | --- |
| Mover uma casa a cada 200 ms | WASD ou setas |
| Queimar raízes espessas ou madeira à frente | F |
| Congelar água à frente | I |
| Reiniciar a fase inteira | R |
| Pausar / continuar | Esc |

As teclas podem ser remapeadas em **Opções**. No celular, toque ou segure o direcional e use os botões de fogo/gelo. O botão de tela cheia depende do suporte do navegador. Música e efeitos têm volumes independentes; menus oferecem temas claro e escuro.

Colete a cota de gemas roxas para dourar o portal. As três estrelas são independentes: todas as gemas comuns e bônus, nenhuma morte, tempo-alvo. Procure folhagem, baús e o cofre secreto de cada fase. Checkpoints mantêm os itens e mudanças do mapa ao morrer; R reinicia tudo. Não há vidas finitas: retry imediato no solo e retorno após três segundos no co-op.

Pedras são empurráveis nas quatro direções e caem a cada 240 ms. Água bloqueia o explorador; pedras a transformam em ponte e gelo permite atravessar. Buracos e espinhos matam. Somente uma pedra já em queda esmaga exploradores ou inimigos. Pedras em repouso ficam bloqueadas por inimigos.

## Jogar a dois

Abra **Multiplayer**, escolha nome, cor, modo e fase, e crie uma sala. Compartilhe o código de quatro letras. A segunda pessoa abre o mesmo endereço, entra pelo código e ambos clicam em **Estou pronto**. O lobby tem emojis rápidos.

- **Cooperativo:** mesmo mapa, inventário compartilhado, checkpoints e saída para os dois. Doze fases incluem cofres que exigem um parceiro segurando uma placa.
- **Corrida:** mapas independentes, fantasma translúcido e progresso do rival. O primeiro a chegar vence; o servidor registra o tempo no ranking por fase.

Somente o anfitrião pausa, reinicia ou avança a sala. A sala espera 30 s quando alguém desconecta, congelando a simulação. Recarregar a mesma aba retoma a sessão pelo token de reconexão. O servidor aceita intenções, nunca posições ou inventário enviados pelo cliente.

Instruções de [LAN, produção, Render e Docker](docs/HOSTING.md). O ranking é persistido em `data/rankings.json`; na hospedagem, use disco persistente para conservá-lo entre reinícios. Salas são mantidas em memória por uma única instância Node.

## Editor e conteúdo

No menu **Editor**, pinte tiles, defina a cota e teste imediatamente. Importe ou exporte JSON e valide a fase no navegador. As regras e o BFS são compartilhados com o jogo. O painel avançado permite circuitos com alavancas, placas, portões, armadilhas e teleportes em pares.

Veja a [legenda dos arquivos, progressão e limites do BFS](docs/LEVELS.md). O solver guarda o mundo real entre etapas de coleta e reproduz a sequência final para confirmar a vitória sem mortes e todas as gemas comuns. Falhas e buscas inconclusivas fazem o comando retornar erro, inclusive no CI.

## Verificar

```sh
npm run build
npm test
npm run validate-levels
node node_modules/@playwright/test/cli.js install chromium
npm run test:e2e
npm run benchmark
```

`npm run check` reúne build, Vitest e validação. A suíte de navegador usa o **build existente** servido por `npm start` em porta isolada; execute build antes dela. O CI instala Chromium e executa todos esses checks, exceto o benchmark dependente da máquina.

Evidências de implementação: 57 testes de regras/rede, oito cenários de navegador e 20/20 fases aprovadas, com reprodução de cada solução. As suítes concluem uma fase inteira no co-op e na corrida em dois navegadores, incluindo vitória, derrota e registro no ranking. Resultados estão em [PROGRESS.md](docs/PROGRESS.md). O benchmark local registrou 60,0 FPS, p95 de 16,8 ms, em 299 intervalos por perfil desktop e viewport móvel. Veja [dados brutos](docs/benchmark.json). O perfil móvel usa emulação de viewport/toque no desktop; hardware físico de celular não foi medido.

## Empacotar e modificar

`npm run package` cria `release/raizes-de-ametista.zip` e seu SHA-256. O pacote inclui fontes web, build, fases, documentação, testes e configurações de deploy. Ele exclui a engine nativa, assets preexistentes, dependências instaladas, sessões e ferramentas portáteis.

Troque o nome em `GAME_NAME`, em `src/shared/config.ts`. Tempos, tamanho de tile, limites de uso e parâmetros de inimigos estão no mesmo arquivo. Toda a arte é gerada em um atlas Canvas em runtime, com contornos, paletas por mundo e animações; `src/client/art.ts` contém os desenhos. O áudio original é sintetizado em `src/client/audio.ts`, com quatro melodias e efeitos sem arquivos externos.

A licença MIT na raiz aplica-se somente ao novo jogo web, seus desenhos, sons sintetizados e documentação. O projeto WallX Engine preexistente e bibliotecas de terceiros mantêm suas próprias licenças.
