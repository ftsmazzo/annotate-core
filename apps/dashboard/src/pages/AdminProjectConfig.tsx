import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProjectConfig, regenerateTokens, type ProjectConfig } from "../adminApi.js";
import PencilMark from "../components/PencilMark.js";

const origin = () => window.location.origin;

export default function AdminProjectConfig() {
  const { slug } = useParams();
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  function load() {
    if (!slug) return;
    setError("");
    getProjectConfig(slug)
      .then(setConfig)
      .catch(() => setError("Falha ao carregar configuração."));
  }

  useEffect(load, [slug]);

  async function handleRegenerate() {
    if (!slug) return;
    setRegenerating(true);
    setError("");
    try {
      const result = await regenerateTokens(slug);
      setConfig({ project: result.project, widgetToken: result.widgetToken, accessToken: result.accessToken });
    } catch {
      setError("Falha ao gerar novo token.");
    } finally {
      setRegenerating(false);
    }
  }

  if (!config) {
    return <div className="empty-state">{error || "Carregando…"}</div>;
  }

  const { widgetToken, accessToken } = config;
  const hasTokens = widgetToken && accessToken;

  return (
    <div>
      <div className="topbar">
        <a href="/admin" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="mark">
            <PencilMark size={14} />
          </span>
          Annotate
        </a>
        <div className="spacer" />
        <span className="project-name">{slug}</span>
      </div>

      <div className="page">
        <Link to="/admin" className="hint">
          &larr; Todos os projetos
        </Link>
        <h1 style={{ marginTop: 10 }}>Configurações — {config.project.name}</h1>
        <p className="subtitle">
          Veja isso sempre que precisar conectar mais uma ferramenta (Cursor, Lovable, outro
          navegador) — ver aqui não invalida nada que já está conectado.
        </p>

        {error && <p className="error-text">{error}</p>}

        {!hasTokens && (
          <div className="card">
            <p>
              Esse projeto foi criado antes dessa tela existir, então o token não ficou salvo de
              forma recuperável — só dá pra gerar um novo (isso vai desconectar quem já estiver
              usando o token antigo, uma única vez).
            </p>
            <button className="btn-primary" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? "Gerando…" : "Gerar token pela primeira vez"}
            </button>
          </div>
        )}

        {hasTokens && (
          <div className="created-box">
            <p>
              <strong>1. Link do painel</strong> (mande pro time):
            </p>
            <pre>{`${origin()}/p/${config.project.slug}?t=${accessToken}`}</pre>

            <p>
              <strong>2. Link de instalação da extensão</strong>:
            </p>
            <pre>{`${origin()}/install?token=${widgetToken}&endpoint=${encodeURIComponent(origin())}&accessToken=${accessToken}&slug=${config.project.slug}`}</pre>

            <p>
              <strong>3. Widget fixo no site</strong> (cole antes do <code>&lt;/body&gt;</code>):
            </p>
            <pre>{`<script src="${origin()}/widget.js" data-project="${widgetToken}" data-endpoint="${origin()}" async></script>`}</pre>

            <p>
              <strong>4. Conectar no Claude Code</strong> (terminal, roda uma vez):
            </p>
            <pre>{`claude mcp add --transport http annotate-${config.project.slug} ${origin()}/mcp -H "Authorization: Bearer ${accessToken}" -s user`}</pre>

            <p>
              <strong>5. Conectar no Cursor</strong> — cole em <code>Settings → MCP → Add new
              MCP server</code>:
            </p>
            <pre>{`{
  "mcpServers": {
    "annotate-${config.project.slug}": {
      "url": "${origin()}/mcp",
      "headers": { "Authorization": "Bearer ${accessToken}" }
    }
  }
}`}</pre>

            <p>
              <strong>6. Conectar no Lovable</strong> — no chat do projeto, adicione um "chat
              connector" customizado com a URL:
            </p>
            <pre>{`${origin()}/mcp`}</pre>
            <p className="hint">
              O Lovable pede autenticação OAuth por padrão — se pedir um header manual em vez
              disso, use <code>Authorization: Bearer {accessToken}</code>.
            </p>
          </div>
        )}

        {hasTokens && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--danger)", marginTop: 10 }}
          >
            {regenerating ? "Gerando…" : "Revogar e gerar token novo"}
          </button>
        )}
      </div>
    </div>
  );
}
