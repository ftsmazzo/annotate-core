import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProjectConfig, regenerateTokens, type ProjectConfig } from "../adminApi.js";
import PencilMark from "../components/PencilMark.js";

const origin = () => window.location.origin;

const LOVABLE_DESCRIPTION =
  "Ver, listar e resolver bugs visuais (anotações) reportados pelo time direto nas páginas do site.";

const LOVABLE_KNOWLEDGE_DESCRIPTION =
  "Use quando o usuário pedir pra ver, listar ou resolver bugs visuais reportados pelo time (annotations).";

const LOVABLE_KNOWLEDGE_CONTENT = `API de anotações visuais (bugs de layout reportados pelo time). Autenticação já é feita pelo conector — nunca inclua header Authorization manualmente aqui.

Listar anotações pendentes:
GET /api/v1/annotations?status=pending
Outros valores de status: in_progress, resolved, wont_fix, archived
Resposta: { "annotations": [ { id, status, message, url, selector, domPath, computedStyles, boundingBox, screenshotUrl, elementTextSnippet, resolvedSummary, resolvedBy, createdAt } ] }

Ver uma anotação específica:
GET /api/v1/annotations/{id}

Marcar como resolvida depois de corrigir o bug:
PATCH /api/v1/annotations/{id}
Body: { "status": "resolved", "resolvedSummary": "o que foi corrigido", "resolvedBy": "lovable" }

Comentar numa anotação sem mudar status:
POST /api/v1/annotations/{id}/comments
Body: { "authorName": "lovable", "authorKind": "agent", "body": "texto do comentário" }

Cada anotação representa um elemento específico de uma página (selector é o seletor CSS único do elemento, url é a página onde foi reportado, screenshotUrl é uma imagem da página no momento do report, se disponível). Use selector + domPath + elementTextSnippet pra localizar o componente/arquivo certo no código do projeto Lovable.`;

function CopyField({
  label,
  value,
  fieldKey,
  copiedKey,
  onCopy,
  multiline,
}: {
  label: string;
  value: string;
  fieldKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  multiline?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
        <button onClick={() => onCopy(value, fieldKey)} style={{ padding: "3px 10px", fontSize: 11.5 }}>
          {copiedKey === fieldKey ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
      <pre style={multiline ? { whiteSpace: "pre-wrap" } : undefined}>{value}</pre>
    </div>
  );
}

export default function AdminProjectConfig() {
  const { slug } = useParams();
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function load() {
    if (!slug) return;
    setError("");
    getProjectConfig(slug)
      .then(setConfig)
      .catch(() => setError("Falha ao carregar configuração."));
  }

  useEffect(load, [slug]);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

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
            <CopyField
              label="Link"
              value={`${origin()}/p/${config.project.slug}?t=${accessToken}`}
              fieldKey="painel"
              copiedKey={copiedKey}
              onCopy={copy}
            />

            <p>
              <strong>2. Link de instalação da extensão</strong>:
            </p>
            <CopyField
              label="Link"
              value={`${origin()}/install?token=${widgetToken}&endpoint=${encodeURIComponent(origin())}&accessToken=${accessToken}&slug=${config.project.slug}`}
              fieldKey="install"
              copiedKey={copiedKey}
              onCopy={copy}
            />

            <p>
              <strong>3. Widget fixo no site</strong> (cole antes do <code>&lt;/body&gt;</code>):
            </p>
            <CopyField
              label="Tag"
              value={`<script src="${origin()}/widget.js" data-project="${widgetToken}" data-endpoint="${origin()}" async></script>`}
              fieldKey="widget-tag"
              copiedKey={copiedKey}
              onCopy={copy}
            />

            <p>
              <strong>4. Conectar no Claude Code</strong> (terminal, roda uma vez):
            </p>
            <CopyField
              label="Comando"
              value={`claude mcp add --transport http annotate-${config.project.slug} ${origin()}/mcp -H "Authorization: Bearer ${accessToken}" -s user`}
              fieldKey="claude-cmd"
              copiedKey={copiedKey}
              onCopy={copy}
            />

            <p>
              <strong>5. Conectar no Cursor</strong> — cole em <code>Settings → MCP → Add new
              MCP server</code>:
            </p>
            <CopyField
              label="Config JSON"
              value={`{\n  "mcpServers": {\n    "annotate-${config.project.slug}": {\n      "url": "${origin()}/mcp",\n      "headers": { "Authorization": "Bearer ${accessToken}" }\n    }\n  }\n}`}
              fieldKey="cursor-json"
              copiedKey={copiedKey}
              onCopy={copy}
              multiline
            />

            <p>
              <strong>6. Conectar no Lovable</strong> — em <code>Conectores → Novo → Custom
              connector</code>, preenche campo por campo (nomes exatos da tela do Lovable):
            </p>

            <p className="hint" style={{ marginTop: 12, fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>
              Details
            </p>
            <CopyField label="Display name" value="Annotate" fieldKey="lov-name" copiedKey={copiedKey} onCopy={copy} />
            <CopyField
              label="Short description"
              value="Reportar e resolver bugs visuais"
              fieldKey="lov-short"
              copiedKey={copiedKey}
              onCopy={copy}
            />
            <CopyField
              label="Description"
              value={LOVABLE_DESCRIPTION}
              fieldKey="lov-desc"
              copiedKey={copiedKey}
              onCopy={copy}
            />
            <p className="hint">Category: selecione "Productivity" no dropdown (sem texto pra copiar).</p>

            <p className="hint" style={{ marginTop: 16, fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>
              Authentication
            </p>
            <p className="hint">Method: selecione "Bearer token" no dropdown.</p>
            <CopyField
              label="Credential label"
              value="Access Token"
              fieldKey="lov-cred-label"
              copiedKey={copiedKey}
              onCopy={copy}
            />
            <CopyField
              label="API base URL"
              value={origin()}
              fieldKey="lov-base-url"
              copiedKey={copiedKey}
              onCopy={copy}
            />
            <p className="hint">Test request → Method: selecione "GET" no dropdown.</p>
            <CopyField
              label="Test request → Path"
              value="/api/v1/annotations?status=pending"
              fieldKey="lov-test-path"
              copiedKey={copiedKey}
              onCopy={copy}
            />

            <p className="hint" style={{ marginTop: 16, fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>
              Agent knowledge → Add knowledge file
            </p>
            <CopyField label="Name" value="annotate-usage" fieldKey="lov-know-name" copiedKey={copiedKey} onCopy={copy} />
            <CopyField
              label="Description"
              value={LOVABLE_KNOWLEDGE_DESCRIPTION}
              fieldKey="lov-know-desc"
              copiedKey={copiedKey}
              onCopy={copy}
            />
            <CopyField
              label="Content"
              value={LOVABLE_KNOWLEDGE_CONTENT}
              fieldKey="lov-know-content"
              copiedKey={copiedKey}
              onCopy={copy}
              multiline
            />

            <p className="hint" style={{ marginTop: 16, fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>
              Ao conectar (credencial pedida na hora de usar)
            </p>
            <CopyField
              label="Access Token"
              value={accessToken}
              fieldKey="lov-credential-value"
              copiedKey={copiedKey}
              onCopy={copy}
            />
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
