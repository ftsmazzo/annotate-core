import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { addComment, getAnnotation, updateAnnotationStatus, type Annotation } from "../api.js";
import PencilMark from "../components/PencilMark.js";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  resolved: "Resolvida",
  wont_fix: "Não vai corrigir",
  archived: "Arquivada",
};

export default function AnnotationDetail() {
  const { slug, id } = useParams();
  const location = useLocation();
  const [annotation, setAnnotation] = useState<Annotation | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    if (id) getAnnotation(id).then(setAnnotation);
  }, [id]);

  if (!annotation) return <div className="empty-state">Carregando…</div>;

  async function handleStatusChange(status: string) {
    if (!id) return;
    setAnnotation(await updateAnnotationStatus(id, status));
  }

  async function handleComment() {
    if (!id || !commentBody.trim()) return;
    await addComment(id, commentBody.trim(), authorName.trim() || "time");
    setCommentBody("");
    setAnnotation(await getAnnotation(id));
  }

  return (
    <div>
      <div className="topbar">
        <a href={`/admin`} className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="mark">
            <PencilMark size={14} />
          </span>
          Annotate
        </a>
        <div className="spacer" />
        <span className="project-name">{slug}</span>
      </div>

      <div className="page">
        <Link to={`/p/${slug}${location.search}`} className="hint">
          &larr; Voltar
        </Link>

        <div className="card" style={{ marginTop: 14 }}>
          <span className={`tag tag-${annotation.status}`}>
            {STATUS_LABEL[annotation.status] ?? annotation.status}
          </span>
          <h1 style={{ marginTop: 10 }}>{annotation.message}</h1>
          <p className="annotation-meta">
            {annotation.url} · <code>{annotation.selector}</code>
          </p>

          <div className="status-row">
            {["pending", "in_progress", "resolved", "wont_fix"].map((s) => (
              <button key={s} onClick={() => handleStatusChange(s)} disabled={s === annotation.status}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {annotation.resolvedSummary && (
            <div className="resolved-box">
              <strong>Resolvido por {annotation.resolvedBy}:</strong> {annotation.resolvedSummary}
            </div>
          )}

          {annotation.elementTextSnippet && (
            <details style={{ marginTop: 14 }}>
              <summary className="hint">Texto do elemento</summary>
              <p>{annotation.elementTextSnippet}</p>
            </details>
          )}

          {annotation.computedStyles && (
            <details style={{ marginTop: 10 }}>
              <summary className="hint">Estilos computados</summary>
              <pre>{JSON.stringify(annotation.computedStyles, null, 2)}</pre>
            </details>
          )}
        </div>

        <h2>Comentários</h2>
        <div className="card">
          <div className="comment-form" style={{ marginTop: 0 }}>
            <input
              placeholder="Seu nome"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
            <textarea
              placeholder="Adicionar comentário…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <button className="btn-primary" onClick={handleComment}>
              Comentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
