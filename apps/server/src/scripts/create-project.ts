import { randomBytes } from "node:crypto";
import { db } from "../db/client.js";
import { projects, projectTokens } from "../db/schema.js";
import { hashToken, tokenPrefix } from "../plugins/auth.js";

// Bootstrap de projeto: não existe UI de criação de projeto na v1 (sem contas de usuário),
// então isso roda uma vez por projeto novo, direto no ambiente onde o server está deployado.
// Uso: pnpm --filter server exec tsx src/scripts/create-project.ts "Meu Site" meu-site

const [name, slugArg] = process.argv.slice(2);
if (!name) {
  console.error('Uso: tsx src/scripts/create-project.ts "Nome do Projeto" [slug]');
  process.exit(1);
}
const slug = slugArg ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const [project] = await db.insert(projects).values({ name, slug }).returning();

function genToken(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

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

console.log(`Projeto criado: ${project.name} (${project.slug})\n`);
console.log("Tag do widget para embutir no site:");
console.log(
  `<script src="\${APP_BASE_URL}/widget.js" data-project="${widgetToken}" data-endpoint="\${APP_BASE_URL}" async></script>\n`,
);
console.log("Token de acesso (link do time + MCP/REST) — guarde, não é reexibido:");
console.log(accessToken);
console.log(`\nLink do painel: \${APP_BASE_URL}/p/${project.slug}?t=${accessToken}`);
process.exit(0);
