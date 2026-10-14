# WallX Engine

**Beta 1.0.0** · Copyright © 2026 Team AntiLag · https://teamantilag.com

WallX Engine reproduz vídeos MP4 e cenas locais do Wallpaper Engine como papel de parede animado no Windows 10/11 x64. O aplicativo é nativo em C++/Win32. Vídeos usam Media Foundation; cenas usam Direct3D 11.

## Cenas do Wallpaper Engine

Importe o `project.json` da pasta do wallpaper. O WallX lê arquivos soltos e entradas de `scene.pkg` sem extrair o pacote. Os arquivos continuam na pasta original; por isso, não mova a pasta depois de importá-la. O WallX não instala nem redistribui wallpapers do Steam.

O renderizador atual implementa camadas 2D, modelos FBX com materiais/texturas, câmera animada, luzes pontuais, partículas, bloom e um conjunto definido de efeitos de imagem (tint, scroll, sway, waves, shake, ripple, blur, opacity, pulse, Water Flow e Iris Movement). Camadas podem combinar até dez efeitos. Water Flow usa o mapa de fluxo e a textura de fase para deslocar a imagem; Iris Movement usa a máscara e os parâmetros de movimento dos olhos. Scripts de propriedades e texto são executados numa instância limitada de QuickJS, sem acesso a arquivos ou rede. Imagens, texturas `.tex` e materiais são carregados localmente. Partículas que dependem de texturas internas do Wallpaper Engine recebem sprites procedurais quando a textura não vem com o projeto. Partículas de chuva refrativa sem textura recebem um mapa normal procedural e distorcem a imagem atrás delas.

As treze cenas de exemplo agora são importadas e renderizadas nos testes locais. Efeitos desconhecidos são omitidos com um aviso de compatibilidade na importação; a cena permanece utilizável, mas não é idêntica ao Wallpaper Engine. Scripts incompatíveis usam o texto ou cor estática da camada e registram o motivo no log. Arsenal depende do FBX original. No Lamborghini, `pulse` com áudio ainda usa uma animação temporal; sua projeção foi ajustada para evitar o carro achatado em tela 16:9. Em Rain, a máscara do efeito shake acompanha a posição deslocada, preservando a região das sobrancelhas durante o piscar. O motor original tem formatos, shaders e APIs ainda não reproduzidos aqui. Cenas web e wallpapers interativos não são suportados.

Os ajustes particulares dos pacotes de exemplo ficam em `src/SceneCompatibility.cpp`, identificados pelo ID da cena e pelo nome da camada. Densidade, opacidade, velocidade, estilo da chuva e enquadramento ultralargo têm valores separados para cada pacote. Um wallpaper novo usa os valores neutros e a cor das próprias partículas. O relógio de BAD! / Sailor Moon agora atualiza em tempo real nas opções 2D padrão; as opções 3D e sombra do script original continuam sem suporte.

Lost Valley agora reconhece Color Grading no modo Luminance/Saturation/Vibrance, o blur nativo, as barras de áudio no formato Center U/D com até três barras, o conjunto central de lua/relógio e a chuva com gotas refrativas na tela. O sistema de partículas renderiza os filhos do preset de chuva e usa apenas as texturas necessárias da pasta `wallpaper engine/assets`. O blur e a refração são aproximações em shader; as barras usam três faixas calculadas a partir do áudio de saída do Windows por WASAPI loopback, sem reproduzir ou gravar som em arquivo. Se não houver dispositivo de saída disponível, as barras ficam em seu tamanho mínimo e o renderizador tenta reconectar. A fonte Atami não acompanha o pacote do wallpaper, então data e hora usam a fonte padrão do Windows. Outras combinações dos efeitos de workshop ainda podem gerar aviso de compatibilidade.

| Amostra nova | Estado nesta etapa |
|---|---|
| Lamborghini Diablo GTR | Renderiza; pulse temporal e chuva refrativa |
| Anime | Renderização parcial; sem god rays, motion blur e nitro |
| Fade Triple Monitor | Renderização parcial; Water Flow ativo, outros efeitos omitidos |
| 6-Twelve | Renderização parcial; sem shaders de workshop |
| BAD! / Sailor Moon | Renderização parcial; relógio 2D ativo, sem alguns efeitos e opções 3D do script |
| Lost Valley | Renderização parcial; color grading, blur, barras de áudio, relógio central, chuva e gotas refrativas ativos; outros efeitos ainda aproximados |

