# Decisões de implementação

1. Nome original: Raízes de Ametista; a constante `GAME_NAME` em `src/shared/config.ts` é a fonte do título.
2. Manter o jogo em projeto próprio, com código organizado em `src/client`, `src/shared`, `src/server` e build em `web-dist`.
3. Tick fixo de 40 ms, menor divisor comum de 200 e 240 ms. A ordem é: entradas por jogador, circuitos, gravidade de baixo para cima, inimigos, dardos, perigos e vitória. Não há aleatoriedade na simulação.
4. Folhagem espessa e madeira exigem fogo. Folhagem comum desaparece ao passar. Pedras só são empurradas para chão, gelo, água ou buraco vazios; submergir forma uma ponte ou preenche o buraco.
5. Uma pedra em repouso não esmaga quem está imediatamente abaixo; somente uma pedra já em queda mata jogador ou inimigo. Inimigos bloqueiam pedras em repouso e são mortos por pedras já em queda.
6. Checkpoints guardam a posição e o progresso é contínuo: morte mantém coletas, chaves usadas, inventário e alterações no mapa. Solo reaparece no próximo tick, co-op após 3 s; se a estátua estiver ocupada, tenta uma casa vizinha segura ou aguarda.
7. Alavancas alternam ao entrar; placas são mantidas por jogador vivo ou pedra. Circuitos podem exigir todos os gatilhos. Portões sem circuito ficam fechados.
8. Teleporte possui trava até sair do tile, evitando ciclos. Saída retira o explorador do tabuleiro e exige ambos no co-op.
9. Três estrelas independentes: todas as gemas comuns e bônus, nenhuma morte, tempo-alvo. A cota usa apenas gemas comuns.
10. Puzzles que exigem duas pessoas são variantes declaradas das fases co-op; solo mantém uma solução própria. Conteúdo exportado é validado antes de carregar.
11. Arte desenhada em Canvas e armazenada em atlas em runtime; áudio WebAudio sem recursos externos. Sem fontes ou imagens de terceiros.
12. Sem publicação automática em Sites: o pedido é um projeto local Node/ws no workspace, com instruções de hospedagem.
13. Campanha original em nove câmaras conectadas, com rotações e divisórias, perigos e mecanismos diferentes por fase. A gravidade permanece sempre para baixo; mapas de puzzles de pedras não são rotacionados. Todos os mundos têm gemas opcionais e um cofre secreto; 12 fases acrescentam no co-op uma porta que exige que o parceiro segure uma placa.
14. O BFS valida soluções reais por etapas de coleta, mantendo o estado inteiro entre etapas e buscando a saída somente após todas as gemas comuns. Ele não promete a solução globalmente mais curta nem completude para qualquer mapa importado; há um orçamento explícito de estados e resultados inconclusivos falham a validação.
15. Progresso local acumula estrelas conquistadas e guarda o melhor tempo. Todas as fases ficam disponíveis para exploração. Ranking online aceita somente resultados de corrida produzidos pelo servidor; nomes iguais guardam o melhor tempo por fase.
16. Sem vidas finitas: derrota individual mostra aviso e retry automático imediato no solo; no co-op, animação e espera de 3 s. A corrida tem tela de derrota para quem chega depois. Apenas o anfitrião pausa, reinicia ou avança a sala inteira.
17. Em empate de corrida no mesmo tick, a ordem estável de entrada na sala desempata. Ranking local é medido em ticks de simulação, sem contabilizar pausa ou espera de reconexão.
18. O nome fica em `GAME_NAME`; metadados HTML usam título provisório substituído na inicialização, e a marca visível deriva da constante. Músicas com motivos melódicos originais por mundo são iniciadas após interação para respeitar o WebAudio.
19. Distribuição web em ZIP, sem dependências instaladas nem ferramentas portáteis. Hospedagem documentada para LAN, Render e Docker, sem contratar serviços ou publicar em contas externas.
20. Testes de navegador usam o build e uma porta isolada (4173), evitando interferência de HMR. Medição de desempenho usa Chromium headless com 299 intervalos por perfil; emulação móvel verifica viewport e toque, sem afirmar medição em hardware físico de celular.
