import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { addComment, getAnnotation, updateAnnotationStatus, type Annotation } from "../api.js";

export default function AnnotationDetail() {
  const { slug, id } = useParams();
  const location = useLocation();
  const [annotation, setAnnotation] = useState<Annotation | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    if (id) getAnnotation(id).then(setAnnotation);
  }, [id]);

  if (!annotation) return <p>Carregando…</p>;

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
    <div className="page">
      <Link to={`/p/${slug}${location.search}`}>&larr; Voltar</Link>
      <h1>{annotation.message}</h1>
      <p className="annotation-meta">
        {annotation.url} · <code>{annotation.selector}</code>
      </p>

      <div className="status-row">
        Status: <strong>{annotation.status}</strong>
        {["pending", "in_progress", "resolved", "wont_fix"].map((s) => (
          <button key={s} onClick={() => handleStatusChange(s)} disabled={s === annotation.status}>
            {s}
          </button>
        ))}
      </div>

      {annotation.resolvedSummary && (
        <div className="resolved-box">
          <strong>Resolvido por {annotation.resolvedBy}:</strong> {annotation.resolvedSummary}
        </div>
      )}

      {annotation.elementTextSnippet && (
        <details>
          <summary>Texto do elemento</summary>
          <p>{annotation.elementTextSnippet}</p>
        </details>
      )}

      {annotation.computedStyles && (
        <details>
          <summary>Estilos computados</summary>
          <pre>{JSON.stringify(annotation.computedStyles, null, 2)}</pre>
        </details>
      )}

      <div className="comment-form">
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
        <button onClick={handleComment}>Comentar</button>
      </div>
    </div>
  );
}
