import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { WebhookEventType } from "@annotate-core/shared-types";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { webhooks } from "../db/schema.js";
import { requireToken } from "../plugins/auth.js";

const CreateWebhookInput = z.object({
  url: z.string().url(),
  events: z.array(WebhookEventType).min(1).default(["annotation.created"]),
});

export default async function webhooksRoutes(app: FastifyInstance) {
  app.post("/api/v1/webhooks", { preHandler: requireToken("access") }, async (req, reply) => {
    const parsed = CreateWebhookInput.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
    }
    const secret = randomBytes(24).toString("hex");
    const [row] = await db
      .insert(webhooks)
      .values({
        projectId: req.projectId!,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
      })
      .returning();

    // O segredo só é retornado nesta resposta de criação — guardem, não fica visível depois.
    return reply.code(201).send({ id: row.id, url: row.url, events: row.events, secret });
  });

  app.get("/api/v1/webhooks", { preHandler: requireToken("access") }, async (req) => {
    const rows = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        isActive: webhooks.isActive,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(eq(webhooks.projectId, req.projectId!));
    return { webhooks: rows };
  });
}
