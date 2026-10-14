# Decisões de implementação

1. Nome original: Raízes de Ametista; a constante `GAME_NAME` em `src/shared/config.ts` é a fonte do título.
2. Preservar a engine C++ e seu `dist`; arquivos web usam `src/client`, `src/shared`, `src/server` e `web-dist`.
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
