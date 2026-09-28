import type { FastifyInstance } from "fastify";
import { CreateAnnotationInput, UpdateAnnotationInput } from "@annotate-core/shared-types";
import { and, desc, eq, ilike, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { annotations, pages } from "../db/schema.js";
import { requireToken } from "../plugins/auth.js";
import { recordEvent } from "../events.js";
import { serializeAnnotation } from "../serialize.js";

export default async function annotationsRoutes(app: FastifyInstance) {
  // Criada pelo widget (token tipo "widget"). CORS liberado globalmente no plugin de cors.
  app.post("/api/v1/annotations", { preHandler: requireToken("widget") }, async (req, reply) => {
    const parsed = CreateAnnotationInput.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const projectId = req.projectId!;
    const pageUrl = new URL(input.url);

    const [page] = await db
      .insert(pages)
      .values({ projectId, url: input.url, path: pageUrl.pathname })
      .onConflictDoUpdate({
        target: [pages.projectId, pages.url],
        set: { lastSeenAt: new Date() },
      })
      .returning();

    const [row] = await db
      .insert(annotations)
      .values({
        projectId,
        pageId: page.id,
        url: input.url,
        message: input.message,
        severity: input.severity,
        reporterName: input.reporterName,
        selector: input.selector,
        domPath: input.domPath,
        computedStyles: input.computedStyles,
        boundingBox: input.boundingBox,
        screenshotUrl: input.screenshotDataUrl,
        elementTextSnippet: input.elementTextSnippet,
        metadata: input.metadata ?? {},
      })
      .returning();

    const serialized = serializeAnnotation(row);
    await recordEvent({
      projectId,
      annotationId: row.id,
      type: "annotation.created",
      payload: { annotation: serialized },
    });

    return reply.code(201).send(serialized);
  });

  // Listagem/leitura/edição — token tipo "access" (link do time + agentes de IA via REST).
  app.get("/api/v1/annotations", { preHandler: requireToken("access") }, async (req) => {
    const projectId = req.projectId!;
    const query = req.query as { status?: string; url_contains?: string; cursor?: string };

    const conditions = [eq(annotations.projectId, projectId)];
    if (query.status) conditions.push(eq(annotations.status, query.status as never));
    if (query.url_contains) conditions.push(ilike(annotations.url, `%${query.url_contains}%`));
    if (query.cursor) conditions.push(lt(annotations.createdAt, new Date(query.cursor)));

    const rows = await db
      .select()
      .from(annotations)
      .where(and(...conditions))
      .orderBy(desc(annotations.createdAt))
      .limit(50);

    return {
      annotations: rows.map(serializeAnnotation),
      nextCursor: rows.length === 50 ? rows[rows.length - 1].createdAt.toISOString() : null,
    };
  });

  app.get(
    "/api/v1/annotations/:id",
    { preHandler: requireToken("access") },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const [row] = await db
        .select()
        .from(annotations)
        .where(and(eq(annotations.id, id), eq(annotations.projectId, req.projectId!)))
        .limit(1);
      if (!row) return reply.code(404).send({ error: "not_found" });
      return serializeAnnotation(row);
    },
  );

  app.patch(
    "/api/v1/annotations/:id",
    { preHandler: requireToken("access") },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = UpdateAnnotationInput.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
      }
      const input = parsed.data;

      const [existing] = await db
        .select()
        .from(annotations)
        .where(and(eq(annotations.id, id), eq(annotations.projectId, req.projectId!)))
        .limit(1);
      if (!existing) return reply.code(404).send({ error: "not_found" });

      const [row] = await db
        .update(annotations)
        .set({
          status: input.status,
          resolvedSummary: input.resolvedSummary,
          resolvedBy: input.resolvedBy,
          resolvedAt: input.status === "resolved" ? new Date() : existing.resolvedAt,
          updatedAt: new Date(),
        })
        .where(eq(annotations.id, id))
        .returning();

      const serialized = serializeAnnotation(row);
      if (input.status && input.status !== existing.status) {
        await recordEvent({
          projectId: req.projectId!,
          annotationId: row.id,
          type: "annotation.status_changed",
          payload: { annotation: serialized, previousStatus: existing.status },
        });
      }
      return serialized;
    },
  );
}
