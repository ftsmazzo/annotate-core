import { z } from "zod";

export const AnnotationStatus = z.enum([
  "pending",
  "in_progress",
  "resolved",
  "wont_fix",
  "archived",
]);
export type AnnotationStatus = z.infer<typeof AnnotationStatus>;

export const AnnotationSeverity = z.enum(["low", "medium", "high", "blocker"]);
export type AnnotationSeverity = z.infer<typeof AnnotationSeverity>;

export const DomPathEntry = z.object({
  tag: z.string(),
  id: z.string().nullable(),
  classes: z.array(z.string()),
  index: z.number().int().nonnegative(),
});
export type DomPathEntry = z.infer<typeof DomPathEntry>;

// Subconjunto curado de getComputedStyle() — só o que ajuda a localizar/corrigir o problema visual.
export const ComputedStyleSnapshot = z
  .object({
    display: z.string().optional(),
    position: z.string().optional(),
    top: z.string().optional(),
    left: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    margin: z.string().optional(),
    padding: z.string().optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    fontSize: z.string().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    border: z.string().optional(),
    borderRadius: z.string().optional(),
    boxShadow: z.string().optional(),
    flexDirection: z.string().optional(),
    justifyContent: z.string().optional(),
    alignItems: z.string().optional(),
    gridTemplateColumns: z.string().optional(),
    zIndex: z.string().optional(),
    opacity: z.string().optional(),
  })
  .partial();
export type ComputedStyleSnapshot = z.infer<typeof ComputedStyleSnapshot>;

export const BoundingBox = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  scrollX: z.number(),
  scrollY: z.number(),
});
export type BoundingBox = z.infer<typeof BoundingBox>;

export const AnnotationMetadata = z
  .object({
    reactComponentName: z.string().nullable().optional(),
    viewport: z.object({ width: z.number(), height: z.number() }).optional(),
    devicePixelRatio: z.number().optional(),
    userAgent: z.string().optional(),
  })
  .partial();
export type AnnotationMetadata = z.infer<typeof AnnotationMetadata>;

// Payload que o widget envia ao criar uma anotação (token de projeto tipo "widget").
export const CreateAnnotationInput = z.object({
  url: z.string().url(),
  message: z.string().min(1).max(4000),
  severity: AnnotationSeverity.optional(),
  reporterName: z.string().max(120).optional(),
  selector: z.string().min(1),
  domPath: z.array(DomPathEntry),
  computedStyles: ComputedStyleSnapshot.optional(),
  boundingBox: BoundingBox.optional(),
  elementTextSnippet: z.string().max(500).optional(),
  metadata: AnnotationMetadata.optional(),
  // Data URL (data:image/jpeg;base64,...) — só a extensão consegue capturar de verdade
  // (chrome.tabs.captureVisibleTab, API privilegiada); o widget de <script> não tem acesso
  // a isso, então fica opcional. Limite generoso o bastante pra um screenshot JPEG comprimido.
  screenshotDataUrl: z.string().max(2_000_000).optional(),
});
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationInput>;

export const Annotation = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: AnnotationStatus,
  severity: AnnotationSeverity.nullable(),
  message: z.string(),
  reporterName: z.string().nullable(),
  url: z.string(),
  selector: z.string(),
  domPath: z.array(DomPathEntry),
  computedStyles: ComputedStyleSnapshot.nullable(),
  boundingBox: BoundingBox.nullable(),
  screenshotUrl: z.string().nullable(),
  elementTextSnippet: z.string().nullable(),
  metadata: AnnotationMetadata,
  resolvedSummary: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Annotation = z.infer<typeof Annotation>;

export const Comment = z.object({
  id: z.string().uuid(),
  annotationId: z.string().uuid(),
  authorName: z.string(),
  authorKind: z.enum(["human", "agent"]),
  body: z.string(),
  createdAt: z.string(),
});
export type Comment = z.infer<typeof Comment>;

export const UpdateAnnotationInput = z
  .object({
    status: AnnotationStatus.optional(),
    resolvedSummary: z.string().min(1).optional(),
    resolvedBy: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Informe ao menos um campo para atualizar");
export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationInput>;

export const WebhookEventType = z.enum([
  "annotation.created",
  "annotation.status_changed",
  "comment.created",
]);
export type WebhookEventType = z.infer<typeof WebhookEventType>;
