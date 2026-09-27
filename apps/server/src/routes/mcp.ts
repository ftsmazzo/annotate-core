import type { FastifyInstance } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../mcp/tools.js";
import { requireToken } from "../plugins/auth.js";

/**
 * Servidor MCP remoto, montado em /mcp, autenticado por token de projeto (kind=access).
 * Stateless: cada request cria server+transport novos, presos ao projectId do token —
 * evita ter que gerenciar sessões MCP de longa duração no servidor.
 */
export default async function mcpRoutes(app: FastifyInstance) {
  app.all("/mcp", { preHandler: requireToken("access") }, async (req, reply) => {
    const server = createMcpServer(req.projectId!);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    reply.raw.on("close", () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
    reply.hijack();
  });
}
