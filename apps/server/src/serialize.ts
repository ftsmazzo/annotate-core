import type { annotations, comments } from "./db/schema.js";

type AnnotationRow = typeof annotations.$inferSelect;
type CommentRow = typeof comments.$inferSelect;

export function serializeAnnotation(row: AnnotationRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    severity: row.severity,
    message: row.message,
    reporterName: row.reporterName,
    url: row.url,
    selector: row.selector,
    domPath: row.domPath,
    computedStyles: row.computedStyles,
    boundingBox: row.boundingBox,
    screenshotUrl: row.screenshotUrl,
    elementTextSnippet: row.elementTextSnippet,
    metadata: row.metadata,
    resolvedSummary: row.resolvedSummary,
    resolvedBy: row.resolvedBy,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Mesma coisa, mas pro texto que volta pra um agente de IA via MCP — o screenshot em
 * base64 pode passar de 100KB de texto, o que só enche o contexto do agente à toa (ele
 * não "vê" a imagem de qualquer forma num content block de texto). Troca por um indicador.
 */
export function serializeAnnotationForAgent(row: AnnotationRow) {
  const serialized = serializeAnnotation(row);
  return {
    ...serialized,
    screenshotUrl: serialized.screenshotUrl ? "[screenshot disponível — ver no painel web]" : null,
  };
}

export function serializeComment(row: CommentRow) {
  return {
    id: row.id,
    annotationId: row.annotationId,
    authorName: row.authorName,
    authorKind: row.authorKind,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}
