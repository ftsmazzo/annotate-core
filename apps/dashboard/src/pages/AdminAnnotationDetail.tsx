import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addCommentAsAdmin,
  getAnnotationAsAdmin,
  updateAnnotationStatusAsAdmin,
} from "../adminAnnotationsApi.js";
import type { Annotation, Comment } from "../api.js";
import PencilMark from "../components/PencilMark.js";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  resolved: "Resolvida",
  wont_fix: "Não vai corrigir",
  archived: "Arquivada",
};

export default function AdminAnnotationDetail() {
  const { slug, id } = useParams();
  const [annotation, setAnnotation] = useState<(Annotation & { comments: Comment[] }) | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    if (slug && id) getAnnotationAsAdmin(slug, id).then(setAnnotation);
  }, [slug, id]);

  if (!annotation) return <div className="empty-state">Carregando…</div>;

  async function handleStatusChange(status: string) {
    if (!slug || !id) return;
    const updated = await updateAnnotationStatusAsAdmin(slug, id, status);
    setAnnotation((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  async function handleComment() {
    if (!slug || !id || !commentBody.trim()) return;
    await addCommentAsAdmin(slug, id, commentBody.trim(), authorName.trim() || "admin");
    setCommentBody("");
    const fresh = await getAnnotationAsAdmin(slug, id);
    setAnnotation(fresh);
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
        <Link to={`/admin/p/${slug}`} className="hint">
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

          {annotation.screenshotUrl && (
            <img
              src={annotation.screenshotUrl}
              alt="Screenshot da página no momento do report"
              style={{ maxWidth: "100%", borderRadius: 10, border: "1px solid var(--border)", marginTop: 14 }}
            />
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
          {annotation.comments?.length === 0 && <p className="hint">Nenhum comentário ainda.</p>}
          {annotation.comments?.map((c) => (
            <div key={c.id} style={{ marginBottom: 10, fontSize: 13.5 }}>
              <strong>{c.authorName}</strong> <span className="hint">({c.authorKind === "agent" ? "IA" : "time"})</span>
              <p style={{ margin: "4px 0 0" }}>{c.body}</p>
            </div>
          ))}
          <div className="comment-form" style={{ marginTop: 14 }}>
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
