FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY index.html tsconfig.json vite.config.ts ./
COPY src/shared ./src/shared
COPY src/client ./src/client
COPY src/server ./src/server
COPY scripts ./scripts
COPY levels ./levels
COPY tests/game ./tests/game
RUN npm run build && npm test && npm run validate-levels
RUN npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DATA_DIR=/app/data
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/web-dist ./web-dist
COPY --from=builder /app/src/shared ./src/shared
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/levels ./levels
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]
