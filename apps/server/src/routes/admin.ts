import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { UpdateAnnotationInput } from "@annotate-core/shared-types";
import { and, desc, eq } from "drizzle-orm";
import { createProjectWithTokens, getActiveTokensForProject, regenerateTokensForProject } from "../admin.js";
import { db } from "../db/client.js";
import { annotations, comments, projects } from "../db/schema.js";
import { recordEvent } from "../events.js";
import { serializeAnnotation, serializeComment } from "../serialize.js";

const CreateCommentInput = z.object({
  authorName: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
});

const CreateProjectInput = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).optional(),
});

function isValidAdminToken(provided: string | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Bootstrap de projetos em produção, onde não há acesso a shell/exec no container
 * (Easypanel não expõe isso via MCP). Protegida por ADMIN_TOKEN — um segredo à parte
 * dos tokens de projeto, que só quem administra a infraestrutura possui.
 */
export default async function adminRoutes(app: FastifyInstance) {
  app.get("/api/v1/admin/projects", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const rows = await db
      .select({ id: projects.id, name: projects.name, slug: projects.slug, createdAt: projects.createdAt })
      .from(projects)
      .orderBy(desc(projects.createdAt));
    return { projects: rows };
  });

  // Visão de admin sobre QUALQUER projeto, sem precisar do access token específico dele —
  // útil pra diagnosticar "chegou ou não" sem ter que caçar qual token é de qual projeto.
  app.get("/api/v1/admin/projects/:slug/annotations", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const { slug } = req.params as { slug: string };
    const query = req.query as { status?: string };

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) return reply.code(404).send({ error: "project_not_found" });

    const conditions = [eq(annotations.projectId, project.id)];
    if (query.status) conditions.push(eq(annotations.status, query.status as never));

    const rows = await db
      .select()
      .from(annotations)
      .where(and(...conditions))
      .orderBy(desc(annotations.createdAt))
      .limit(50);

    return { project: { id: project.id, name: project.name, slug: project.slug }, annotations: rows.map(serializeAnnotation) };
  });

  app.get("/api/v1/admin/projects/:slug/annotations/:id", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const { slug, id } = req.params as { slug: string; id: string };
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) return reply.code(404).send({ error: "project_not_found" });

    const [row] = await db
      .select()
      .from(annotations)
      .where(and(eq(annotations.id, id), eq(annotations.projectId, project.id)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "not_found" });

    const commentRows = await db
      .select()
      .from(comments)
      .where(eq(comments.annotationId, id))
      .orderBy(comments.createdAt);

    return { ...serializeAnnotation(row), comments: commentRows.map(serializeComment) };
  });

  app.patch("/api/v1/admin/projects/:slug/annotations/:id", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const { slug, id } = req.params as { slug: string; id: string };
    const parsed = UpdateAnnotationInput.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
    }
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) return reply.code(404).send({ error: "project_not_found" });

    const [existing] = await db
      .select()
      .from(annotations)
      .where(and(eq(annotations.id, id), eq(annotations.projectId, project.id)))
      .limit(1);
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const input = parsed.data;
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
        projectId: project.id,
        annotationId: row.id,
        type: "annotation.status_changed",
        payload: { annotation: serialized, previousStatus: existing.status },
      });
    }
    return serialized;
  });

  app.post("/api/v1/admin/projects/:slug/annotations/:id/comments", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const { slug, id } = req.params as { slug: string; id: string };
    const parsed = CreateCommentInput.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
    }
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) return reply.code(404).send({ error: "project_not_found" });

    const [annotation] = await db
      .select({ id: annotations.id })
      .from(annotations)
      .where(and(eq(annotations.id, id), eq(annotations.projectId, project.id)))
      .limit(1);
    if (!annotation) return reply.code(404).send({ error: "not_found" });

    const [row] = await db
      .insert(comments)
      .values({ annotationId: id, authorName: parsed.data.authorName, authorKind: "human", body: parsed.data.body })
      .returning();

    const serialized = serializeComment(row);
    await recordEvent({
      projectId: project.id,
      annotationId: id,
      type: "comment.created",
      payload: { comment: serialized },
    });

    return reply.code(201).send(serialized);
  });

  // Exclusão real (cascade via FK) — só dispara quando o USUÁRIO clica no botão da UI,
  // nunca chamada automaticamente por um agente de IA.
  app.delete("/api/v1/admin/projects/:slug", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const { slug } = req.params as { slug: string };
    const [deleted] = await db.delete(projects).where(eq(projects.slug, slug)).returning();
    if (!deleted) return reply.code(404).send({ error: "project_not_found" });
    return { deleted: true, slug };
  });

  // Reexibe os tokens ATIVOS a qualquer momento — pra conectar mais uma ferramenta
  // (Cursor, Lovable) sem regenerar e sem derrubar quem já está usando o token atual.
  // Tokens criados antes desta rota existir (só hash salvo) voltam null — precisam
  // de um "Gerar novo link" uma vez pra passar a ficar recuperáveis daqui pra frente.
  app.get("/api/v1/admin/projects/:slug/config", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const { slug } = req.params as { slug: string };
    const result = await getActiveTokensForProject(slug);
    if (!result) return reply.code(404).send({ error: "project_not_found" });
    return {
      project: { id: result.project.id, name: result.project.name, slug: result.project.slug },
      widgetToken: result.widgetToken,
      accessToken: result.accessToken,
    };
  });

  // Gera um par de tokens novo pra um projeto existente (revoga os antigos), sem apagar
  // nada — resolve "perdi o token e agora preciso excluir o projeto inteiro pra recomeçar".
  app.post("/api/v1/admin/projects/:slug/regenerate-tokens", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const { slug } = req.params as { slug: string };
    const result = await regenerateTokensForProject(slug);
    if (!result) return reply.code(404).send({ error: "project_not_found" });
    return {
      project: { id: result.project.id, name: result.project.name, slug: result.project.slug },
      widgetToken: result.widgetToken,
      accessToken: result.accessToken,
    };
  });

  app.post("/api/v1/admin/projects", async (req, reply) => {
    if (!isValidAdminToken(req.headers["x-admin-token"] as string | undefined)) {
      return reply.code(401).send({ error: "invalid_admin_token" });
    }
    const parsed = CreateProjectInput.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
    }
    const { project, widgetToken, accessToken } = await createProjectWithTokens(
      parsed.data.name,
      parsed.data.slug,
    );
    return reply.code(201).send({
      project: { id: project.id, name: project.name, slug: project.slug },
      widgetToken,
      accessToken,
    });
  });
}
