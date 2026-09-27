import type { FastifyInstance } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { events } from "../db/schema.js";
import { requireToken } from "../plugins/auth.js";

const POLL_INTERVAL_MS = 1500;

/** Long-poll simples sobre a tabela events — fallback para n8n/Codex que não falam MCP. */
export default async function eventsRoutes(app: FastifyInstance) {
  app.get("/api/v1/events", { preHandler: requireToken("access") }, async (req) => {
    const query = req.query as { since?: string; wait?: string };
    const since = query.since ? Number(query.since) : 0;
    const waitSeconds = Math.min(Number(query.wait ?? 0), 55);
    const deadline = Date.now() + waitSeconds * 1000;

    while (true) {
      const rows = await db
        .select()
        .from(events)
        .where(and(eq(events.projectId, req.projectId!), gt(events.id, since)))
        .orderBy(events.id)
        .limit(50);

      if (rows.length > 0 || Date.now() >= deadline) {
        return {
          events: rows.map((r) => ({
            id: r.id,
            type: r.type,
            annotationId: r.annotationId,
            payload: r.payload,
            createdAt: r.createdAt.toISOString(),
          })),
          lastEventId: rows.length > 0 ? rows[rows.length - 1].id : since,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  });
}
