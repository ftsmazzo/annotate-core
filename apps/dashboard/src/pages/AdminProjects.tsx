import { useEffect, useState } from "react";
import {
  createProject,
  deleteProject,
  getAdminToken,
  listProjects,
  regenerateTokens,
  setAdminToken,
  type CreatedProject,
  type ProjectSummary,
} from "../adminApi.js";
import PencilMark from "../components/PencilMark.js";

const origin = () => window.location.origin;

function ProjectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function AdminProjects() {
  const [tokenInput, setTokenInput] = useState(getAdminToken());
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [newName, setNewName] = useState("");
  const [created, setCreated] = useState<CreatedProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ slug: string; name: string } | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

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

  function handleLogout() {
    setAdminToken("");
    setAuthed(false);
    setProjects(null);
  }

  async function confirmDelete() {
    if (!confirmTarget) return;
    setBusySlug(confirmTarget.slug);
    setError("");
    try {
      await deleteProject(confirmTarget.slug);
      setConfirmTarget(null);
      loadProjects();
    } catch {
      setError(`Falha ao excluir "${confirmTarget.name}".`);
    } finally {
      setBusySlug(null);
    }
  }

  async function handleRegenerate(slug: string) {
    setBusySlug(slug);
    setError("");
    try {
      const result = await regenerateTokens(slug);
      setCreated(result);
    } catch {
      setError("Falha ao gerar novo token — o projeto ainda existe, só tente de novo.");
    } finally {
      setBusySlug(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await createProject(newName.trim());
      setCreated(result);
      setNewName("");
      setShowCreateForm(false);
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
          <div className="mark">
            <PencilMark size={22} />
          </div>
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
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/admin" className="brand">
          <span className="mark">
            <PencilMark size={15} />
          </span>
          Annotate
        </a>
        <nav>
          <a className="navlink active">
            <ProjectIcon /> Projetos
          </a>
        </nav>
        <button className="signout" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <main className="main">
        <h1>Seus projetos</h1>
        <p className="subtitle">Cada projeto tem seu próprio widget, extensão e servidor MCP.</p>

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="value">{projects?.length ?? 0}</div>
            <div className="label">Projetos ativos</div>
          </div>
        </div>

        <div className="section-head">
          <h2>Projetos existentes</h2>
          <button className="btn-primary" onClick={() => setShowCreateForm((v) => !v)}>
            {showCreateForm ? "Cancelar" : "+ Novo projeto"}
          </button>
        </div>

        {showCreateForm && (
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="admin-token-row">
              <input
                placeholder="Nome do projeto (ex: Meu Site)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? "Criando…" : "Criar projeto"}
              </button>
            </div>
          </div>
        )}

        {created && (
          <div className="created-box">
            <h3>
              {created.project.name} — link e token prontos ✓
            </h3>
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
            <button onClick={() => setCreated(null)} style={{ background: "transparent", border: "1px solid var(--border)", marginTop: 10 }}>
              Fechar
            </button>
          </div>
        )}

        {projects?.length === 0 && (
          <div className="empty-state">Nenhum projeto ainda — clique em "+ Novo projeto".</div>
        )}
        <div className="project-grid">
          {projects?.map((p) => (
            <div className="project-card" key={p.id}>
              <div className="info">
                <div className="icon">
                  <ProjectIcon />
                </div>
                <div>
                  <div className="name">{p.name}</div>
                  <div className="slug">{p.slug}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <a className="open-link" href={`/admin/p/${p.slug}`}>
                  Ver anotações
                </a>
                <button
                  onClick={() => handleRegenerate(p.slug)}
                  disabled={busySlug === p.slug}
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--primary)", padding: "6px 12px", fontSize: 12.5 }}
                >
                  {busySlug === p.slug ? "Gerando…" : "Gerar novo link"}
                </button>
                <button
                  onClick={() => setConfirmTarget({ slug: p.slug, name: p.name })}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--danger)",
                    padding: "6px 12px",
                    fontSize: 12.5,
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {confirmTarget && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15,17,23,.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
        >
          <div className="card" style={{ maxWidth: 380, boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Excluir "{confirmTarget.name}"?</h3>
            <p className="hint">
              O projeto <code>{confirmTarget.slug}</code> e todas as anotações dele somem — sem
              volta.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmTarget(null)}
                style={{ background: "transparent", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={busySlug === confirmTarget.slug}
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                {busySlug === confirmTarget.slug ? "Excluindo…" : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
