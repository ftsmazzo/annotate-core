import { createProjectWithTokens } from "../admin.js";

// Bootstrap de projeto para uso local/dev (com shell). Em produção (sem exec no container),
// use a rota POST /api/v1/admin/projects (ver apps/server/src/routes/admin.ts).
// Uso: pnpm --filter server exec tsx src/scripts/create-project.ts "Meu Site" meu-site

const [name, slugArg] = process.argv.slice(2);
if (!name) {
  console.error('Uso: tsx src/scripts/create-project.ts "Nome do Projeto" [slug]');
  process.exit(1);
}

const { project, widgetToken, accessToken } = await createProjectWithTokens(name, slugArg);

console.log(`Projeto criado: ${project.name} (${project.slug})\n`);
console.log("Tag do widget para embutir no site:");
console.log(
  `<script src="\${APP_BASE_URL}/widget.js" data-project="${widgetToken}" data-endpoint="\${APP_BASE_URL}" async></script>\n`,
);
console.log("Token de acesso (link do time + MCP/REST) — guarde, não é reexibido:");
console.log(accessToken);
console.log(`\nLink do painel: \${APP_BASE_URL}/p/${project.slug}?t=${accessToken}`);
process.exit(0);
