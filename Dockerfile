FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/widget/package.json packages/widget/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter widget build \
 && pnpm --filter dashboard build \
 && pnpm --filter server build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/src/db/migrations ./dist/db/migrations
COPY --from=build /app/packages/widget/dist ./dist/public/widget
COPY --from=build /app/apps/dashboard/dist ./dist/public/dashboard
EXPOSE 3000
CMD ["node", "dist/index.js"]
