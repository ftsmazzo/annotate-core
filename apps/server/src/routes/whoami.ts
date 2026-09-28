import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { projects } from "../db/schema.js";
import { requireToken } from "../plugins/auth.js";

/**
 * Deixa o widget/extensão mostrar "reportando pro projeto: X" antes de enviar —
 * evita mandar anotação pro projeto errado quando a pessoa tem token de mais de um.
 */
export default async function whoamiRoutes(app: FastifyInstance) {
  app.get("/api/v1/whoami", { preHandler: requireToken("widget") }, async (req, reply) => {
    const [project] = await db
      .select({ name: projects.name, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, req.projectId!))
      .limit(1);
    if (!project) return reply.code(404).send({ error: "project_not_found" });
    return project;
  });
}
