# annotate-core

Ferramenta própria de visual feedback/annotation, self-hosted, multi-projeto — substitui BugHerd/Marker.io/Agentation para times que não validam local (fluxo GitHub → deploy).

## Como funciona

1. **Widget** (`packages/widget`): um `<script>` embutido em qualquer site (React, Django, HTML puro — não exige nenhum framework específico). O time clica num elemento, escreve o que está errado, e isso vira uma annotation com seletor CSS, caminho DOM, estilos computados e URL da página.
2. **Servidor** (`apps/server`): Fastify. Expõe REST (`/api/v1/...`), um servidor **MCP remoto** (`/mcp`, HTTP) para Claude Code/Cursor lerem e resolverem annotations, e webhooks de saída para n8n/Codex/qualquer outro consumidor.
3. **Dashboard** (`apps/dashboard`): painel onde o time vê e comenta as annotations, acessado por um link com token por projeto (sem contas individuais na v1).

## Rodando localmente

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres local
cp .env.example .env
pnpm install
pnpm --filter server db:generate                 # gera migrations a partir do schema
pnpm --filter server db:migrate
pnpm --filter server exec tsx src/scripts/create-project.ts "Meu Site" meu-site
pnpm dev:server        # http://localhost:3000
pnpm dev:dashboard     # http://localhost:5173 (proxy pro server em dev)
```

O comando `create-project.ts` imprime a tag `<script>` do widget e o link do painel com o token de acesso — guarde o token, ele não é reexibido.

## Conectando o Claude Code como MCP remoto

```bash
claude mcp add --transport http annotate https://<seu-dominio>/mcp -H "Authorization: Bearer <access_token>"
```

Tools disponíveis: `list_pending_annotations`, `get_annotation`, `resolve_annotation`, `update_annotation_status`, `comment_on_annotation`, `watch_annotations`.

## Deploy (Easypanel / infra-core)

Nova App no projeto `infra-core`, source = Git (branch `main`), build = Dockerfile, porta 3000. Variáveis: `DATABASE_URL` (banco dedicado `annotate_prod` no `postgres-core`), `APP_BASE_URL`, `NODE_ENV=production`. Depois do primeiro deploy, rode a migration e o `create-project.ts` uma vez dentro do container.

## Fase 2 (não implementado ainda)

Screenshot real, contas individuais + RBAC, Redis (BullMQ + pub/sub para push real no `watch_annotations`), múltiplos ambientes por projeto.
