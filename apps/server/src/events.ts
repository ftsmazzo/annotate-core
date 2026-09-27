import { db } from "./db/client.js";
import { events } from "./db/schema.js";
import { enqueueWebhookDeliveries } from "./webhooks/dispatcher.js";

/** Grava no outbox (events) e dispara o enqueue de webhook — usado por rotas REST e tools MCP. */
export async function recordEvent(params: {
  projectId: string;
  annotationId?: string;
  type: "annotation.created" | "annotation.status_changed" | "comment.created";
  payload: unknown;
}) {
  await db.insert(events).values({
    projectId: params.projectId,
    annotationId: params.annotationId,
    type: params.type,
    payload: params.payload as object,
  });

  await enqueueWebhookDeliveries({
    projectId: params.projectId,
    eventType: params.type,
    payload: params.payload,
  });
}
