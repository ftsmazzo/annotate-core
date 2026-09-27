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
    elementTextSnippet: row.elementTextSnippet,
    metadata: row.metadata,
    resolvedSummary: row.resolvedSummary,
    resolvedBy: row.resolvedBy,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
