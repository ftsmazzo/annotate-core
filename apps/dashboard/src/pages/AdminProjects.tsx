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
  const [token, setToken] = useState(getAdminToken());
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [created, setCreated] = useState<CreatedProject | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    setError("");
    try {
      const res = await listProjects();
      setProjects(res.projects);
    } catch {
      setError("Token inválido ou servidor indisponível.");
      setProjects(null);
    }
  }

  useEffect(() => {
    if (token) loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaveToken() {
    setAdminToken(token);
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
      setError("Falha ao criar projeto — confira o token administrativo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Administração — annotate-core</h1>

      <details open={!token}>
        <summary>Token administrativo (ADMIN_TOKEN do servidor)</summary>
        <div className="admin-token-row">
          <input
            type="password"
            placeholder="Cole o ADMIN_TOKEN aqui"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button onClick={handleSaveToken}>Salvar e carregar</button>
        </div>
        <p className="hint">Fica só no seu navegador (localStorage), nunca sai daqui.</p>
      </details>

      {error && <p className="error-text">{error}</p>}

      <h2>Novo projeto</h2>
      <div className="admin-token-row">
        <input
          placeholder="Nome do projeto (ex: Meu Site)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={handleCreate} disabled={loading}>
          {loading ? "Criando…" : "Criar projeto"}
        </button>
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
            <strong>2. Widget</strong> — cole isso na página que você quer corrigir (antes do{" "}
            <code>&lt;/body&gt;</code>, funciona em qualquer stack):
          </p>
          <pre>{`<script src="${origin()}/widget.js" data-project="${created.widgetToken}" data-endpoint="${origin()}" async></script>`}</pre>

          <p>
            <strong>3. Conectar no Claude Code</strong> (Cursor aceita o mesmo formato de servidor MCP remoto):
          </p>
          <pre>{`claude mcp add --transport http annotate-${created.project.slug} ${origin()}/mcp -H "Authorization: Bearer ${created.accessToken}"`}</pre>
        </div>
      )}

      <h2>Projetos existentes</h2>
      {projects === null && <p className="hint">Informe o token acima pra ver a lista.</p>}
      {projects?.length === 0 && <p className="hint">Nenhum projeto ainda.</p>}
      <ul className="annotation-list">
        {projects?.map((p) => (
          <li key={p.id}>
            <div className="admin-project-row">
              <div>
                <div className="annotation-message">{p.name}</div>
                <div className="annotation-meta">slug: {p.slug}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
