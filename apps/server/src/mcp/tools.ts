import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { annotations, comments, events } from "../db/schema.js";
import { serializeAnnotation, serializeAnnotationForAgent, serializeComment } from "../serialize.js";
import { recordEvent } from "../events.js";

const StatusEnum = z.enum(["pending", "in_progress", "resolved", "wont_fix", "archived"]);

/**
 * Uma instância de McpServer por request, com as tools presas ao projectId do token
 * autenticado (modo stateless — sem sessão MCP persistida entre chamadas).
 */
export function createMcpServer(projectId: string): McpServer {
  const server = new McpServer({ name: "annotate-core", version: "0.1.0" });

  server.registerTool(
    "list_pending_annotations",
    {
      description:
        "Lista annotations do projeto autenticado, por padrão as pendentes. Use para descobrir o que o time reportou e ainda precisa de correção.",
      inputSchema: {
        status: StatusEnum.default("pending"),
        url_contains: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async ({ status, url_contains, limit }) => {
      const conditions = [eq(annotations.projectId, projectId), eq(annotations.status, status)];
      const rows = await db
        .select()
        .from(annotations)
        .where(and(...conditions))
        .orderBy(desc(annotations.createdAt))
        .limit(limit);
      const filtered = url_contains
        ? rows.filter((r) => r.url.includes(url_contains))
        : rows;
      return {
        content: [
          { type: "text", text: JSON.stringify(filtered.map(serializeAnnotationForAgent), null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "get_annotation",
    {
      description:
        "Retorna o detalhe completo de uma annotation (seletor, dom_path, estilos computados, bounding box) e a thread de comentários.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      const [row] = await db
        .select()
        .from(annotations)
        .where(and(eq(annotations.id, id), eq(annotations.projectId, projectId)))
        .limit(1);
      if (!row) {
        return { content: [{ type: "text", text: "not_found" }], isError: true };
      }
      const commentRows = await db
        .select()
        .from(comments)
        .where(eq(comments.annotationId, id))
        .orderBy(comments.createdAt);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { ...serializeAnnotationForAgent(row), comments: commentRows.map(serializeComment) },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "resolve_annotation",
    {
      description:
        "Marca uma annotation como resolvida e registra um resumo do que foi corrigido. Use depois de aplicar a mudança de código correspondente.",
      inputSchema: {
        id: z.string().uuid(),
        summary: z.string().min(1),
        resolved_by: z.string().default("agent"),
      },
    },
    async ({ id, summary, resolved_by }) => {
      const [existing] = await db
        .select()
        .from(annotations)
        .where(and(eq(annotations.id, id), eq(annotations.projectId, projectId)))
        .limit(1);
      if (!existing) {
        return { content: [{ type: "text", text: "not_found" }], isError: true };
      }

      const [row] = await db
        .update(annotations)
        .set({
          status: "resolved",
          resolvedSummary: summary,
          resolvedBy: resolved_by,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(annotations.id, id))
        .returning();

      await db.insert(comments).values({
        annotationId: id,
        authorName: resolved_by,
        authorKind: "agent",
        body: summary,
      });

      const serialized = serializeAnnotation(row);
      await recordEvent({
        projectId,
        annotationId: id,
        type: "annotation.status_changed",
        payload: { annotation: serialized, previousStatus: existing.status },
      });

      return { content: [{ type: "text", text: JSON.stringify(serializeAnnotationForAgent(row), null, 2) }] };
    },
  );

  server.registerTool(
    "update_annotation_status",
    {
      description: "Atualiza só o status de uma annotation, sem registrar resumo de resolução.",
      inputSchema: { id: z.string().uuid(), status: StatusEnum },
    },
    async ({ id, status }) => {
      const [existing] = await db
        .select()
        .from(annotations)
        .where(and(eq(annotations.id, id), eq(annotations.projectId, projectId)))
        .limit(1);
      if (!existing) {
        return { content: [{ type: "text", text: "not_found" }], isError: true };
      }
      const [row] = await db
        .update(annotations)
        .set({ status, updatedAt: new Date() })
        .where(eq(annotations.id, id))
        .returning();

      const serialized = serializeAnnotation(row);
      await recordEvent({
        projectId,
        annotationId: id,
        type: "annotation.status_changed",
        payload: { annotation: serialized, previousStatus: existing.status },
      });
      return { content: [{ type: "text", text: JSON.stringify(serializeAnnotationForAgent(row), null, 2) }] };
    },
  );

  server.registerTool(
    "comment_on_annotation",
    {
      description: "Adiciona um comentário do agente na thread de uma annotation, sem mudar status.",
      inputSchema: { id: z.string().uuid(), body: z.string().min(1), author_name: z.string().default("agent") },
    },
    async ({ id, body, author_name }) => {
      const [row] = await db
        .insert(comments)
        .values({ annotationId: id, authorName: author_name, authorKind: "agent", body })
        .returning();
      await recordEvent({
        projectId,
        annotationId: id,
        type: "comment.created",
        payload: { comment: serializeComment(row) },
      });
      return { content: [{ type: "text", text: JSON.stringify(serializeComment(row), null, 2) }] };
    },
  );

  server.registerTool(
    "watch_annotations",
    {
      description:
        "Long-poll: aguarda até timeout_seconds por novos eventos (annotation criada/status mudou/comentário) desde since_event_id. Não é push real — chame em loop. Para notificação empurrada de verdade, use webhooks (POST /api/v1/webhooks).",
      inputSchema: {
        since_event_id: z.number().int().default(0),
        timeout_seconds: z.number().int().min(1).max(55).default(25),
      },
    },
    async ({ since_event_id, timeout_seconds }) => {
      const deadline = Date.now() + timeout_seconds * 1000;
      while (true) {
        const rows = await db
          .select()
          .from(events)
          .where(and(eq(events.projectId, projectId), gt(events.id, since_event_id)))
          .orderBy(events.id)
          .limit(50);
        if (rows.length > 0 || Date.now() >= deadline) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    events: rows.map((r) => ({
                      id: r.id,
                      type: r.type,
                      annotationId: r.annotationId,
                      payload: r.payload,
                    })),
                    lastEventId: rows.length > 0 ? rows[rows.length - 1].id : since_event_id,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    },
  );

  return server;
}
