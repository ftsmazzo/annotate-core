# annotate-core — regras do projeto

Fonte única de verdade para qualquer agente (Claude Code, Cursor, Codex) trabalhando neste repositório. `.cursor/rules/annotate-core.mdc` só aponta pra cá — não duplique conteúdo lá.

Docs de produto: [docs/PRD.md](docs/PRD.md) · [docs/TRD.md](docs/TRD.md) · visão geral de uso: [README.md](README.md)

## Arquitetura (não repetir do README, só o que muda como você codifica)

- Monorepo pnpm: `apps/server` (Fastify + Drizzle + MCP), `apps/dashboard` (Vite+React), `packages/widget` (vanilla TS), `packages/shared-types` (zod compartilhado).
- O widget NUNCA pode ganhar uma dependência de framework — ele roda embutido em sites que o usuário não controla a stack. Qualquer lib nova em `packages/widget` quebra essa premissa; pense duas vezes.
- Banco: Postgres **dedicado** a este projeto (nunca aponte `DATABASE_URL` pro `postgres-core` compartilhado do `infra-core` — convenção do próprio Easypanel do usuário).
- MCP é stateless por request (uma instância de `McpServer` por chamada, presa ao `projectId` do token) — não introduza sessão persistente sem necessidade real.

## Checklist de segurança (adaptado à stack real, não uma lista genérica)

- Nunca logar ou devolver ao cliente o `token` bruto de um projeto — só o hash SHA-256 fica no banco (`hashToken` em `apps/server/src/plugins/auth.ts`).
- Toda rota de escrita exige `requireToken("access")`; toda rota de criação vinda do widget exige `requireToken("widget")` — não misture os dois escopos.
- Erros não tratados nunca devem vazar a mensagem crua do driver de Postgres pro cliente — passam pelo `setErrorHandler` genérico em `apps/server/src/index.ts`, que também reporta pro GlitchTip.
- CORS é liberado geral (`origin: true`) de propósito no servidor — é assim que o widget funciona embutido em qualquer domínio; não "corrija" isso sem entender a implicação.

## Esteira de qualidade

- `pnpm --filter <pacote> exec tsc --noEmit` antes de qualquer commit que toque em `.ts`/`.tsx`.
- `pnpm build` (widget → dashboard → server) precisa passar de ponta a ponta antes de um deploy.
- Sem framework de testes configurado ainda (ver Gaps no TRD) — se você adicionar um, prefira Vitest (já é o ecossistema Vite/esbuild do resto do projeto).

## Fluxo de Issues/PR

- Repositório público: `ftsmazzo/annotate-core`. Branch principal `main`, com `autoDeploy` no Easypanel — qualquer push em `main` vai pro ar. Trabalhe em branch separada para mudanças maiores, mesmo sem CI configurado ainda.
- Commits em português, mensagem curta explicando o "porquê", não o "o quê" (o diff já mostra o quê).

## Observabilidade

- GlitchTip (self-hosted) é opt-in via env `SENTRY_DSN` (`apps/server/src/observability.ts`). Sem a env, é um no-op — não exija a variável em dev local.
- Uptime Kuma monitora `/health` externamente — não precisa de nada no código além desse endpoint já existente.
