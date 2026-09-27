import { randomBytes } from "node:crypto";
import { db } from "./db/client.js";
import { projects, projectTokens } from "./db/schema.js";
import { hashToken, tokenPrefix } from "./plugins/auth.js";

function genToken(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Cria um projeto novo + os dois tokens (widget/access). Usado tanto pelo script de CLI
 * (dev local) quanto pela rota administrativa (produção, sem acesso a shell no container).
 */
export async function createProjectWithTokens(name: string, slugArg?: string) {
  const slug = slugArg ?? slugify(name);
  const [project] = await db.insert(projects).values({ name, slug }).returning();

  const widgetToken = genToken("atn_w");
  const accessToken = genToken("atn_a");

  await db.insert(projectTokens).values([
    {
      projectId: project.id,
      tokenHash: hashToken(widgetToken),
      tokenPrefix: tokenPrefix(widgetToken),
      kind: "widget",
      label: "widget público (embutido no site)",
    },
    {
      projectId: project.id,
      tokenHash: hashToken(accessToken),
      tokenPrefix: tokenPrefix(accessToken),
      kind: "access",
      label: "acesso do time + agentes (MCP/REST)",
    },
  ]);

  return { project, widgetToken, accessToken };
}
