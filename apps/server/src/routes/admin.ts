import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { createProjectWithTokens } from "../admin.js";
import { db } from "../db/client.js";
import { annotations, projects } from "../db/schema.js";
import { serializeAnnotation } from "../serialize.js";

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
