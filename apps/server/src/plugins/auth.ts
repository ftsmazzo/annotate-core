import { createHash } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { projectTokens } from "../db/schema.js";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenPrefix(token: string): string {
  return token.slice(0, 12);
}

declare module "fastify" {
  interface FastifyRequest {
    projectId?: string;
    tokenKind?: "widget" | "access";
  }
}

async function resolveToken(rawToken: string, kind: "widget" | "access") {
  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select({ projectId: projectTokens.projectId, id: projectTokens.id })
    .from(projectTokens)
    .where(
      and(
        eq(projectTokens.tokenHash, tokenHash),
        eq(projectTokens.kind, kind),
        isNull(projectTokens.revokedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

function extractBearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  const header2 = req.headers["x-annotate-token"];
  if (typeof header2 === "string") return header2;
  return null;
}

/** Middleware factory: exige um token do tipo informado, popula req.projectId. */
export function requireToken(kind: "widget" | "access") {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const raw = extractBearer(req);
    if (!raw) {
      return reply.code(401).send({ error: "missing_token" });
    }
    const resolved = await resolveToken(raw, kind);
    if (!resolved) {
      return reply.code(401).send({ error: "invalid_token" });
    }
    req.projectId = resolved.projectId;
    req.tokenKind = kind;
    db.update(projectTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(projectTokens.id, resolved.id))
      .catch(() => {});
  };
}
