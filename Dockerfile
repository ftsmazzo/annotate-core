FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter shared-types build \
 && pnpm --filter widget build \
 && pnpm --filter browser-extension build \
 && pnpm --filter dashboard build \
 && pnpm --filter server build
# pnpm deploy resolve o node_modules de verdade do pacote server (inclusive workspace deps
# como o shared-types), diferente de copiar node_modules na mão — foi a causa real do
# ERR_MODULE_NOT_FOUND (fastify) no primeiro deploy: node_modules da raiz não tem os
# symlinks específicos de cada pacote do monorepo.
RUN pnpm --filter server deploy --prod /app/deploy/server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/deploy/server ./
COPY --from=build /app/packages/widget/dist ./dist/public/widget
COPY --from=build /app/packages/browser-extension/annotate-extension.zip ./dist/public/extension.zip
COPY --from=build /app/apps/dashboard/dist ./dist/public/dashboard
EXPOSE 3000
CMD ["node", "dist/index.js"]
