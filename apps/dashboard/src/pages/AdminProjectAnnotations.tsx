import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listAnnotationsAsAdmin } from "../adminAnnotationsApi.js";
import { getAdminToken } from "../adminApi.js";
import type { Annotation } from "../api.js";
import PencilMark from "../components/PencilMark.js";

const STATUSES = ["pending", "in_progress", "resolved", "wont_fix", "archived"];
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  resolved: "Resolvida",
  wont_fix: "Não vai corrigir",
  archived: "Arquivada",
};

export default function AdminProjectAnnotations() {
  const { slug } = useParams();
  const [status, setStatus] = useState("pending");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError("");
    listAnnotationsAsAdmin(slug, status)
      .then((res) => setAnnotations(res.annotations))
      .catch(() => setError("Falha ao carregar anotações."))
      .finally(() => setLoading(false));
  }, [slug, status]);

  if (!getAdminToken()) {
    return (
      <div className="empty-state">
        Sessão de admin expirada. <a href="/admin">Entrar de novo</a>
      </div>
    );
  }

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
        <h1 style={{ marginTop: 10 }}>Anotações</h1>
        <div className="tabs">
          {STATUSES.map((s) => (
            <button key={s} className={s === status ? "active" : ""} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}
        {loading && <p className="hint">Carregando…</p>}
        {!loading && !error && annotations.length === 0 && (
          <p className="empty-state">Nenhuma anotação {STATUS_LABEL[status].toLowerCase()} aqui.</p>
        )}

        <ul className="annotation-list">
          {annotations.map((a) => (
            <li key={a.id}>
              <Link to={`/admin/p/${slug}/annotations/${a.id}`}>
                <span className={`tag tag-${a.status}`} style={{ marginBottom: 8 }}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                <div className="annotation-message">{a.message}</div>
                <div className="annotation-meta">
                  {a.url} · {a.selector}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
