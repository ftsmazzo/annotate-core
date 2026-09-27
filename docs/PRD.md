# PRD — annotate-core

> Product Requirements Document — o quê e por quê, não como.
> Fonte: [x] Leitura de código existente (Modo B — projeto construído nesta mesma sessão)

**Data**: 2026-09-27
**Responsável**: gestao@fabricadosdados.com.br

## 1. Resumo em uma frase

Ferramenta própria de feedback visual (visual annotation), self-hosted no infra-core, que deixa qualquer pessoa do time apontar um elemento de um site ao vivo e reportar o que está errado, de forma que agentes de IA (Claude Code, Cursor, Codex) leiam e apliquem a correção sem o usuário precisar descrever layout em texto.

## 2. Problema e contexto

- Problema real que motiva o projeto: o usuário sempre explica errado o que quer mudar em UI/layout ao pedir correções para IA; texto solto não localiza o elemento nem o arquivo certo.
- Como é resolvido hoje: nada — descrição verbal, tentativa e erro.
- Ferramentas de mercado avaliadas e descartadas: Agentation (React-only, servidor MCP só em localhost — o fluxo do usuário é GitHub → Easypanel, nunca validação local), Retune (mesma limitação), `annotate.js` (open source, mas 100% local/`localStorage`, sem sincronização entre pessoas do time), SaaS comerciais como BugHerd/Marker.io (resolveriam, mas pagos e hospedados por terceiros, fora da infra própria).
- Por que agora (gatilho): usuário decidiu construir a própria versão self-hosted, no padrão de infraestrutura que já usa (Easypanel, `infra-core`, ao lado de n8n/GlitchTip/Uptime Kuma).

## 3. Público-alvo

- Persona principal: o próprio usuário e seu time, revisando layout de sites/apps já deployados.
- Outros perfis: agentes de IA (Claude Code, Cursor, Codex) como consumidores da API/MCP, não humanos.

## 4. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta |
|---|---|---|
| Eliminar descrição verbal de bugs de layout | % de correções feitas sem ida-e-volta de esclarecimento | Reduzir drasticamente vs. hoje (baseline qualitativo) |
| Funcionar em qualquer stack do usuário, não só React | Nº de stacks diferentes onde o widget foi embutido com sucesso | ≥ 1 fora de React |
| Time inteiro conseguir reportar, sem instalar nada localmente | Uso do link do painel por mais de uma pessoa | Validar com o time |

## 5. Escopo

### Dentro do escopo (MVP)
- Widget embutível via `<script>` (framework-agnostic) para capturar seletor/dom-path/estilos computados/URL.
- Servidor central multi-projeto (token por projeto, sem contas individuais).
- Painel de revisão via link com token compartilhado.
- Servidor MCP remoto (Claude Code/Cursor) + REST/webhook (Codex, n8n).
- Deploy como serviço próprio no `infra-core` (Easypanel), banco Postgres **dedicado**.

### Fora do escopo (por enquanto)
- Screenshot real da região anotada (Fase 2).
- Contas individuais de usuário / RBAC (Fase 2).
- Push real (Redis pub/sub) no `watch_annotations` — hoje é long-poll (Fase 2).

## 6. Funcionalidades principais

| Funcionalidade | Prioridade | Descrição curta |
|---|---|---|
| Widget de anotação | MVP | Clique num elemento, escreve o problema, captura contexto estrutural |
| Painel de revisão | MVP | Lista/detalhe de annotations por status, comentários |
| MCP remoto | MVP | Tools para IA listar, ler, resolver, comentar, watch |
| REST + webhook | MVP | Fallback para Codex/n8n e qualquer outro consumidor |
| Observabilidade (GlitchTip) | MVP | Hook opt-in via `SENTRY_DSN`, erros não vazam pro cliente |
| Screenshot real | Fase 2 | Captura de imagem da região, não só metadados |

## 7. Restrições de negócio

- Prazo: sem prazo formal — construído em uma sessão contínua.
- Orçamento: zero custo de SaaS — tudo self-hosted na VPS já paga (Easypanel).
- Legais/regulatórias: nenhuma identificada (ferramenta interna, sem dados de terceiros/clientes finais).

## 8. Riscos e premissas

- Premissa: sem acesso à fiber tree do React (ou equivalente de outros frameworks), o mapeamento elemento→arquivo não é automático fora de React — mitigado com seletor+snippet de texto suficientes para grep manual do agente.
- Risco: servidor MCP exposto publicamente por token — mitigado com hash SHA-256 do token e dois escopos (`widget` só cria, `access` lê/escreve).

---

## Gaps & Recomendações

- [ ] Gap: sem contas individuais — qualquer um com o link do projeto tem acesso total (leitura+escrita) àquele projeto.
  - Recomendação: aceitável para v1 (time pequeno, confiança implícita); revisitar se o time crescer ou o link vazar.
- [ ] Gap: `watch_annotations` é long-poll, não push real — um agente "esperando" consome uma request HTTP por até 55s.
  - Recomendação: migrar para Redis pub/sub na Fase 2 se o volume de agentes simultâneos crescer.
- [ ] Gap: sem testes automatizados (unitários/e2e) — validação até agora foi manual (typecheck + build + smoke test local).
  - Recomendação: adicionar testes antes de qualquer expansão de escopo além do MVP.
