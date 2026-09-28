import { useEffect, useState } from "react";
import {
  createProject,
  getAdminToken,
  listProjects,
  setAdminToken,
  type CreatedProject,
  type ProjectSummary,
} from "../adminApi.js";

const origin = () => window.location.origin;

export default function AdminProjects() {
  const [tokenInput, setTokenInput] = useState(getAdminToken());
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [newName, setNewName] = useState("");
  const [created, setCreated] = useState<CreatedProject | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    setError("");
    try {
      const res = await listProjects();
      setProjects(res.projects);
      setAuthed(true);
    } catch {
      setError("Token administrativo inválido.");
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    const existing = getAdminToken();
    if (existing) loadProjects();
    else setChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin() {
    setAdminToken(tokenInput);
    setChecking(true);
    loadProjects();
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await createProject(newName.trim());
      setCreated(result);
      setNewName("");
      loadProjects();
    } catch {
      setError("Falha ao criar projeto.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="empty-state">Carregando…</div>;
  }

  if (!authed) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="mark">✎</div>
          <h1>Annotate</h1>
          <p>Entre com o token administrativo do servidor pra gerenciar seus projetos.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <input
              type="password"
              placeholder="ADMIN_TOKEN"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              autoFocus
            />
            <button className="btn-primary" type="submit">
              Entrar
            </button>
          </form>
          {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
          <p className="hint" style={{ marginTop: 16 }}>
            Fica só no seu navegador (localStorage) — nunca é enviado a mais nada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="mark">✎</span> Annotate
        </div>
        <div className="spacer" />
        <button
          onClick={() => {
            setAdminToken("");
            setAuthed(false);
            setProjects(null);
          }}
          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Sair
        </button>
      </div>

      <div className="page">
        <h1>Seus projetos</h1>

        <h2>Novo projeto</h2>
        <div className="card">
          <div className="admin-token-row">
            <input
              placeholder="Nome do projeto (ex: Meu Site)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button className="btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? "Criando…" : "Criar projeto"}
            </button>
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>

        {created && (
          <div className="created-box">
            <h3>Projeto "{created.project.name}" criado ✓</h3>
            <p className="hint">Guarde esta tela — o token de acesso não é reexibido depois.</p>

            <p>
              <strong>1. Link do painel</strong> (mande pro time):
            </p>
            <pre>{`${origin()}/p/${created.project.slug}?t=${created.accessToken}`}</pre>

            <p>
              <strong>2. Link de instalação da extensão</strong> — manda pro time, tem passo a
              passo e o token já preenchido:
            </p>
            <pre>{`${origin()}/install?token=${created.widgetToken}&endpoint=${encodeURIComponent(origin())}&accessToken=${created.accessToken}&slug=${created.project.slug}`}</pre>

            <p>
              <strong>3. Alternativa: widget fixo no site</strong> — só se quiser o lápis sempre
              visível pra quem visita, sem precisar de extensão:
            </p>
            <pre>{`<script src="${origin()}/widget.js" data-project="${created.widgetToken}" data-endpoint="${origin()}" async></script>`}</pre>

            <p>
              <strong>4. Conectar no Claude Code</strong> (Cursor aceita o mesmo formato de servidor MCP remoto):
            </p>
            <pre>{`claude mcp add --transport http annotate-${created.project.slug} ${origin()}/mcp -H "Authorization: Bearer ${created.accessToken}" -s user`}</pre>
          </div>
        )}

        <h2>Projetos existentes</h2>
        {projects?.length === 0 && <p className="hint">Nenhum projeto ainda.</p>}
        <div className="project-grid">
          {projects?.map((p) => (
            <div className="project-card" key={p.id}>
              <div>
                <div className="name">{p.name}</div>
                <div className="slug">{p.slug}</div>
              </div>
              <a className="open-link" href={`/install?slug=${p.slug}`}>
                Configurar →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
