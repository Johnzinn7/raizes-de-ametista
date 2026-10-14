# Fases e editor

Os arquivos `levels/01.json` a `20.json` contêm toda a campanha. Cada mapa tem 25×25 casas, uma cota, um tempo-alvo, checkpoint, gemas comuns, gemas bônus e um segredo. `scripts/generate-levels.ts` documenta a construção procedural determinística desses layouts originais; o jogo lê os JSON, não executa o gerador.

| Mundo | Fases | Novas ideias |
| --- | --- | --- |
| Templo da Selva | 01–05 | Folhagem; empurrar; pontes; chave dourada; alavancas |
| Caverna de Gelo | 06–10 | Gelo; espinhos cíclicos; teleporte; chave azul; queda de pedra |
| Ruínas de Fogo | 11–15 | Fogo; barricadas e chave rubra; cobras; dardos; placas com pedras |
| Cripta Sombria | 16–20 | Morcegos; múltiplas cores; fogo e gelo; circuitos com dois selos; combinação final |

As câmaras oferecem rotas alternativas e tesouros fora do trajeto principal. Em doze fases, a variante co-op troca a entrada do cofre secreto por um portão: uma pessoa segura a placa e a outra entra, coleta e retorna. A rota de saída permanece solucionável solo.

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

## Validador

`npm run validate-levels` executa BFS sobre estados produzidos por `step`, incluindo direção, cooldown, inventário, portas, rochas, gravidade, inimigos, dardos, circuitos e fases dos timers. Cada aresta aplica uma intenção e cinco ticks de 40 ms. Esperar e usar fogo/gelo são ações possíveis. Estados com mortes são rejeitados.

A busca usa etapas: encontra a próxima gema comum, mantém o estado real alcançado e busca a seguinte. Só então busca a saída. Não busca a rota globalmente mínima e pode não confirmar mapas arbitrários que exigem uma ordem de coleta diferente; isso é reportado como falha, nunca como sucesso. O limite é 150.000 estados por fase. Um sucesso contém uma sequência reproduzível que coleta **todas** as gemas comuns e vence. Bônus são opcionais para a validação.

O CI executa o validador e falha se uma fase não tiver solução confirmada. O editor suporta mapas entre 5 e 64 casas em cada dimensão; a campanha usa 25×25. JSONs importados não entram automaticamente na campanha ou nas salas: adicione-os a `levels` e rode os checks para distribuí-los.
