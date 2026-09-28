import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { env } from "./env.js";
import { initObservability, Sentry } from "./observability.js";
import { db } from "./db/client.js";
import annotationsRoutes from "./routes/annotations.js";
import commentsRoutes from "./routes/comments.js";
import eventsRoutes from "./routes/events.js";
import webhooksRoutes from "./routes/webhooks.js";
import mcpRoutes from "./routes/mcp.js";
import adminRoutes from "./routes/admin.js";
import { processDueWebhookDeliveries } from "./webhooks/dispatcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initObservability();

// Sem exec/shell disponível no container em produção (Easypanel) — migração roda no boot.
// `pnpm deploy` (usado no Dockerfile) inclui src/ inteiro no pacote publicado, então
// "../src/db/migrations" resolve tanto em dev (tsx a partir de src/) quanto em prod
// (node a partir de dist/, com src/ como irmão de dist/ no output do deploy).
await migrate(db, { migrationsFolder: path.join(__dirname, "../src/db/migrations") });

const app = Fastify({ logger: true });

app.setErrorHandler((err: FastifyError, req, reply) => {
  app.log.error(err);
  Sentry.captureException(err);
  // Nunca vaza a mensagem crua do Postgres/driver pro cliente — só um erro genérico.
  reply.code(err.statusCode ?? 500).send({ error: "internal_error" });
});

// Liberado geral: o widget roda embutido em qualquer domínio dos sites do usuário,
// então não dá pra restringir por origin fixo (mesmo modelo do endpoint de ingest do Sentry).
await app.register(cors, { origin: true });

await app.register(annotationsRoutes);
await app.register(commentsRoutes);
await app.register(eventsRoutes);
await app.register(webhooksRoutes);
await app.register(mcpRoutes);
await app.register(adminRoutes);

app.get("/health", async () => ({ ok: true }));

// Widget público (JS buildado pelo pacote packages/widget) e dashboard (SPA buildada).
// Em dev (tsx rodando a partir de src/), esses diretórios só existem depois de um build —
// registrar de forma condicional evita quebrar `pnpm dev:server` para quem só mexe na API/MCP.
const widgetPublicDir = path.join(__dirname, "public/widget");
const dashboardPublicDir = path.join(__dirname, "public/dashboard");

// Lido direto do disco (em vez de reply.sendFile) pra não depender do decorator do
// @fastify/static registrado mais abaixo (que só existe se o dashboard também tiver sido buildado).
const widgetFile = path.join(widgetPublicDir, "widget.js");
if (existsSync(widgetFile)) {
  const widgetSource = readFileSync(widgetFile);
  app.get("/widget.js", (req, reply) => {
    reply.type("application/javascript").send(widgetSource);
  });
} else {
  app.log.warn(`widget não buildado ainda (${widgetFile} não existe) — rode "pnpm --filter widget build"`);
}

// Zip da extensão de navegador — distribuição pro time por link (chrome://extensions ->
// carregar sem compactação), em vez de depender de um caminho de pasta na máquina de quem builda.
const extensionZipFile = path.join(__dirname, "public/extension.zip");
if (existsSync(extensionZipFile)) {
  const extensionZipSource = readFileSync(extensionZipFile);
  app.get("/extension.zip", (req, reply) => {
    reply
      .type("application/zip")
      .header("content-disposition", 'attachment; filename="annotate-extension.zip"')
      .send(extensionZipSource);
  });
} else {
  app.log.warn(`extensão não buildada ainda (${extensionZipFile} não existe)`);
}

if (existsSync(dashboardPublicDir)) {
  await app.register(fastifyStatic, {
    root: dashboardPublicDir,
    prefix: "/",
  });
} else {
  app.log.warn(`dashboard não buildado ainda (${dashboardPublicDir} não existe) — rode "pnpm --filter dashboard build"`);
}

app.setNotFoundHandler((req, reply) => {
  if (req.raw.method === "GET" && !req.url.startsWith("/api") && existsSync(dashboardPublicDir)) {
    return reply.sendFile("index.html", dashboardPublicDir);
  }
  return reply.code(404).send({ error: "not_found" });
});

// Sem BullMQ na Fase 1 — um timer simples processa deliveries de webhook pendentes.
setInterval(() => {
  processDueWebhookDeliveries().catch((err) => app.log.error(err, "webhook dispatcher failed"));
}, 5000);

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
