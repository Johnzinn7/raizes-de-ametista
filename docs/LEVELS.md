# Fases e editor

Os arquivos `levels/01.json` a `20.json` contêm a campanha 2, com **20 desenhos independentes**, de 24×24 a 46×38. Cada mapa tem cota, tempo-alvo, checkpoint, gemas comuns, bônus e um segredo. `scripts/campaign-plans.ts` contém as plantas desenhadas individualmente; `scripts/generate-levels.ts` as exporta de forma determinística. O jogo lê os JSON e não executa o gerador. Não há uma sequência de salas reutilizada ou rotacionada entre fases.

| Mundo | Fases | Novas ideias |
| --- | --- | --- |
| Templo da Selva | 01–05 | Folhagem; empurrar; pontes; chave dourada; alavancas |
| Caverna de Gelo | 06–10 | Gelo; espinhos cíclicos; teleporte; chave azul; queda de pedra |
| Ruínas de Fogo | 11–15 | Fogo; barricadas e chave rubra; cobras; dardos; placas com pedras |
| Cripta Sombria | 16–20 | Morcegos; múltiplas cores; fogo e gelo; circuitos com dois selos; combinação final |

As fases alternam exploração, busca com retorno, administração de poderes, travessias, espera por perigos e puzzles com pedras. Comprimento não é sinônimo de dificuldade: uma oficina de contrapesos pode ser menor e exigir mais planejamento que uma galeria extensa. As cotas variam de 4 a 12 gemas; depois da introdução, todas as gemas comuns são necessárias para abrir a saída. Tempos-alvo variam de 35 a 140 segundos.

| Fase | Dimensões | Estrutura e desafio |
| --- | --- | --- |
| 01 | 24×24 | Clareira bifurcada; circuito de exploração entre jardins |
| 02 | 28×24 | Pedreira em ferradura; empurrar e contornar a pedra |
| 03 | 32×24 | Duas margens; construir duas pontes com pedras |
| 04 | 26×30 | Quatro alas; buscar a chave e voltar ao santuário |
| 05 | 34×26 | Aqueduto interrompido; duas alavancas em sequência |
| 06 | 30×28 | Canais em três direções; administrar os três usos de gelo |
| 07 | 24×36 | Escadaria em zigue-zague; espinhos cíclicos e abrigos |
| 08 | 36×26 | Ilhas desconectadas; escolher e revisitar runas de teleporte |
| 09 | 28×34 | Fortaleza ascendente; gelo e busca lateral da chave azul |
| 10 | 38×28 | Terraços; liberar folhagem de apoio e deixar pedras formarem pontes |
| 11 | 26×32 | Árvore de cinzas; três alas, recarga e quatro barreiras de fogo |
| 12 | 34×30 | Labirinto de vigas; atalho queimável e chave rubra |
| 13 | 40×26 | Três jardins; cobras, pilares de abrigo e portal no mirante |
| 14 | 30×38 | Galerias de tiro; refúgios entre travessias expostas |
| 15 | 36×32 | Oficina; duas pedras sobre placas e portão que exige ambas |
| 16 | 28×40 | Catacumbas; câmaras para escapar dos morcegos |
| 17 | 42×30 | Rosácea; três chaves em alas que precisam ser revisitadas |
| 18 | 32×40 | Delta; recarga de fogo, três canais e uso combinado de poderes |
| 19 | 44×32 | Observatório; alas em circuito, atalho rúnico e dois selos |
| 20 | 46×38 | Santuário assimétrico; ponte, duas cores, poderes, armadilhas e contrapeso final |

Abra o [atlas interativo](campaign-preview.html) para comparar as plantas, ou rode `npm run review-campaign` para regenerá-lo. A imagem está em `screenshots/campaign-overview.png`.

Em doze fases, o cofre secreto tem uma variante co-op isolada: uma pessoa segura a placa enquanto a outra atravessa o portão, coleta e retorna. Essas passagens não podem ser contornadas por outra entrada. O percurso obrigatório de cada mapa permanece solucionável solo.

## Usar o editor

Escolha **Editor** no menu. Selecione um tile e clique ou arraste no mapa. Defina nome, mundo, cota e tempo. **Testar agora** abre a fase na mesma simulação. **Validar com BFS** usa um Web Worker e informa solução ou limite de busca. **Exportar JSON** baixa o arquivo; **Importar JSON** lê e valida antes de carregar. O último mapa válido é salvo no navegador.

