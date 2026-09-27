import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createProjectWithTokens } from "../admin.js";

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
