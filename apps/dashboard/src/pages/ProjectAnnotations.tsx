import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { listAnnotations, type Annotation } from "../api.js";

const STATUSES = ["pending", "in_progress", "resolved", "wont_fix", "archived"];

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
    <div className="page">
      <h1>{slug}</h1>
      <div className="tabs">
        {STATUSES.map((s) => (
          <button key={s} className={s === status ? "active" : ""} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>

      {loading && <p>Carregando…</p>}
      {!loading && annotations.length === 0 && <p className="empty-state">Nenhuma anotação aqui.</p>}

      <ul className="annotation-list">
        {annotations.map((a) => (
          <li key={a.id}>
            <Link to={`/p/${slug}/annotations/${a.id}${location.search}`}>
              <div className="annotation-message">{a.message}</div>
              <div className="annotation-meta">
                {a.url} · {a.selector}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
