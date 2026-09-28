import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/client.js";
import { projects, projectTokens } from "./db/schema.js";
import { hashToken, tokenPrefix } from "./plugins/auth.js";

function genToken(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function insertTokenPair(projectId: string) {
  const widgetToken = genToken("atn_w");
  const accessToken = genToken("atn_a");

  await db.insert(projectTokens).values([
    {
      projectId,
      tokenHash: hashToken(widgetToken),
      tokenPrefix: tokenPrefix(widgetToken),
      kind: "widget",
      label: "widget público (embutido no site)",
    },
    {
      projectId,
      tokenHash: hashToken(accessToken),
      tokenPrefix: tokenPrefix(accessToken),
      kind: "access",
      label: "acesso do time + agentes (MCP/REST)",
    },
  ]);

  return { widgetToken, accessToken };
}

/**
 * Cria um projeto novo + os dois tokens (widget/access). Usado tanto pelo script de CLI
 * (dev local) quanto pela rota administrativa (produção, sem acesso a shell no container).
 */
export async function createProjectWithTokens(name: string, slugArg?: string) {
  const slug = slugArg ?? slugify(name);
  const [project] = await db.insert(projects).values({ name, slug }).returning();
  const { widgetToken, accessToken } = await insertTokenPair(project.id);
  return { project, widgetToken, accessToken };
}

/**
 * Os tokens só são exibidos uma vez na criação (hash no banco, sem volta). Sem isso, perder
 * o token forçava excluir o projeto inteiro (e as anotações junto) só pra recomeçar — essa
 * função revoga os tokens antigos e gera um par novo, sem tocar no projeto/anotações.
 */
export async function regenerateTokensForProject(slug: string) {
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  if (!project) return null;

  await db
    .update(projectTokens)
    .set({ revokedAt: new Date() })
    .where(eq(projectTokens.projectId, project.id));

  const { widgetToken, accessToken } = await insertTokenPair(project.id);
  return { project, widgetToken, accessToken };
}
