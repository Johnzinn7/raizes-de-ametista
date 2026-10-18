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

## Revisão visual — 14/10/2026

Explorador redesenhado em 64 × 64, com perfil lateral, braço distante atrás do tronco, mochila, roupa sombreada e braço próximo na frente. Oito poses distintas em cada direção; subida e descida alternam braços e joelhos em sentidos opostos. Respiração em ciclo de 2,16 s com deslocamento de cabeça e ombros, expansão do tronco, pés apoiados e piscar. A câmera aproxima o tabuleiro para tornar esses detalhes legíveis no desktop e no celular.

Texturas originais de alvenaria irregular, pedra lascada, fissuras, musgo, raízes e nichos; pisos com vinhas e fragmentos de pedra; folhagem densa nas quatro paletas. Diamantes, pedras, baús, água e tochas ganharam detalhes. Ao atravessar a folhagem, frondes se abrem por 480 ms, passam à frente das pernas e se dispersam em folhas giratórias. A remoção lógica continua imediata.

Build aprovado; 57 testes Vitest e 20/20 fases BFS aprovados; oito cenários Playwright passaram em 1,3 minuto, incluindo conclusão de co-op/corrida em duas abas, sincronização, reconexão e toque. `review-art` confirmou oito imagens de caminhada distintas por direção, variação do idle, transição visível e completamente encerrada, idempotência para eventos repetidos, opção de efeitos desligados, recoloração, cache limitado e ausência de mutação da simulação. Evidências em `art-review.json` e nas três novas pranchas em `screenshots/`.

A prévia `art-preview.html` foi aberta diretamente como arquivo local no Chromium: animação, botão de pausa e ausência de erros de JavaScript confirmados. O CI inclui o comando de revisão visual após instalar Chromium; a execução remota do workflow não foi realizada.

Benchmark do build atualizado: 60,0 FPS, p95 de 16,7 ms e máximo de 16,8 ms, em 299 intervalos tanto no desktop quanto no viewport móvel emulado. Os números são uma amostra local em Chromium headless, não uma medição em celular físico. ZIP atualizado com fontes, build, documentação e prévia visual.

## Expansão da campanha e suavidade — 18/10/2026

As 20 fases anteriores foram substituídas por plantas independentes, exportadas de `scripts/campaign-plans.ts` para os JSON. Há 20 combinações de dimensões, de 24×24 a 46×38, com estruturas de clareira bifurcada, ferradura, margens, quatro alas, aqueduto, canais, escadaria, ilhas desconectadas, fortaleza, terraços, árvore, labirinto, jardins, galerias, oficina, catacumbas, rosácea, delta, observatório e santuário assimétrico. A seleção apresenta nomes, estruturas, cotas e dimensões. Cofres de 12 variantes cooperativas ficam em corredores isolados e exigem manter a placa pressionada.

O validador confirmou 20/20 fases: vitória sem mortes, todas as gemas comuns e uso do puzzle principal. As soluções têm de 47 a 165 ações. O relatório `campaign-validation.json` registra dimensões, ações, estados e contagens de empurrões, poderes, pontes, portas, placas, alavancas e teleportes. A fase final confirmou quatro empurrões, dois trechos de água resolvidos, duas portas, fogo, gelo, espinhos e uma pedra mantida na placa.

O BFS mantém as mesmas transições de simulação, mas passa a considerar novas chaves, poderes e alavancas como descobertas intermediárias. A chave de deduplicação combina apenas os timers presentes e ignora diferenças sem efeito em uma continuação sem mortes. Os testes verificam que orientação com poderes e fases de armadilhas continuam distintas. Isso permite validar mapas maiores sem aumentar o orçamento de 150 mil estados; a campanha usou de 300 a 20.310 estados por fase.

O renderizador usa velocidade constante por passo de 200 ms, uma fila que preserva curvas, reposicionamento em teleportes longos e câmera criticamente amortecida em 280 ms. O balanço vertical da caminhada foi reduzido pela metade. Testes cobrem início sem impulso, velocidade igual em 30/60/120 FPS, fim sem ultrapassar o destino, curvas, teleportes e convergência da câmera.

Build aprovado e 68 testes Vitest aprovados. Nove cenários Playwright passaram em 1,2 minuto, incluindo conclusão da nova fase de introdução em co-op e corrida, sincronização, reconexão, seleção dos novos mapas, toque e preservação dos registros da campanha anterior. O editor também mantém a proporção de mapas retangulares; importação e teste do mapa final 46×38 têm verificação própria no cenário do editor.

`review-art` confirmou que respiração, caminhada, folhagem, partículas, recoloração e cache continuam funcionando. `review-campaign` gerou e abriu um atlas dos 20 mapas no Chromium, verificando os canvases e a opção de ocultar/mostrar objetos. Artefatos: `campaign-preview.html`, `screenshots/campaign-overview.png`, pranchas de arte e relatório de validação.

Benchmark atualizado com três perfis: desktop na fase 01, desktop na fase 20 (46×38) e viewport móvel emulado na fase 01. Todos registraram 60,0 FPS, p95 e máximo de 16,8 ms, em 299 intervalos por perfil. Dados em `benchmark.json`. Celular físico continua sem medição.

Progresso e ranking agora usam o namespace da campanha 2; os arquivos e dados antigos ficam preservados. O ZIP foi atualizado para incluir os novos mapas, fontes, build, documentação e atlas. Esta revisão foi preparada localmente; o envio ao GitHub e a publicação no Render dependem do próximo push.

## Resposta dos controles — 18/10/2026

O cliente deixou de esperar a leitura periódica para reagir ao primeiro comando: eventos de teclado e toque notificam a aplicação diretamente. No solo, um comando disponível consome antecipadamente o próximo tick, creditando esse tick no relógio para não duplicar simulação. Comandos breves de direção e poder são mantidos até o próximo passo disponível. No multiplayer, o envio também ocorre no evento, e o servidor preserva um toque mesmo quando a soltura chega antes da próxima simulação. O comando é consumido uma vez e limpo em pausa, desconexão, morte e reinício.

O deslize visual foi reduzido de 200 para 120 ms e o amortecimento da câmera de 280 para 140 ms. A regra do jogo continua em uma casa a cada 200 ms. As alterações não usam previsão de posição, e o servidor continua validando os movimentos online. Não houve troca de hospedagem nem contratação de serviços. O modo solo já simula no navegador; no multiplayer, o ping até a hospedagem continua influenciando o tempo de confirmação.

Build aprovado, 71 testes Vitest e 20/20 fases validadas. Dez cenários Playwright passaram em 1,1 minuto, incluindo vitória co-op/corrida, reconexão e toques de teclado de 5 ms nos dois modos. Um cenário com relógio controlado verificou que o primeiro movimento solo é aceito antes do próximo tick, que uma virada curta é preservada durante o cooldown e que o jogador para após a execução. Esse cenário também foi ampliado e executado isoladamente para confirmar coleta de fogo e uso único de um toque de poder durante o cooldown (aprovado em 1,3 s).

`review-art` confirmou novamente animações, folhagem, cache e ausência de mutação da simulação. Benchmark local: 60,0 FPS no desktop nas fases 01 e 20 e no viewport móvel emulado; p95 de 16,8 ms no desktop e 16,7 ms no viewport móvel, máximo de 16,8 ms em todos. Medição de internet em produção e aparelho móvel físico não foi realizada. Pacote ZIP e commit local atualizados; a publicação depende do próximo push.
