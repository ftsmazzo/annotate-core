import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { annotations, comments } from "../db/schema.js";
import { requireToken } from "../plugins/auth.js";
import { recordEvent } from "../events.js";
import { serializeComment } from "../serialize.js";

const CreateCommentInput = z.object({
  authorName: z.string().min(1).max(120),
  authorKind: z.enum(["human", "agent"]).default("human"),
  body: z.string().min(1).max(4000),
});

export default async function commentsRoutes(app: FastifyInstance) {
  app.post(
    "/api/v1/annotations/:id/comments",
    { preHandler: requireToken("access") },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = CreateCommentInput.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
      }

      const [annotation] = await db
        .select({ id: annotations.id })
        .from(annotations)
        .where(and(eq(annotations.id, id), eq(annotations.projectId, req.projectId!)))
        .limit(1);
      if (!annotation) return reply.code(404).send({ error: "not_found" });

      const [row] = await db
        .insert(comments)
        .values({ annotationId: id, ...parsed.data })
        .returning();

      const serialized = serializeComment(row);
      await recordEvent({
        projectId: req.projectId!,
        annotationId: id,
        type: "comment.created",
        payload: { comment: serialized },
      });

      return reply.code(201).send(serialized);
    },
  );
}