Alavancas e placas abrem todos os portões quando não há ligações manuais. Teleportes são pareados na ordem de leitura. Abra **Circuitos e teleportes** para editar grupos independentes. Coordenadas começam em zero; `requireAll: true` exige todos os gatilhos.

```json
{
  "circuits": [{
    "triggers": [{ "x": 4, "y": 5 }],
    "gates": [{ "x": 8, "y": 5 }],
    "traps": [{ "x": 9, "y": 5 }],
    "requireAll": false
  }],
  "teleports": [[{ "x": 3, "y": 7 }, { "x": 18, "y": 20 }]]
}
```

`traps` aceita espinhos cíclicos e estátuas de dardos; sem gatilho ativo, a armadilha ligada fica desligada. Portões fecham ao soltar a placa. Pedras podem manter placas, mas precisam de apoio por baixo para permanecer nelas.

## Legenda dos dados

| Símbolo | Objeto | Símbolo | Objeto |
| --- | --- | --- | --- |
| `#` | Parede | `.` | Chão |
| `,` | Folhagem | `X` | Folhagem espessa |
| `d` | Gema comum | `r` | Gema vermelha |
| `O` | Pedra | `h` | Buraco |
| `~` | Água | `=` | Gelo / ponte |
| `^` | Espinhos | `!` | Espinhos cíclicos |
| `a b c` | Chaves: dourada, rubra, azul | `A B C` | Portas correspondentes |
| `l` | Alavanca | `p` | Placa de pressão |
| `G` | Portão | `t` | Teleporte |
| `> < u v` | Dardos: direita, esquerda, cima, baixo | `W` | Barricada |
| `f i $` | Baús: fogo, gelo, três gemas bônus | `n m` | Cobra, morcego |
| `P` | Checkpoint | `E` | Saída |
| `s` | Segredo com gema bônus | `*` | Tocha decorativa sólida |
| `@` | Início do explorador 1 | `2` | Início do explorador 2 |
| `3` | Início do explorador 3 | `4` | Início do explorador 4 |

Os marcadores `2`, `3` e `4` são opcionais e não podem se repetir. Sem um marcador, a simulação escolhe uma casa de chão livre próxima ao início, por busca determinística, sem sobrepor exploradores ou atravessar obstáculos e perigos. As 20 fases e suas variantes cooperativas têm espaço para quatro jogadores. Em mapas próprios sem espaço, adicione marcadores explícitos; a criação da sala recusa uma equipe que não caiba com segurança.

## Validador

`npm run validate-levels` executa BFS sobre estados produzidos por `step`, incluindo direção, cooldown, inventário, portas, rochas, gravidade, inimigos, dardos, circuitos e fases dos timers. Cada aresta aplica uma intenção e cinco ticks de 40 ms. Esperar e usar fogo/gelo são ações possíveis. Estados com mortes são rejeitados.

A busca usa etapas: encontra uma gema comum, chave, baú de poder ou alavanca ainda não ativada e mantém o estado real alcançado. A saída só pode encerrar a busca depois de todas as gemas comuns. Não busca a rota globalmente mínima e pode não confirmar mapas arbitrários que exigem uma ordem diferente; isso é reportado como falha, nunca como sucesso. O limite é 150.000 estados por fase. Um sucesso contém uma sequência reproduzível que coleta **todas** as gemas comuns e vence sem mortes. Bônus são opcionais para a validação.

O deduplicador considera apenas os timers realmente presentes no estado e sua combinação de períodos. Em buscas sem mortes, checkpoints não diferenciam continuações; a orientação só diferencia estados quando há poder disponível, e cooldowns prontos para o próximo tick são equivalentes. As transições continuam executando a mesma simulação completa. Há testes dessas equivalências e da reprodução de chaves, poderes e circuitos.

O validador também reprova soluções que evitam o desafio principal: confere pontes formadas, usos de fogo/gelo, portas abertas, alavancas, travessias de espinhos, teleportes e pedras mantidas nas placas conforme a fase. O relatório completo fica em `campaign-validation.json`. Para conferir apenas uma fase, use `npm run validate-levels -- 14`.

O CI executa o validador e falha se uma fase não tiver solução confirmada. O editor suporta mapas entre 5 e 64 casas em cada dimensão. JSONs importados não entram automaticamente na campanha ou nas salas: adicione-os a `levels` e rode os checks para distribuí-los.

A campanha 2 mantém os IDs de 01 a 20 para seleção e salas, mas guarda estrelas e tempos em um espaço próprio. `amethyst-progress` e `data/rankings.json` da campanha anterior continuam preservados; os novos registros usam `amethyst-progress-campaign-2` e `data/rankings-campaign-2.json`.