### Chuva e gotas — correção de renderização

Os perfis de chuva das cenas já calibradas em `src/SceneCompatibility.cpp` preservam seus valores anteriores, mas agora são independentes. Traços recebem comprimentos variados uma única vez ao nascer; as cenas calibradas podem usar realces brancos/cinzas, enquanto novos pacotes preservam a cor do material. A identificação de chuva em `src/RainStyle.h` usa o nome da camada, do sistema, do material e das texturas; filhos herdam a classificação. Efeitos personalizados sem identificação de chuva podem exigir um novo identificador nesse arquivo.

O caminho de partículas lê os canais diretamente do formato `.tex`: RG88 usa verde como alpha, e os mapas normais RGBA usam alpha/verde para direção e vermelho para a máscara de refração. Os recortes de sprites vêm do bloco TEXS do arquivo, inclusive no atlas horizontal de cinco gotas de `2511663284`; não dependem de `.tex-json`. Texturas pequenas de partículas são mantidas na resolução original. A refração preserva o sinal e a intensidade do material e acompanha a rotação da partícula, sem o sombreado cinza artificial anterior.

Os traços usam tamanho × velocidade × comprimento, com os limites do renderer `spritetrail`. O desfoque do Lost Valley respeita a máscara do passe de composição. A distribuição exponencial de tamanho/opacidade e o início do fade-out seguem a [documentação de partículas](https://docs.wallpaperengine.io/en/scene/particles/component/operator.html). A referência de canais e tangentes foi conferida nos arquivos locais `common_fragment.h`, `common_particles.h` e `genericparticle.frag` do Wallpaper Engine. Isso corrige manchas/quadrados e o alongamento da chuva; não implica equivalência integral entre os motores. A simulação de ruído de velocidade, perspectiva de partículas e eventos de filhos ainda tem limitações.

`ParticlePixelRegression` renderiza cenários isolados em Direct3D/WARP e compara pixels: transparência RG88 não altera o fundo; alpha do normal desloca a refração; vermelho zero bloqueia o deslocamento. Também verifica os 16 recortes do Lost Valley e os 5 recortes do atlas de Rain, usando os arquivos reais. Os testes de cena continuam cobrindo todos os wallpapers de exemplo.

## Biblioteca e reprodução

A biblioteca guarda até 15 caminhos e miniaturas locais. Arquivos `.mp4` e `project.json` podem ser importados pelo botão ou arrastados diretamente para a biblioteca. O último wallpaper aplicado volta ao abrir o aplicativo. Vídeos são silenciosos, podem ser trocados sem reiniciar, e as opções de FPS, qualidade, aceleração por hardware e pausa em tela cheia continuam disponíveis. Minimizar ou fechar o painel o envia para a área de notificação. Configurações e biblioteca são salvas em `%LOCALAPPDATA%\WallX Engine`.

## Compilar e testar

Requisitos: Visual Studio com desenvolvimento C++, Windows SDK e CMake. No terminal da pasta `Source`:

```powershell
cmake -S . -B build -A x64 -DWALLX_BUILD_TESTS=ON
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
cmake --install build --config Release --prefix dist
```

O aplicativo distribuído precisa de `WallX Engine.exe`, `assets/shaders/` e `assets/scene-defaults/` na estrutura gerada por `cmake --install`. Apenas as texturas padrão necessárias aos efeitos implementados são copiadas para `scene-defaults`; a árvore completa de assets do Wallpaper Engine não é distribuída. O build pré-compila seis shaders `.cso`, evitando compilação durante a abertura das cenas; `scene.hlsl` permanece como fallback. As licenças de ufbx, LZ4 e QuickJS ficam em `licenses/`; as três bibliotecas são vinculadas estaticamente. O runtime MSVC também é estático. Nenhum serviço externo é usado para renderizar uma cena.

O limite de FPS da cena controla a frequência de renderização. Modelos 3D, múltiplas texturas e efeitos exigem GPU e memória variáveis conforme o wallpaper; não há garantia de consumo fixo para qualquer projeto. O vídeo MP4 depende dos codecs nativos do Windows.
