# Hospedagem

## Desenvolvimento e LAN

Com Node.js 24 LTS instalado, `npm ci && npm run dev`. Abra `http://localhost:5173`. O Vite escuta em `0.0.0.0` e mostra os IPs de rede. Nos outros computadores ou celulares (até quatro participantes por sala), use **o mesmo IP do computador servidor**, por exemplo `http://192.168.0.7:5173`. Permita a porta 5173 no firewall da rede privada. Não use `localhost` no segundo aparelho.

No Windows sem Node instalado, `powershell -ExecutionPolicy Bypass -File .\Jogar.ps1` prepara Node portátil dentro de `.tools`, confere o SHA-256 oficial e instala as dependências. Não altera o PATH permanente. `-Production` gera o build e inicia o modo produção.

Para jogar em grupo, escolha 2, 3 ou 4 participantes ao criar a sala e compartilhe o código. Todos precisam preencher as vagas e marcar **Estou pronto**. A mesma hospedagem atende co-op e corrida para quatro pessoas, sem portas ou serviços extras.

## Produção em Node

```sh
npm ci
npm run build
npm start
```

Abra `http://localhost:3001`. HTTP, assets, `/api/rankings` e `/ws` usam a mesma porta. Variáveis: `PORT` (3001), `DATA_DIR` (pasta `data` no projeto). Use uma única instância: salas ficam em memória, e o ranking usa arquivo JSON com escrita atômica. Reiniciar o processo encerra salas; reconexão de 30 segundos cobre falha do cliente, não reinício do servidor.

O ranking da campanha redesenhada usa `rankings-campaign-2.json` dentro de `DATA_DIR`. O antigo `rankings.json` fica preservado. As duas campanhas têm recordes separados para que os tempos dos mapas antigos não sejam comparados com os novos.

`tsx` faz parte das dependências de execução. Depois do build, é possível usar `npm prune --omit=dev` e continuar com `npm start`. Preserve `src/server`, `src/shared`, `levels`, `web-dist`, `package.json` e `node_modules`.

## Render

O arquivo `render.yaml` é um Blueprint pronto para um Web Service Node. Publique este projeto em seu repositório, escolha **New → Blueprint** e conecte-o. Alternativamente, configure manualmente:

| Campo | Valor |
| --- | --- |
| Runtime | Node |
| Node | 24.22.0 |
| Build | `npm ci --include=dev && npm run build && npm test && npm run validate-levels` |
| Start | `npm start` |
| Health check | `/health` |

O cliente detecta HTTPS e usa `wss://` no domínio do próprio serviço. O Render encaminha WebSocket por seu endpoint público. Consulte as [instruções oficiais de WebSocket](https://render.com/docs/websocket) e a [configuração de Node](https://render.com/docs/node-version).

O exemplo usa o plano gratuito. O filesystem dele é efêmero: ranking não sobrevive a deploys/reinícios; serviços sem tráfego podem dormir. Para ranking durável, escolha um serviço com disco persistente e aponte `DATA_DIR` para o ponto de montagem. Mantenha uma réplica. Veja as [limitações oficiais do plano gratuito](https://render.com/docs/free).

Nenhum serviço foi contratado ou publicado durante esta implementação.

## Docker / VPS

```sh
docker build -t raizes-de-ametista .
docker run --rm -p 3001:3001 -v templo-data:/app/data raizes-de-ametista
```

O estágio de build roda TypeScript, testes e validação das 20 fases. O estágio final roda como usuário `node`, inclui somente o jogo web e possui health check. O volume preserva o ranking.

Em um proxy HTTPS, encaminhe HTTP e WebSocket para a mesma instância. Exemplo de bloco nginx dentro de um `server` com certificado configurado:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 75s;
}
```

O servidor não exige contas; as salas são acessadas por código. Tokens de reconexão ficam no sessionStorage de cada aba. O servidor limita tamanho/frequência das mensagens e valida intenções, inventário, colisões e tempo.
