import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { listAnnotations, type Annotation } from "../api.js";

const STATUSES = ["pending", "in_progress", "resolved", "wont_fix", "archived"];
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  resolved: "Resolvida",
  wont_fix: "Não vai corrigir",
  archived: "Arquivada",
};

export default function ProjectAnnotations() {
  const { slug } = useParams();
  const location = useLocation();
  const [status, setStatus] = useState("pending");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAnnotations(status)
      .then((res) => setAnnotations(res.annotations))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="mark">✎</span> Annotate
        </div>
        <div className="spacer" />
        <span className="project-name">{slug}</span>
      </div>

      <div className="page">
        <h1>Anotações</h1>
        <div className="tabs">
          {STATUSES.map((s) => (
            <button key={s} className={s === status ? "active" : ""} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {loading && <p className="hint">Carregando…</p>}
        {!loading && annotations.length === 0 && (
          <p className="empty-state">Nenhuma anotação {STATUS_LABEL[status].toLowerCase()} aqui.</p>
        )}

        <ul className="annotation-list">
          {annotations.map((a) => (
            <li key={a.id}>
              <Link to={`/p/${slug}/annotations/${a.id}${location.search}`}>
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
