# TRD — annotate-core

> Technical Requirements Document — traduz o PRD em decisões técnicas.
> Fonte: [x] Leitura de código existente (Modo B)
> Depende de: [PRD](./PRD.md)

**Data**: 2026-09-27

## 1. Stack tecnológica

| Camada | Tecnologia | Motivo/restrição |
|---|---|---|
| Frontend (widget) | TypeScript vanilla + esbuild (IIFE), Shadow DOM | Precisa rodar embutido em QUALQUER site do usuário (React, Django, HTML puro) — zero dependência de framework, zero `npm install` no projeto alvo |
| Frontend (dashboard) | Vite + React 18, SPA estática | Só uma tela de lista/detalhe — não precisa de SSR |
| Backend | Node.js 20 + TypeScript, Fastify | `StreamableHTTPServerTransport` do SDK MCP oficial espera `req`/`res` crus do Node — Fastify expõe isso direto, Next.js exigiria adaptador |
| ORM | Drizzle | Sem binary engine (evita fricção do Prisma em Alpine/musl) |
| Banco de dados | PostgreSQL 17 (dedicado, não compartilhado) | Convenção do próprio `infra-core`: cada projeto novo recebe seu próprio banco isolado |
| MCP | `@modelcontextprotocol/sdk`, transporte Streamable HTTP | Precisa ser remoto (não localhost) — usuário nunca valida local, fluxo é GitHub → Easypanel |
| Observabilidade | `@sentry/node` apontando pro GlitchTip self-hosted (protocolo compatível) | Já existe no `infra-core`; opt-in via `SENTRY_DSN`, sem custo de SaaS |
| Infra/Deploy | Docker (multi-stage, `node:20-alpine`) via Easypanel, projeto `infra-core` | Mesmo padrão dos outros serviços do usuário (n8n, GlitchTip, Uptime Kuma) |

## 2. Integrações externas

| Integração | Finalidade | Observações |
|---|---|---|
| GlitchTip | Rastreamento de erros (self-hosted, protocolo Sentry) | Manual: usuário gera o DSN na UI do GlitchTip e cola como env `SENTRY_DSN` |
| Uptime Kuma | Monitor de uptime do `/health` | Manual: criar Monitor HTTP(s) apontando pro domínio do serviço |
| Claude Code / Cursor | Consumidores do servidor MCP remoto (`/mcp`) | Autenticação via token de projeto (`Authorization: Bearer <access_token>`) |
| Codex / n8n | Consumidores via REST (`/api/v1/...`) e webhook de saída | Fallback para quem não fala MCP |

## 3. Requisitos não-funcionais

- Performance: sem exigência formal de latência — uso interno, baixo volume (time pequeno anotando páginas).
- Escalabilidade: volume esperado baixo (dezenas de annotations/dia, poucos projetos simultâneos); arquitetura atual (polling em Postgres, sem Redis) suporta isso sem problema.
- Segurança: tokens de projeto com hash SHA-256 no banco (nunca em claro), dois escopos (`widget` só cria annotation; `access` lê/escreve/MCP), erros nunca vazam mensagem crua do driver de banco pro cliente (`setErrorHandler` genérico + captura no GlitchTip).
- Compliance: nenhuma exigência identificada (ferramenta interna, sem dados de terceiros).
- Disponibilidade: sem SLA formal — é uma ferramenta de apoio ao desenvolvimento, não um serviço voltado a cliente final.
- Internacionalização: só português, sem necessidade de outros idiomas.

## 4. Ambiente e deploy

- Onde roda: VPS própria do usuário, via Easypanel (self-hosted PaaS sobre Docker).
- Provedor: Easypanel, projeto `infra-core` (mesmo projeto de n8n, GlitchTip, Uptime Kuma, whatsapp-core).
- CI/CD: `autoDeploy` do Easypanel a partir do branch `main` do GitHub (`ftsmazzo/annotate-core`, público) — sem pipeline de CI separado nesta v1 (sem testes automatizados ainda, ver Gaps).

## 5. Restrições herdadas

- Sistemas legados a integrar: nenhum — projeto novo, sem dívida técnica herdada.
- Decisões técnicas já tomadas e não-negociáveis (definidas com o usuário antes do scaffold):
  - Autenticação do painel: token/link compartilhado por projeto, sem contas individuais na v1.
  - Modelo: um único serviço central multi-projeto (padrão DSN do Sentry/GlitchTip).
  - Repositório GitHub **público** (não privado) — necessário para o autoDeploy do Easypanel funcionar sem fricção de token/PAT com acesso restrito.
  - Banco Postgres **dedicado** a este projeto (correção feita depois de o usuário apontar que o plano original reaproveitava o `postgres-core` compartilhado, contra a convenção real do `infra-core`).

## 6. Manutenção

- Quem mantém o código: o próprio usuário, com Claude Code/Cursor como ferramentas de desenvolvimento contínuo.
- Nível de complexidade aceitável: baixo/médio — monorepo pnpm simples (4 pacotes), sem microsserviços, sem fila de mensagens (Redis/BullMQ fica pra Fase 2 só se o volume justificar).

---

## Gaps & Recomendações

- [ ] Gap: sem testes automatizados (unitários ou e2e) — a validação até agora foi `tsc --noEmit` limpo nos 3 pacotes, `pnpm build` de ponta a ponta, e um smoke test manual do servidor local (sem Postgres real, por falta de Docker na máquina de desenvolvimento).
  - Recomendação: antes de expandir escopo, adicionar ao menos testes de integração das rotas REST e das tools MCP contra um Postgres real (via `docker-compose.dev.yml` já existente).
- [ ] Gap: nenhum CI configurado (GitHub Actions) — o `autoDeploy` do Easypanel builda direto do `main` sem gate de qualidade antes.
  - Recomendação: adicionar um workflow mínimo (`tsc --noEmit` + build) rodando em PR, antes de aceitar contribuições de mais de uma pessoa no repo.
- [ ] Gap: `docker-compose.dev.yml` e o `Dockerfile` nunca foram testados de fato nesta máquina (sem Docker instalado) — só a lógica foi revisada manualmente.
  - Recomendação: validar o primeiro deploy real no Easypanel com atenção redobrada ao build da imagem (é o primeiro teste de ponta a ponta do Dockerfile).
